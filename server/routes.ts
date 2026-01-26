
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { getMarketData, getCurrentPrice, initBrowser } from "./pocket-option-scraper";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Try to initialize browser in background
initBrowser().catch(console.error);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Pairs ---
  app.get(api.pairs.list.path, async (req, res) => {
    const pairs = await storage.getAllPairs();
    res.json(pairs);
  });

  app.patch(api.pairs.update.path, async (req, res) => {
    try {
      const input = api.pairs.update.input.parse(req.body);
      const pair = await storage.updatePair(Number(req.params.id), input);
      res.json(pair);
    } catch (error) {
       res.status(404).json({ message: "Pair not found" });
    }
  });

  // --- Signals ---
  app.get(api.signals.list.path, async (req, res) => {
    const status = req.query.status as string;
    let result;
    if (status === 'active') {
      result = await storage.getActiveSignals();
    } else {
      result = await storage.getSignalHistory(Number(req.query.limit) || 50);
    }

    // Enrich with pair data manually for now since we didn't do a join in storage
    // In a real app with Drizzle, we'd use `with: { pair: true }`
    const allPairs = await storage.getAllPairs();
    const pairsMap = new Map(allPairs.map(p => [p.id, p]));

    const enriched = result.map(s => ({
      ...s,
      pair: pairsMap.get(s.pairId)
    }));

    res.json(enriched);
  });

  app.get(api.signals.stats.path, async (req, res) => {
    const stats = await storage.getSignalStats();
    
    // Map pair IDs to symbols for the frontend
    const allPairs = await storage.getAllPairs();
    const pairsMap = new Map(allPairs.map(p => [String(p.id), p.symbol]));
    
    const byPairWithSymbols: Record<string, { total: number; winRate: number }> = {};
    for (const [pairId, data] of Object.entries(stats.byPair)) {
        const symbol = pairsMap.get(pairId) || `Pair #${pairId}`;
        byPairWithSymbols[symbol] = {
            total: data.total,
            winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0
        };
    }

    res.json({
        totalSignals: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        byPair: byPairWithSymbols
    });
  });

  app.post(api.signals.create.path, async (req, res) => {
    try {
      const input = api.signals.create.input.parse(req.body);
      const signal = await storage.createSignal(input);
      res.status(201).json(signal);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // AI Signal Generation
  app.post("/api/signals/generate", async (req, res) => {
    try {
      const { pairId, timeframe } = req.body;
      
      const pair = await storage.getPair(pairId);
      if (!pair) {
        return res.status(404).json({ message: "Pair not found" });
      }

      // Get real market data from Pocket Option via DOM scraping
      const marketData = await getMarketData(pair.symbol);
      const { currentPrice, priceHistory, rsi, ema50, ema200 } = marketData;

      // AI Analysis
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Ти професійний трейдер бінарних опціонів. Аналізуй технічні індикатори та давай чіткі сигнали.
            
Відповідай ТІЛЬКИ у форматі JSON:
{
  "direction": "UP" або "DOWN",
  "confidence": число від 60 до 95,
  "analysis": "Коротке пояснення українською чому ти обрав цей напрямок (2-3 речення про RSI, EMA, тренд)"
}`
          },
          {
            role: "user",
            content: `Проаналізуй ${pair.symbol} для ${timeframe}-хвилинної експірації:
- Поточна ціна: ${currentPrice.toFixed(5)}
- RSI(14): ${rsi.toFixed(1)}
- EMA50: ${ema50.toFixed(5)}
- EMA200: ${ema200.toFixed(5)}
- Останні ціни: ${priceHistory.slice(-5).map(p => p.toFixed(5)).join(', ')}

Дай сигнал UP або DOWN з поясненням.`
          }
        ],
        max_completion_tokens: 300,
        response_format: { type: "json_object" }
      });

      const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      const sparkline = priceHistory.slice(-6);
      
      const signal = await storage.createSignal({
        pairId,
        direction: aiResponse.direction || "UP",
        timeframe,
        openPrice: currentPrice.toFixed(5),
        sparklineData: sparkline,
        analysis: aiResponse.analysis || "Технічний аналіз показує сприятливі умови для входу.",
        currentPrice: currentPrice.toFixed(5),
      });

      // Enrich with pair data
      const enrichedSignal = {
        ...signal,
        pair,
        confidence: aiResponse.confidence || 75,
      };

      res.status(201).json(enrichedSignal);
    } catch (err) {
      console.error("AI Signal generation error:", err);
      res.status(500).json({ message: "Failed to generate signal" });
    }
  });

  // Update signal price (for live tracking from Pocket Option)
  app.patch("/api/signals/:id/price", async (req, res) => {
    try {
      const signalId = Number(req.params.id);
      const signal = await storage.getSignal(signalId);
      
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      // Get real price from Pocket Option
      const pair = await storage.getPair(signal.pairId);
      let newPrice: number;
      
      if (pair) {
        const realPrice = await getCurrentPrice(pair.symbol);
        if (realPrice) {
          newPrice = realPrice;
        } else {
          // Fallback to simulated price if scraping fails
          const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);
          newPrice = currentPrice + (Math.random() - 0.5) * 0.0005;
        }
      } else {
        const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);
        newPrice = currentPrice + (Math.random() - 0.5) * 0.0005;
      }
      
      const updated = await storage.updateSignalPrice(signalId, newPrice.toFixed(5));
      res.json(updated);
    } catch (err) {
      console.error("Update price error:", err);
      res.status(500).json({ message: "Failed to update price" });
    }
  });

  // Close signal (check result)
  app.patch("/api/signals/:id/close", async (req, res) => {
    try {
      const signalId = Number(req.params.id);
      const signal = await storage.getSignal(signalId);
      
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      const openPrice = parseFloat(signal.openPrice);
      const closePrice = parseFloat(signal.currentPrice || signal.openPrice);
      
      let result: 'WIN' | 'LOSE' | 'DRAW';
      if (signal.direction === 'UP') {
        result = closePrice > openPrice ? 'WIN' : closePrice < openPrice ? 'LOSE' : 'DRAW';
      } else {
        result = closePrice < openPrice ? 'WIN' : closePrice > openPrice ? 'LOSE' : 'DRAW';
      }
      
      const updated = await storage.closeSignal(signalId, closePrice.toFixed(5), result);
      
      // Enrich with pair
      const pair = await storage.getPair(signal.pairId);
      res.json({ ...updated, pair });
    } catch (err) {
      console.error("Close signal error:", err);
      res.status(500).json({ message: "Failed to close signal" });
    }
  });

  // --- Admin: Users ---
  app.get(api.admin.users.list.path, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post(api.admin.users.block.path, async (req, res) => {
    const updated = await storage.updateUserBlockStatus(Number(req.params.id), req.body.isBlocked);
    res.json(updated);
  });

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingPairs = await storage.getAllPairs();
  if (existingPairs.length === 0) {
    const pairsToCreate = [
      { symbol: 'EUR/USD OTC', name: 'Euro / US Dollar OTC', payout: 92 },
      { symbol: 'GBP/USD OTC', name: 'British Pound / US Dollar OTC', payout: 90 },
      { symbol: 'USD/JPY OTC', name: 'US Dollar / Japanese Yen OTC', payout: 89 },
      { symbol: 'AUD/CAD OTC', name: 'Australian Dollar / Canadian Dollar OTC', payout: 85 },
    ];
    
    for (const p of pairsToCreate) {
      await storage.createPair(p);
    }
    
    // Create some dummy signals for history
    const allPairs = await storage.getAllPairs();
    const eurUsd = allPairs.find(p => p.symbol === 'EUR/USD OTC');
    
    if (eurUsd) {
        // Active signal
        await storage.createSignal({
            pairId: eurUsd.id,
            direction: 'UP',
            timeframe: 1,
            openPrice: "1.0520",
            status: 'active',
            sparklineData: [1.0510, 1.0512, 1.0515, 1.0511, 1.0518, 1.0520],
        });

        // Closed signals
        await storage.createSignal({
            pairId: eurUsd.id,
            direction: 'DOWN',
            timeframe: 3,
            openPrice: "1.0550",
            closePrice: "1.0540",
            result: 'WIN',
            status: 'closed',
            sparklineData: [1.0560, 1.0555, 1.0550, 1.0545, 1.0540],
        });
    }
  }
}

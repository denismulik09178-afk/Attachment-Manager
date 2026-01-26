
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { generateAccurateMarketData, getRealPrice } from "./forex-prices";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

      // Get real market data with accurate indicators
      const marketData = await generateAccurateMarketData(pair.symbol);
      const { currentPrice, priceHistory, indicators } = marketData;

      // Advanced AI Analysis with comprehensive technical data
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Ти експертний трейдер з 15+ роками досвіду в бінарних опціонах та Forex. Ти аналізуєш ринок з ХІРУРГІЧНОЮ ТОЧНІСТЮ.

ПРАВИЛА АНАЛІЗУ:
1. RSI < 30 = СИЛЬНИЙ сигнал UP (перепроданість)
2. RSI > 70 = СИЛЬНИЙ сигнал DOWN (перекупленість)
3. RSI 30-70 = аналізуй EMA та тренд
4. EMA9 > EMA21 = короткостроковий БИЧИЙ тренд
5. EMA9 < EMA21 = короткостроковий ВЕДМЕЖИЙ тренд
6. Ціна біля нижньої Боллінджер = можливий відскок UP
7. Ціна біля верхньої Боллінджер = можливий відскок DOWN
8. MACD > Signal = БИЧИЙ імпульс
9. MACD < Signal = ВЕДМЕЖИЙ імпульс
10. Stochastic < 20 = перепроданість = UP
11. Stochastic > 80 = перекупленість = DOWN

ДЛЯ 1-ХВИЛИННОЇ ЕКСПІРАЦІЇ:
- Шукай миттєві розвороти (RSI екстремуми, Боллінджер відскоки)
- Пріоритет: RSI + Stochastic сигнали

ДЛЯ 3-5 ХВИЛИННОЇ ЕКСПІРАЦІЇ:  
- Слідуй за трендом (EMA кросовери)
- Пріоритет: EMA + MACD сигнали

Відповідай ТІЛЬКИ у форматі JSON:
{
  "direction": "UP" або "DOWN",
  "confidence": число від 65 до 92,
  "analysis": "Детальне пояснення українською: які індикатори підтверджують сигнал, чому саме цей напрямок (3-4 речення)"
}`
          },
          {
            role: "user",
            content: `АНАЛІЗ ${pair.symbol} для ${timeframe}-хвилинної експірації:

📊 ПОТОЧНА ЦІНА: ${currentPrice.toFixed(5)}

📈 ІНДИКАТОРИ:
- RSI(14): ${indicators.rsi.toFixed(1)} ${indicators.rsi < 30 ? '⚠️ ПЕРЕПРОДАНІСТЬ' : indicators.rsi > 70 ? '⚠️ ПЕРЕКУПЛЕНІСТЬ' : ''}
- Stochastic K: ${indicators.stochK.toFixed(1)} ${indicators.stochK < 20 ? '⚠️ ПЕРЕПРОДАНІСТЬ' : indicators.stochK > 80 ? '⚠️ ПЕРЕКУПЛЕНІСТЬ' : ''}

📉 КОВЗАЮЧІ СЕРЕДНІ:
- EMA9: ${indicators.ema9.toFixed(5)}
- EMA21: ${indicators.ema21.toFixed(5)}
- EMA50: ${indicators.ema50.toFixed(5)}
- Тренд: ${indicators.trend}

📊 БОЛЛІНДЖЕР:
- Верхня: ${indicators.bollingerUpper.toFixed(5)}
- Середня: ${indicators.sma20.toFixed(5)}
- Нижня: ${indicators.bollingerLower.toFixed(5)}
- Позиція ціни: ${currentPrice > indicators.bollingerUpper ? 'ВИЩЕ верхньої' : currentPrice < indicators.bollingerLower ? 'НИЖЧЕ нижньої' : 'В КАНАЛІ'}

📈 MACD:
- MACD: ${indicators.macd.toFixed(6)}
- Signal: ${indicators.macdSignal.toFixed(6)}
- Імпульс: ${indicators.macd > indicators.macdSignal ? 'БИЧИЙ' : 'ВЕДМЕЖИЙ'}

🕯️ ОСТАННІ ЦІНИ: ${priceHistory.slice(-5).map(p => p.toFixed(5)).join(' → ')}

Дай ТОЧНИЙ сигнал на основі комплексного аналізу!`
          }
        ],
        max_completion_tokens: 400,
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

  // Update signal price (for live tracking with real prices)
  app.patch("/api/signals/:id/price", async (req, res) => {
    try {
      const signalId = Number(req.params.id);
      const signal = await storage.getSignal(signalId);
      
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      const pair = await storage.getPair(signal.pairId);
      let newPrice: number;

      if (pair) {
        const realPrice = await getRealPrice(pair.symbol);
        if (realPrice) {
          newPrice = realPrice;
        } else {
          const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);
          const volatility = pair.symbol.includes('JPY') ? 0.01 : 0.0001;
          newPrice = currentPrice + (Math.random() - 0.5) * volatility;
        }
      } else {
        const currentPrice = parseFloat(signal.currentPrice || signal.openPrice);
        newPrice = currentPrice + (Math.random() - 0.5) * 0.0001;
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
      { symbol: 'EUR/USD', name: 'Euro / US Dollar', payout: 85 },
      { symbol: 'GBP/USD', name: 'British Pound / US Dollar', payout: 85 },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', payout: 85 },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', payout: 85 },
      { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', payout: 85 },
      { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', payout: 85 },
      { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', payout: 85 },
      { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', payout: 85 },
      { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', payout: 85 },
      { symbol: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc', payout: 85 },
      { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', payout: 85 },
      { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', payout: 85 },
      { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', payout: 85 },
      { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', payout: 85 },
      { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', payout: 85 },
      { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', payout: 85 },
      { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', payout: 85 },
      { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', payout: 85 },
      { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', payout: 85 },
    ];
    
    for (const p of pairsToCreate) {
      await storage.createPair(p);
    }
  }
}

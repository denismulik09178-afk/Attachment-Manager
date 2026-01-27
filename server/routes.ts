
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
// Ціни тепер тільки від TradingView - forex-prices.ts більше не використовується
import { getTradingViewAnalysis } from "./tradingview-analysis";

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
    
    // Get session ID from header for browser-based isolation (NO Replit Auth dependency)
    const sessionId = req.headers['x-session-id'] as string;
    
    let result;
    if (status === 'active') {
      result = await storage.getActiveSignals(sessionId);
    } else {
      result = await storage.getSignalHistory(sessionId, Number(req.query.limit) || 50);
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

  // AI Signal Generation - PROFESSIONAL TRADER AI ANALYSIS
  app.post("/api/signals/generate", async (req, res) => {
    try {
      const { pairId, timeframe: timeframeStr } = req.body;
      
      // Convert timeframe to minutes - supports: number (1), string ("5m", "1h", "30")
      const parseTimeframe = (tf: any): number => {
        if (typeof tf === 'number' && tf > 0) return tf;
        if (typeof tf === 'string') {
          const match = tf.match(/^(\d+)(m|h)?$/i);
          if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2]?.toLowerCase() || 'm';
            return unit === 'h' ? value * 60 : value;
          }
        }
        return 5;
      };
      const timeframe = parseTimeframe(timeframeStr);
      
      const ownerId = req.headers['x-session-id'] as string;
      
      const pair = await storage.getPair(pairId);
      if (!pair) {
        return res.status(404).json({ message: "Pair not found" });
      }

      // Get TradingView real analysis - ЄДИНЕ ДЖЕРЕЛО ПРАВДИ
      const tvAnalysis = await getTradingViewAnalysis(pair.symbol, timeframe);
      
      // ВСІ дані тільки від TradingView - ціни та індикатори 1 в 1
      const tvClose = tvAnalysis.indicators.close;
      const realRsi = tvAnalysis.indicators.rsi;
      const realAdx = tvAnalysis.indicators.adx;
      const realMacd = tvAnalysis.indicators.macd;
      const realMacdSignal = tvAnalysis.indicators.macdSignal;
      const recommendAll = tvAnalysis.indicators.recommendAll ?? 0;
      const recommendMA = tvAnalysis.indicators.recommendMA ?? 0;
      const recommendOsc = tvAnalysis.indicators.recommendOsc ?? 0;
      
      // Ціна ТІЛЬКИ від TradingView (та сама що й для RSI/ADX/MACD)
      // Без округлення - точна ціна як є
      const currentPrice = tvClose ?? 0;
      
      // Логування для перевірки точності
      console.log(`[PRICE] ${pair.symbol}: TV close=${tvClose}, RSI=${realRsi?.toFixed(1)}, ADX=${realAdx?.toFixed(1)}`);
      
      // Перевірка що TradingView повернув дані
      if (!currentPrice || !realRsi || !realAdx) {
        return res.status(200).json({
          noEntry: true,
          analysis: `TradingView недоступний - спробуйте пізніше`,
          pair,
        });
      }
      
      // Генеруємо sparkline навколо реальної ціни TV
      const isJpy = pair.symbol.includes('JPY');
      const pipValue = isJpy ? 0.01 : 0.0001;
      const priceHistory = [];
      for (let i = 0; i < 6; i++) {
        const pips = (Math.random() - 0.5) * 10; // ±5 pips
        priceHistory.push(currentPrice + pips * pipValue);
      }
      priceHistory.push(currentPrice); // Остання = поточна TV ціна
      
      // ========== STRICT QUALITY FILTERS ==========
      const tvDirection = tvAnalysis.recommendation;
      const signalStrength = Math.abs(recommendAll);
      const macdBullish = (realMacd ?? 0) > (realMacdSignal ?? 0);
      
      // Filter 1: Clear direction required
      if (tvDirection !== 'UP' && tvDirection !== 'DOWN') {
        return res.status(200).json({
          noEntry: true,
          analysis: `Немає напрямку | TV: ${recommendAll.toFixed(2)} | RSI: ${realRsi.toFixed(0)} | ADX: ${realAdx.toFixed(0)}`,
          pair,
        });
      }
      
      // Filter 2: Signal strength >= 0.30
      if (signalStrength < 0.30) {
        return res.status(200).json({
          noEntry: true,
          analysis: `Слабкий сигнал | TV: ${recommendAll.toFixed(2)} (треба 0.30+) | RSI: ${realRsi.toFixed(0)}`,
          pair,
        });
      }
      
      // Filter 3: ADX >= 20 (trend present)
      if (realAdx < 20) {
        return res.status(200).json({
          noEntry: true,
          analysis: `Немає тренду | ADX: ${realAdx.toFixed(0)} (треба 20+) | TV: ${recommendAll.toFixed(2)}`,
          pair,
        });
      }
      
      // ========== AI TRADER DECISION ==========
      const macdUkr = macdBullish ? 'бичачий' : 'ведмежий';
      const rsiZone = realRsi < 30 ? 'перепроданість' : realRsi > 70 ? 'перекупленість' : realRsi < 45 ? 'слабкий' : realRsi > 55 ? 'сильний' : 'нейтральний';
      const adxTrend = realAdx > 30 ? 'потужний' : realAdx > 25 ? 'стабільний' : 'формується';
      
      const aiTraderPrompt = `${pair.symbol} ${timeframe}хв | TV: ${tvDirection} ${(signalStrength*100).toFixed(0)}% | RSI: ${realRsi.toFixed(0)} (${rsiZone}) | ADX: ${realAdx.toFixed(0)} (${adxTrend}) | MACD: ${macdUkr}

Сигнал ${tvDirection === 'UP' ? 'КУПІВЛЯ' : 'ПРОДАЖ'}. Підтверди або відхили як трейдер.
JSON: {"trade":true/false,"pct":85-99,"ua":"1 речення чому"}`;

      let aiDecision;
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: aiTraderPrompt }],
          max_tokens: 150,
          temperature: 0.1,
        });
        
        const content = aiResponse.choices[0]?.message?.content || "";
        // Parse JSON from AI response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiDecision = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("AI Trader analysis error:", e);
      }
      
      // Validate and normalize AI response
      const isValidAI = aiDecision && 
        typeof aiDecision.trade === 'boolean' && 
        typeof aiDecision.ua === 'string' &&
        aiDecision.ua.length > 10;
      
      // Enforce length limit (max 150 chars) for compact output
      if (isValidAI && aiDecision.ua.length > 150) {
        aiDecision.ua = aiDecision.ua.substring(0, 147) + '...';
      }
      
      // If AI response invalid - require confirmation, don't auto-approve
      if (!isValidAI) {
        // Only approve if very strong signal (>= 0.50) with strong trend (ADX >= 25)
        const veryStrong = signalStrength >= 0.50 && realAdx >= 25;
        if (!veryStrong) {
          return res.status(200).json({
            noEntry: true,
            analysis: `Очікуємо підтвердження | TV: ${recommendAll.toFixed(2)} | RSI: ${realRsi.toFixed(0)} | ADX: ${realAdx.toFixed(0)}`,
            pair,
          });
        }
        aiDecision = {
          trade: true,
          pct: Math.min(92, 85 + Math.round(signalStrength * 15)),
          ua: `Сильний сигнал TV ${tvDirection} (${(signalStrength*100).toFixed(0)}%). ADX ${realAdx.toFixed(0)} підтверджує тренд.`
        };
      }
      
      // AI rejected
      if (!aiDecision.trade) {
        return res.status(200).json({
          noEntry: true,
          analysis: aiDecision.ua || `Чекаємо | RSI: ${realRsi.toFixed(0)} | ADX: ${realAdx.toFixed(0)}`,
          pair,
        });
      }
      
      // AI CONFIRMED - CREATE SIGNAL
      const sparkline = priceHistory.slice(-6);
      const confidence = Math.max(85, Math.min(99, aiDecision.pct || 90));
      const direction = tvDirection;
      const macdUa = macdBullish ? 'бичачий' : 'ведмежий';
      
      const analysisDetails = `${confidence}% | ${tvDirection === 'UP' ? 'КУПІВЛЯ' : 'ПРОДАЖ'} | RSI:${realRsi.toFixed(0)} ADX:${realAdx.toFixed(0)} MACD:${macdUa}\n${aiDecision.ua}`;
      
      const signal = await storage.createSignal({
        pairId,
        ownerId,
        direction,
        timeframe,
        openPrice: currentPrice.toFixed(5),
        sparklineData: sparkline,
        analysis: analysisDetails,
        currentPrice: currentPrice.toFixed(5),
      });

      const enrichedSignal = {
        ...signal,
        pair,
        confidence,
      };

      return res.status(201).json(enrichedSignal);

    } catch (err) {
      console.error("AI Signal generation error:", err);
      res.status(500).json({ message: "Failed to generate signal" });
    }
  });

  // Update signal price (for live tracking with TradingView prices)
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
        // Отримуємо ціну ТІЛЬКИ від TradingView (1 в 1 з індикаторами)
        const tvAnalysis = await getTradingViewAnalysis(pair.symbol, 5);
        const tvClose = tvAnalysis.indicators.close;
        
        if (tvClose) {
          newPrice = tvClose;
          // Логування для перевірки - ціна точно з TV
          console.log(`[PRICE UPDATE] ${pair.symbol}: TV close=${tvClose.toFixed(5)}`);
        } else {
          // Fallback: залишаємо поточну ціну без змін
          newPrice = parseFloat(signal.currentPrice || signal.openPrice);
          console.log(`[PRICE UPDATE] ${pair.symbol}: TV unavailable, keeping ${newPrice}`);
        }
      } else {
        newPrice = parseFloat(signal.currentPrice || signal.openPrice);
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

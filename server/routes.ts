
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
            content: `Ти ЛЕГЕНДАРНИЙ трейдер з 20+ роками досвіду на Forex та бінарних опціонах. Твоя точність сигналів - 85%+. Ти НІКОЛИ не даєш слабкі сигнали.

🎯 ЗОЛОТІ ПРАВИЛА ВИСОКОЇ ТОЧНОСТІ:

📊 RSI (Відносна Сила):
- RSI < 25 = ЕКСТРЕМАЛЬНА перепроданість = СИЛЬНИЙ UP (85%+ ймовірність)
- RSI < 30 = Перепроданість = UP (75%+ ймовірність)
- RSI > 75 = ЕКСТРЕМАЛЬНА перекупленість = СИЛЬНИЙ DOWN (85%+ ймовірність)
- RSI > 70 = Перекупленість = DOWN (75%+ ймовірність)
- RSI 40-60 = НЕЙТРАЛЬНА ЗОНА - дивись на інші індикатори!

📈 STOCHASTIC ОСЦИЛЯТОР:
- Stoch < 15 = ЕКСТРЕМАЛЬНА перепроданість = UP
- Stoch > 85 = ЕКСТРЕМАЛЬНА перекупленість = DOWN
- Якщо RSI та Stochastic ОБИДВА в екстремумах = НАЙСИЛЬНІШИЙ сигнал!

📉 КОВЗАЮЧІ СЕРЕДНІ (EMA):
- EMA9 > EMA21 > EMA50 = СИЛЬНИЙ висхідний тренд = UP
- EMA9 < EMA21 < EMA50 = СИЛЬНИЙ низхідний тренд = DOWN
- EMA9 перетинає EMA21 знизу вгору = Бичий кросовер = UP
- EMA9 перетинає EMA21 зверху вниз = Ведмежий кросовер = DOWN

📊 БОЛЛІНДЖЕР:
- Ціна НИЖЧЕ нижньої смуги = Сильний сигнал UP (відскок)
- Ціна ВИЩЕ верхньої смуги = Сильний сигнал DOWN (відскок)
- Ціна в середині каналу = слабкий сигнал

📈 MACD:
- MACD > Signal ТА обидва > 0 = Сильний бичий імпульс = UP
- MACD < Signal ТА обидва < 0 = Сильний ведмежий імпульс = DOWN

⏱️ СТРАТЕГІЇ ПО ТАЙМФРЕЙМАХ:

🔥 1 ХВИЛИНА (Ультра-скальпінг):
- КРИТИЧНО: Потрібен ПОДВІЙНИЙ сигнал! RSI екстремум (<25 або >75) + Stochastic екстремум (<15 або >85)
- АБО: Ціна ВИЙШЛА за Боллінджер + RSI підтверджує
- Шукай МИТТЄВИЙ розворот у наступні 30-60 секунд
- Ігноруй EMA та MACD - занадто повільні для 1хв

⚡ 2 ХВИЛИНИ (Швидкий скальпінг):
- RSI екстремум (<28 або >72) ОБОВ'ЯЗКОВИЙ
- Stochastic підтвердження бажане
- Боллінджер відскок = сильний сигнал
- EMA9 напрямок як додатковий фільтр

🎯 3 ХВИЛИНИ (Оптимальний скальпінг):
- RSI зона: <32 = UP, >68 = DOWN
- EMA9 > EMA21 = підтверджує UP, EMA9 < EMA21 = підтверджує DOWN
- Stochastic як фінальний фільтр
- Боллінджер позиція важлива

💎 4 ХВИЛИНИ (Точний скальпінг):
- RSI зона: <35 = UP, >65 = DOWN з EMA підтвердженням
- EMA9 vs EMA21 кросовер = сильний сигнал
- MACD починає мати значення
- Мінімум 2 індикатори мають підтверджувати напрямок

⚡ 5 ХВИЛИН (Короткострок):
- EMA кросовери + MACD підтвердження
- RSI в зонах 30-40 (UP) або 60-70 (DOWN)
- Слідуй за мікро-трендом

📈 10-30 ХВИЛИН (Середньострок):
- Основний тренд EMA50
- MACD дивергенції
- Боллінджер + тренд

🕐 1-4 ГОДИНИ (Довгострок):
- EMA200 як основний тренд
- Великі таймфрейми = слідуй за ГОЛОВНИМ трендом
- Ігноруй шум, дивись на загальну картину

❌ НЕ ДАВАЙ СИГНАЛ ЯКЩО:
- RSI в нейтральній зоні (40-60) БЕЗ інших підтверджень
- Індикатори суперечать один одному
- Ринок флетовий (боковий рух)

Відповідай ТІЛЬКИ у форматі JSON:
{
  "direction": "UP" або "DOWN",
  "confidence": число від 70 до 95,
  "analysis": "Детальне пояснення українською: які КОНКРЕТНІ індикатори підтверджують сигнал, чому саме цей напрямок, яка ймовірність успіху (4-5 речень)"
}`
          },
          {
            role: "user",
            content: `🎯 АНАЛІЗ ${pair.symbol} | ЕКСПІРАЦІЯ: ${timeframe >= 60 ? `${timeframe / 60} ${timeframe >= 120 ? 'години' : 'година'}` : `${timeframe} хв`}

📊 ПОТОЧНА ЦІНА: ${currentPrice.toFixed(5)}

🔴 ОСЦИЛЯТОРИ:
- RSI(14): ${indicators.rsi.toFixed(1)} ${indicators.rsi < 25 ? '🔥 ЕКСТРЕМАЛЬНА ПЕРЕПРОДАНІСТЬ!' : indicators.rsi < 30 ? '⚠️ Перепроданість' : indicators.rsi > 75 ? '🔥 ЕКСТРЕМАЛЬНА ПЕРЕКУПЛЕНІСТЬ!' : indicators.rsi > 70 ? '⚠️ Перекупленість' : '⚪ Нейтрально'}
- Stochastic K: ${indicators.stochK.toFixed(1)} ${indicators.stochK < 15 ? '🔥 ЕКСТРЕМУМ!' : indicators.stochK < 20 ? '⚠️ Перепроданість' : indicators.stochK > 85 ? '🔥 ЕКСТРЕМУМ!' : indicators.stochK > 80 ? '⚠️ Перекупленість' : '⚪ Нейтрально'}

📈 КОВЗАЮЧІ СЕРЕДНІ:
- EMA9: ${indicators.ema9.toFixed(5)}
- EMA21: ${indicators.ema21.toFixed(5)}
- EMA50: ${indicators.ema50.toFixed(5)}
- EMA200: ${indicators.ema200.toFixed(5)}
- ВИРІВНЮВАННЯ: ${indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50 ? '📈 БИЧИЙ ТРЕНД (EMA9>21>50)' : indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50 ? '📉 ВЕДМЕЖИЙ ТРЕНД (EMA9<21<50)' : '↔️ Змішаний'}

📊 БОЛЛІНДЖЕР БЕНДИ:
- Верхня: ${indicators.bollingerUpper.toFixed(5)}
- Середня (SMA20): ${indicators.sma20.toFixed(5)}
- Нижня: ${indicators.bollingerLower.toFixed(5)}
- ПОЗИЦІЯ: ${currentPrice > indicators.bollingerUpper ? '🔴 ВИЩЕ ВЕРХНЬОЇ - можливий відскок DOWN' : currentPrice < indicators.bollingerLower ? '🟢 НИЖЧЕ НИЖНЬОЇ - можливий відскок UP' : '⚪ В каналі'}

📉 MACD:
- MACD: ${indicators.macd.toFixed(6)}
- Signal: ${indicators.macdSignal.toFixed(6)}
- Статус: ${indicators.macd > indicators.macdSignal ? '📈 БИЧИЙ імпульс' : '📉 ВЕДМЕЖИЙ імпульс'}

🕯️ РУХ ЦІНИ: ${priceHistory.slice(-5).map(p => p.toFixed(5)).join(' → ')}

⏱️ ТИП АНАЛІЗУ: ${timeframe <= 2 ? 'СКАЛЬПІНГ - шукай екстремуми та відскоки!' : timeframe <= 5 ? 'КОРОТКОСТРОК - EMA кросовери + MACD' : timeframe <= 30 ? 'СЕРЕДНЬОСТРОК - тренд EMA50 + Боллінджер' : 'ДОВГОСТРОК - головний тренд EMA200'}

🎯 ДАЙ ТОЧНИЙ СИГНАЛ З ВИСОКОЮ ЙМОВІРНІСТЮ!`
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


import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import bcrypt from "bcrypt";
// Ціни тепер тільки від TradingView - forex-prices.ts більше не використовується
import { getTradingViewAnalysis } from "./tradingview-analysis";
import { getSMCAnalysis } from "./smc-analysis";

// Admin session storage (in-memory for simplicity)
const adminSessions = new Map<string, { adminId: number; username: string; expiresAt: Date }>();

// Default admin credentials (created on first run)
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "deni2024";

// Helper to generate session token
function generateSessionToken(): string {
  return `admin_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Middleware to check admin authentication
function requireAdmin(req: Request, res: Response, next: () => void) {
  const token = req.headers['x-admin-token'] as string;
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const session = adminSessions.get(token)!;
  if (session.expiresAt < new Date()) {
    adminSessions.delete(token);
    return res.status(401).json({ message: "Session expired" });
  }
  (req as any).admin = session;
  next();
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========== ADMIN AUTHENTICATION ==========
  
  // Initialize default admin on startup
  (async () => {
    try {
      const existingAdmin = await storage.getAdminByUsername(DEFAULT_ADMIN_USERNAME);
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
        await storage.createAdmin({ username: DEFAULT_ADMIN_USERNAME, passwordHash: hashedPassword });
        console.log(`[ADMIN] Default admin created: ${DEFAULT_ADMIN_USERNAME}`);
      }
    } catch (e) {
      console.error("[ADMIN] Failed to initialize default admin:", e);
    }
  })();

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      const admin = await storage.getAdminByUsername(username);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const validPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Create session (valid for 24 hours)
      const token = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      adminSessions.set(token, { adminId: admin.id, username: admin.username, expiresAt });
      
      await storage.updateAdminLastLogin(admin.id);
      
      res.json({ token, username: admin.username, expiresAt });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", (req, res) => {
    const token = req.headers['x-admin-token'] as string;
    if (token) {
      adminSessions.delete(token);
    }
    res.json({ message: "Logged out" });
  });

  // Check admin session
  app.get("/api/admin/session", (req, res) => {
    const token = req.headers['x-admin-token'] as string;
    if (!token || !adminSessions.has(token)) {
      return res.status(401).json({ authenticated: false });
    }
    const session = adminSessions.get(token)!;
    if (session.expiresAt < new Date()) {
      adminSessions.delete(token);
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, username: session.username });
  });

  // Admin statistics endpoint
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const todayStats = await storage.getDailySignalStats(new Date());
      const totalSignals = await storage.getAllSignalsCount();
      const uniqueUsers = await storage.getUniqueUsersCount();
      const todaySignals = await storage.getTodaySignalsCount();
      const allStats = await storage.getSignalStats();
      
      res.json({
        today: todayStats,
        overall: {
          totalSignals,
          wins: allStats.wins,
          losses: allStats.losses,
          winRate: allStats.total > 0 ? ((allStats.wins / allStats.total) * 100).toFixed(1) : 0,
        },
        users: {
          unique: uniqueUsers,
        },
        todaySignalsCount: todaySignals,
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Admin - get all signals (for management)
  app.get("/api/admin/signals", requireAdmin, async (req, res) => {
    try {
      const active = await storage.getActiveSignals();
      const history = await storage.getSignalHistory(undefined, 100);
      const pairs = await storage.getAllPairs();
      
      // Enrich signals with pair info
      const pairMap = new Map(pairs.map(p => [p.id, p]));
      const enrichSignal = (s: any) => ({ ...s, pair: pairMap.get(s.pairId) });
      
      res.json({
        active: active.map(enrichSignal),
        history: history.map(enrichSignal),
      });
    } catch (error) {
      console.error("Admin signals error:", error);
      res.status(500).json({ message: "Failed to get signals" });
    }
  });

  // Admin - get all pairs (for management)
  app.get("/api/admin/pairs", requireAdmin, async (req, res) => {
    try {
      const pairs = await storage.getAllPairs();
      res.json(pairs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pairs" });
    }
  });

  // Admin - toggle pair enabled status
  app.patch("/api/admin/pairs/:id/toggle", requireAdmin, async (req, res) => {
    try {
      const pairId = Number(req.params.id);
      const pair = await storage.getPair(pairId);
      if (!pair) {
        return res.status(404).json({ message: "Pair not found" });
      }
      const updated = await storage.updatePair(pairId, { isEnabled: !pair.isEnabled });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to toggle pair" });
    }
  });

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

  // AI Signal Generation - SMC (Smart Money Concepts) PROFESSIONAL ANALYSIS
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

      // ========== SMC ANALYSIS - Full Smart Money Concepts ==========
      const smc = await getSMCAnalysis(pair.symbol, timeframe);
      
      const ind = smc.indicators;
      const currentPrice = ind.close ?? 0;
      
      // Перевірка що TradingView повернув дані
      if (!currentPrice || !ind.rsi || !ind.adx) {
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
        const pips = (Math.random() - 0.5) * 10;
        priceHistory.push(currentPrice + pips * pipValue);
      }
      priceHistory.push(currentPrice);
      
      // ========== STRICT FILTERS - ONLY CONFIDENT SIGNALS ==========
      
      // SMC module already checked: direction, confluence, session, ADX
      if (!smc.shouldTrade || !smc.finalDirection) {
        return res.status(200).json({
          noEntry: true,
          analysis: smc.skipReason || `Немає впевненого сигналу`,
          pair,
        });
      }
      
      // ========== AI PROFESSIONAL SMC ANALYSIS ==========
      const direction = smc.finalDirection;
      const dirText = direction === 'UP' ? 'LONG' : 'SHORT';
      
      // Build comprehensive SMC prompt for AI
      const systemPrompt = `Ти — професійний SMC (Smart Money Concepts) трейдер з 15+ роками досвіду. Аналізуєш комплексний сигнал.

ТВІЙ СТИЛЬ:
- Аналізуєш структуру ринку, ліквідність, confluence
- Використовуєш терміни: BOS, CHOCH, FVG, Premium/Discount
- Фокус на підтвердженні від Smart Money
- Пишеш ТІЛЬКИ українською, коротко

КРИТЕРІЇ ВХОДУ (80-85% точність):
- Confluence >= 55%
- Структура підтверджує напрям
- Ліквідність зібрана
- Сесія активна (London/NY)`;

      const userPrompt = `SMC АНАЛІЗ: ${pair.symbol} | ${timeframe}m

CONFLUENCE: ${smc.confluence.total}%
- Індикатори: ${smc.confluence.indicatorScore}/30
- Структура: ${smc.confluence.structureScore}/25
- Ліквідність: ${smc.confluence.liquidityScore}/20
- Таймінг: ${smc.confluence.timingScore}/15
- Сесія: ${smc.confluence.sessionScore}/10

СТРУКТУРА: ${smc.marketStructure.structureDescription}
ЛІКВІДНІСТЬ: ${smc.liquidity.liquidityDescription}
СЕСІЯ: ${smc.session.current} - ${smc.session.description}
ВХІД: ${smc.entryTiming.entryDescription}

ІНДИКАТОРИ:
• RSI: ${ind.rsi.toFixed(1)} | ADX: ${ind.adx.toFixed(1)}
• Stoch: K=${ind.stochK.toFixed(0)} D=${ind.stochD.toFixed(0)}
• CCI: ${ind.cci.toFixed(0)} | MACD: ${ind.macd > ind.macdSignal ? 'бичачий' : 'ведмежий'}
• BB Position: ${(ind.bbPosition * 100).toFixed(0)}%
• TV: ${(ind.recommendAll * 100).toFixed(0)}%

TOP: ${smc.confluence.breakdown.slice(0, 5).join(', ')}

Підтверди ${dirText} з confluence ${smc.confluence.total}%.

JSON: {"trade": true/false, "pct": 75-95, "ua": "SMC аналіз 1-2 речення"}`;

      // AI generates explanation (auto-confirms since SMC already validated)
      let aiAnalysis = '';
      try {
        const aiPrompt = `${pair.symbol} ${dirText} ${timeframe}m. RSI=${ind.rsi.toFixed(0)}, TV=${(ind.recommendAll * 100).toFixed(0)}%, ADX=${ind.adx.toFixed(0)}. Напиши 1-2 речення чому це хороший вхід. Українською.`;
        
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Ти трейдер. Коротко пояснюй сигнали українською. Позитивно." },
            { role: "user", content: aiPrompt }
          ],
          max_tokens: 80,
          temperature: 0.3,
        });
        
        aiAnalysis = aiResponse.choices[0]?.message?.content || '';
        if (aiAnalysis.length > 120) aiAnalysis = aiAnalysis.substring(0, 117) + '...';
      } catch (e) {
        console.error("AI analysis error:", e);
        aiAnalysis = `${dirText}: ${smc.confluence.breakdown.slice(0, 2).join(', ')}`;
      }
      
      // Auto-confirm - SMC already validated the signal
      const aiDecision = {
        trade: true,
        pct: Math.min(92, Math.max(80, smc.confluence.total + 30)),
        ua: aiAnalysis || `${dirText}: ${smc.confluence.breakdown.slice(0, 2).join(', ')}`
      };
      
      // ========== CREATE SIGNAL ==========
      const sparkline = priceHistory.slice(-6);
      const confidence = Math.max(75, Math.min(95, aiDecision.pct || smc.confluence.total));
      
      // Professional SMC analysis display
      const analysisDetails = `${confidence}% ${dirText} | Confluence: ${smc.confluence.total}% | ${smc.session.current}\n` +
        `Структура: ${smc.marketStructure.trend} | ${smc.liquidity.premiumZone ? 'PREMIUM' : 'DISCOUNT'}\n` +
        `${aiDecision.ua}`;
      
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
        smcData: {
          confluence: smc.confluence,
          structure: smc.marketStructure.trend,
          liquidity: smc.liquidity.premiumZone ? 'PREMIUM' : 'DISCOUNT',
          session: smc.session.current,
          entry: smc.entryTiming.entryType
        }
      };

      return res.status(201).json(enrichedSignal);

    } catch (err) {
      console.error("SMC Signal generation error:", err);
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
        // SIMPLE price fetch - only close price
        try {
          const pairCode = pair.symbol.replace('/', '');
          const response = await fetch('https://scanner.tradingview.com/forex/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbols: { tickers: [`FX:${pairCode}`], query: { types: [] } },
              columns: ['close']
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data?.[0]?.d?.[0]) {
              newPrice = data.data[0].d[0];
              console.log(`[PRICE] ${pair.symbol}: ${newPrice.toFixed(5)}`);
            } else {
              newPrice = parseFloat(signal.currentPrice || signal.openPrice);
            }
          } else {
            newPrice = parseFloat(signal.currentPrice || signal.openPrice);
          }
        } catch {
          newPrice = parseFloat(signal.currentPrice || signal.openPrice);
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

      // Get fresh close price from TradingView
      const signalPair = await storage.getPair(signal.pairId);
      let closePrice = parseFloat(signal.currentPrice || signal.openPrice);
      
      if (signalPair) {
        try {
          const pairCode = signalPair.symbol.replace('/', '');
          const response = await fetch('https://scanner.tradingview.com/forex/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbols: { tickers: [`FX:${pairCode}`], query: { types: [] } },
              columns: ['close']
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.data?.[0]?.d?.[0]) {
              closePrice = data.data[0].d[0];
              console.log(`[CLOSE] ${signalPair.symbol}: ${closePrice.toFixed(5)}`);
            }
          }
        } catch (e) {
          console.error('Failed to fetch close price:', e);
        }
      }

      const openPrice = parseFloat(signal.openPrice);
      
      // Calculate pip difference (JPY pairs use 0.01, others use 0.0001)
      const isJpy = signalPair?.symbol?.includes('JPY');
      const pipSize = isJpy ? 0.01 : 0.0001;
      const priceDiff = closePrice - openPrice;
      const pipDiff = priceDiff / pipSize;
      
      // WIN/LOSE based on direction, DRAW only if price exactly the same
      let result: 'WIN' | 'LOSE' | 'DRAW';
      if (signal.direction === 'UP') {
        result = pipDiff > 0.1 ? 'WIN' : pipDiff < -0.1 ? 'LOSE' : 'DRAW';
      } else {
        result = pipDiff < -0.1 ? 'WIN' : pipDiff > 0.1 ? 'LOSE' : 'DRAW';
      }
      
      console.log(`[RESULT] ${signalPair?.symbol}: Open=${openPrice.toFixed(5)} Close=${closePrice.toFixed(5)} Pips=${pipDiff.toFixed(2)} Dir=${signal.direction} => ${result}`);
      
      const updated = await storage.closeSignal(signalId, closePrice.toFixed(5), result);
      res.json({ ...updated, pair: signalPair });
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

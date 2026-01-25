
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { pairs } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // --- Pairs ---
  app.get(api.pairs.list.path, async (req, res) => {
    const pairs = await storage.getAllPairs();
    res.json(pairs);
  });

  app.patch(api.pairs.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Add admin check here if needed (e.g. check req.user.role)

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
    // Only allow manual creation for admin/testing
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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

  // --- Admin: Users ---
  app.get(api.admin.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post(api.admin.users.block.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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


import { users, pairs, signals, settings, type User, type InsertUser, type Pair, type Signal, type InsertSignal, type Setting } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBlockStatus(id: number, isBlocked: boolean): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Pairs
  getAllPairs(): Promise<Pair[]>;
  getPair(id: number): Promise<Pair | undefined>;
  updatePair(id: number, updates: Partial<Pair>): Promise<Pair>;
  createPair(pair: Partial<Pair>): Promise<Pair>; // Helper for seeding

  // Signals
  createSignal(signal: any): Promise<Signal>;
  getSignal(id: number): Promise<Signal | undefined>;
  getActiveSignals(): Promise<Signal[]>;
  getSignalHistory(limit?: number): Promise<Signal[]>;
  getSignalStats(): Promise<{
    total: number;
    wins: number;
    losses: number;
    byPair: Record<string, { total: number; wins: number }>;
  }>;
  updateSignalPrice(id: number, currentPrice: string): Promise<Signal>;
  closeSignal(id: number, closePrice: string, result: string): Promise<Signal>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserBlockStatus(id: number, isBlocked: boolean): Promise<User> {
    const [user] = await db.update(users).set({ isBlocked }).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAllPairs(): Promise<Pair[]> {
    return await db.select().from(pairs);
  }

  async getPair(id: number): Promise<Pair | undefined> {
    const [pair] = await db.select().from(pairs).where(eq(pairs.id, id));
    return pair;
  }

  async updatePair(id: number, updates: Partial<Pair>): Promise<Pair> {
    const [pair] = await db.update(pairs).set(updates).where(eq(pairs.id, id)).returning();
    return pair;
  }

  async createPair(pair: Partial<Pair>): Promise<Pair> {
     // Helper for seeding, handles optional fields better if needed
    const [newPair] = await db.insert(pairs).values(pair as any).returning();
    return newPair;
  }

  async createSignal(signal: any): Promise<Signal> {
    const [newSignal] = await db.insert(signals).values(signal).returning();
    return newSignal;
  }

  async getSignal(id: number): Promise<Signal | undefined> {
    const [signal] = await db.select().from(signals).where(eq(signals.id, id));
    return signal;
  }

  async getActiveSignals(): Promise<Signal[]> {
    return await db.select().from(signals).where(eq(signals.status, 'active')).orderBy(desc(signals.openTime));
  }

  async getSignalHistory(limit = 50): Promise<Signal[]> {
    return await db.select().from(signals)
      .where(eq(signals.status, 'closed'))
      .orderBy(desc(signals.closeTime))
      .limit(limit);
  }

  async getSignalStats() {
    const allSignals = await db.select({
      result: signals.result,
      pairId: signals.pairId,
    }).from(signals).where(eq(signals.status, 'closed'));

    const total = allSignals.length;
    const wins = allSignals.filter(s => s.result === 'WIN').length;
    const losses = allSignals.filter(s => s.result === 'LOSE').length;

    const byPair: Record<string, { total: number; wins: number }> = {};
    
    // This is a simplified stats aggregation. For large datasets, do this in SQL.
    for (const s of allSignals) {
       // We need the pair symbol, but fetching it efficiently requires a join.
       // For now, let's just count by pairId and map it later or assume frontend handles it.
       // Actually, let's just return basic stats first.
       const key = String(s.pairId);
       if (!byPair[key]) byPair[key] = { total: 0, wins: 0 };
       byPair[key].total++;
       if (s.result === 'WIN') byPair[key].wins++;
    }

    return { total, wins, losses, byPair };
  }

  async updateSignalPrice(id: number, currentPrice: string): Promise<Signal> {
    const [signal] = await db.update(signals).set({
      currentPrice,
    }).where(eq(signals.id, id)).returning();
    return signal;
  }

  async closeSignal(id: number, closePrice: string, result: string): Promise<Signal> {
    const [signal] = await db.update(signals).set({
      status: 'closed',
      result,
      closePrice,
      closeTime: new Date()
    }).where(eq(signals.id, id)).returning();
    return signal;
  }
}

export const storage = new DatabaseStorage();

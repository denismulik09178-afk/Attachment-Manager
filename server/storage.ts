
import { users, pairs, signals, settings, admins, pocketOptionUsers, type User, type InsertUser, type Pair, type Signal, type InsertSignal, type Setting, type Admin, type InsertAdmin, type PocketOptionUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";

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
  getActiveSignals(ownerId?: string): Promise<Signal[]>;
  getSignalHistory(ownerId?: string, limit?: number): Promise<Signal[]>;
  getSignalStats(): Promise<{
    total: number;
    wins: number;
    losses: number;
    byPair: Record<string, { total: number; wins: number }>;
  }>;
  updateSignalPrice(id: number, currentPrice: string): Promise<Signal>;
  closeSignal(id: number, closePrice: string, result: string): Promise<Signal>;
  
  // Admin
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdminLastLogin(id: number): Promise<Admin>;
  
  // Admin Statistics
  getDailySignalStats(date: Date): Promise<{ wins: number; losses: number; draws: number; total: number }>;
  getAllSignalsCount(): Promise<number>;
  getUniqueUsersCount(): Promise<number>;
  getTodaySignalsCount(): Promise<number>;

  // Pocket Option Users
  getPocketOptionUser(pocketId: string): Promise<PocketOptionUser | undefined>;
  createPocketOptionUser(pocketId: string): Promise<PocketOptionUser>;
  incrementSignalCount(pocketId: string): Promise<PocketOptionUser>;
  getAllPocketOptionUsers(): Promise<PocketOptionUser[]>;
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

  async getActiveSignals(ownerId?: string): Promise<Signal[]> {
    if (ownerId) {
      return await db.select().from(signals)
        .where(and(eq(signals.status, 'active'), eq(signals.ownerId, ownerId)))
        .orderBy(desc(signals.openTime));
    }
    return await db.select().from(signals).where(eq(signals.status, 'active')).orderBy(desc(signals.openTime));
  }

  async getSignalHistory(ownerId?: string, limit = 50): Promise<Signal[]> {
    if (ownerId) {
      return await db.select().from(signals)
        .where(and(eq(signals.status, 'closed'), eq(signals.ownerId, ownerId)))
        .orderBy(desc(signals.closeTime))
        .limit(limit);
    }
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
  
  // Admin methods
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }
  
  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }
  
  async updateAdminLastLogin(id: number): Promise<Admin> {
    const [admin] = await db.update(admins)
      .set({ lastLogin: new Date() })
      .where(eq(admins.id, id))
      .returning();
    return admin;
  }
  
  // Admin Statistics methods
  async getDailySignalStats(date: Date): Promise<{ wins: number; losses: number; draws: number; total: number }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const daySignals = await db.select({
      result: signals.result,
      closeTime: signals.closeTime,
    }).from(signals)
      .where(eq(signals.status, 'closed'));
    
    // Filter signals closed today (between startOfDay and endOfDay)
    const todaySignals = daySignals.filter(s => {
      if (!s.closeTime) return false;
      const closeTime = new Date(s.closeTime);
      return closeTime >= startOfDay && closeTime <= endOfDay;
    });
    
    return {
      total: todaySignals.length,
      wins: todaySignals.filter(s => s.result === 'WIN').length,
      losses: todaySignals.filter(s => s.result === 'LOSE').length,
      draws: todaySignals.filter(s => s.result === 'DRAW').length,
    };
  }
  
  async getAllSignalsCount(): Promise<number> {
    const result = await db.select({ count: count() }).from(signals);
    return result[0]?.count || 0;
  }
  
  async getUniqueUsersCount(): Promise<number> {
    const result = await db.select({ 
      count: sql<number>`count(distinct ${signals.ownerId})`
    }).from(signals);
    return Number(result[0]?.count) || 0;
  }
  
  async getTodaySignalsCount(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const result = await db.select({ count: count() })
      .from(signals)
      .where(gte(signals.openTime, startOfDay));
    return result[0]?.count || 0;
  }

  async getPocketOptionUser(pocketId: string): Promise<PocketOptionUser | undefined> {
    const [user] = await db.select().from(pocketOptionUsers).where(eq(pocketOptionUsers.pocketId, pocketId));
    return user;
  }

  async createPocketOptionUser(pocketId: string): Promise<PocketOptionUser> {
    const [user] = await db.insert(pocketOptionUsers).values({ pocketId }).returning();
    return user;
  }

  async incrementSignalCount(pocketId: string): Promise<PocketOptionUser> {
    const [user] = await db.update(pocketOptionUsers)
      .set({ 
        signalCount: sql`${pocketOptionUsers.signalCount} + 1`,
        lastActive: new Date()
      })
      .where(eq(pocketOptionUsers.pocketId, pocketId))
      .returning();
    return user;
  }

  async getAllPocketOptionUsers(): Promise<PocketOptionUser[]> {
    return await db.select().from(pocketOptionUsers).orderBy(desc(pocketOptionUsers.lastActive));
  }
}

export const storage = new DatabaseStorage();

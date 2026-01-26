
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // Will be Replit username or email
  role: text("role").default("user").notNull(), // 'admin' or 'user'
  isBlocked: boolean("is_blocked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pairs = pgTable("pairs", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(), // e.g., 'EUR/USD OTC'
  name: text("name").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  payout: integer("payout").default(92), // Payout percentage
});

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  pairId: integer("pair_id").references(() => pairs.id).notNull(),
  userId: integer("user_id").references(() => users.id), // Owner of the signal (null = legacy/shared)
  direction: text("direction").notNull(), // 'UP' or 'DOWN'
  timeframe: integer("timeframe").notNull(), // in minutes: 1, 3, 5
  openPrice: decimal("open_price").notNull(),
  closePrice: decimal("close_price"),
  currentPrice: decimal("current_price"),
  result: text("result"), // 'WIN', 'LOSE', 'DRAW'
  status: text("status").default("active").notNull(), // 'active', 'closed'
  openTime: timestamp("open_time").defaultNow().notNull(),
  closeTime: timestamp("close_time"),
  sparklineData: jsonb("sparkline_data").$type<number[]>(),
  analysis: text("analysis"), // AI explanation of why this signal was generated
});

// Settings for indicators (can be expanded)
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(), // Flexible storage for config
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPairSchema = createInsertSchema(pairs).omit({ id: true });
export const insertSignalSchema = createInsertSchema(signals).omit({ id: true, openTime: true, closeTime: true, result: true, status: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pair = typeof pairs.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Setting = typeof settings.$inferSelect;

// Enum-like constants
export const TIMEFRAMES = [1, 3, 5];
export const DIRECTIONS = { UP: 'UP', DOWN: 'DOWN' } as const;
export const RESULTS = { WIN: 'WIN', LOSE: 'LOSE', DRAW: 'DRAW' } as const;

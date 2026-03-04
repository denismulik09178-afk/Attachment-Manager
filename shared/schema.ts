
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
  ownerId: text("owner_id"), // Replit Auth user ID (string) for signal ownership
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

// Admin credentials for admin panel access
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
});

export const pocketOptionUsers = pgTable("pocket_option_users", {
  id: serial("id").primaryKey(),
  pocketId: text("pocket_id").notNull().unique(),
  signalCount: integer("signal_count").default(0).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPocketOptionUserSchema = createInsertSchema(pocketOptionUsers).omit({ id: true, createdAt: true, lastActive: true, signalCount: true });
export const insertPairSchema = createInsertSchema(pairs).omit({ id: true });
export const insertSignalSchema = createInsertSchema(signals).omit({ id: true, openTime: true, closeTime: true, result: true, status: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true, lastLogin: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Pair = typeof pairs.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Setting = typeof settings.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type PocketOptionUser = typeof pocketOptionUsers.$inferSelect;

// Enum-like constants
export const TIMEFRAMES = [1, 3, 5];
export const DIRECTIONS = { UP: 'UP', DOWN: 'DOWN' } as const;
export const RESULTS = { WIN: 'WIN', LOSE: 'LOSE', DRAW: 'DRAW' } as const;

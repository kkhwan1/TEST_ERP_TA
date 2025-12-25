import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  uuid,
  numeric,
  date,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Items
export const items = pgTable("items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  spec: text("spec"),
  unit: varchar("unit", { length: 20 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'RAW' | 'SUB' | 'PRODUCT' | 'SCRAP' | 'CONSUMABLE'
  process: varchar("process", { length: 20 }).notNull(), // 'PRESS' | 'WELD' | 'PAINT' | 'NONE'
  source: varchar("source", { length: 10 }).notNull(), // 'MAKE' | 'BUY'
  cost: numeric("cost", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

// Partners
export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'VENDOR' | 'CUSTOMER' | 'BOTH'
  registrationNumber: varchar("registration_number", { length: 50 }),
  contact: text("contact"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
});

export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

// BOM Headers
export const bomHeaders = pgTable("bom_headers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: uuid("item_id").notNull(),
  version: varchar("version", { length: 20 }).notNull(), // e.g., "2025-01"
  isFixed: boolean("is_fixed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBomHeaderSchema = createInsertSchema(bomHeaders).omit({
  id: true,
  createdAt: true,
});

export type InsertBomHeader = z.infer<typeof insertBomHeaderSchema>;
export type BomHeader = typeof bomHeaders.$inferSelect;

// BOM Lines
export const bomLines = pgTable("bom_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bomHeaderId: uuid("bom_header_id").notNull(),
  materialId: uuid("material_id").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  process: varchar("process", { length: 20 }), // 'PRESS' | 'WELD' | 'PAINT' | 'NONE'
});

export const insertBomLineSchema = createInsertSchema(bomLines).omit({
  id: true,
});

export type InsertBomLine = z.infer<typeof insertBomLineSchema>;
export type BomLine = typeof bomLines.$inferSelect;

// Transactions
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: date("date").notNull(),
  type: varchar("type", { length: 30 }).notNull(), // 'PURCHASE_RECEIPT' | 'PRODUCTION_PRESS' | etc.
  partnerId: uuid("partner_id"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Transaction Lines
export const txLines = pgTable("tx_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").notNull(),
  itemId: uuid("item_id").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 4 }).notNull(),
  price: numeric("price", { precision: 15, scale: 2 }),
  amount: numeric("amount", { precision: 15, scale: 2 }),
});

export const insertTxLineSchema = createInsertSchema(txLines).omit({
  id: true,
});

export type InsertTxLine = z.infer<typeof insertTxLineSchema>;
export type TxLine = typeof txLines.$inferSelect;

// Monthly Prices
export const monthlyPrices = pgTable("monthly_prices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  month: varchar("month", { length: 7 }).notNull(), // 'YYYY-MM'
  itemId: uuid("item_id").notNull(),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'PURCHASE' | 'SALES'
});

export const insertMonthlyPriceSchema = createInsertSchema(monthlyPrices).omit({
  id: true,
});

export type InsertMonthlyPrice = z.infer<typeof insertMonthlyPriceSchema>;
export type MonthlyPrice = typeof monthlyPrices.$inferSelect;

// Monthly Price Status
export const monthlyPriceStatus = pgTable("monthly_price_status", {
  month: varchar("month", { length: 7 }).primaryKey(), // 'YYYY-MM'
  isFixed: boolean("is_fixed").default(false),
  fixedAt: timestamp("fixed_at"),
});

export const insertMonthlyPriceStatusSchema = createInsertSchema(monthlyPriceStatus);

export type InsertMonthlyPriceStatus = z.infer<typeof insertMonthlyPriceStatusSchema>;
export type MonthlyPriceStatus = typeof monthlyPriceStatus.$inferSelect;

// Inventory Snapshots
export const inventorySnapshots = pgTable("inventory_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  month: varchar("month", { length: 7 }).notNull().unique(), // 'YYYY-MM'
  status: varchar("status", { length: 20 }).notNull(), // 'DRAFT' | 'COUNTING' | 'VARIANCE' | 'CLOSED'
  adjustmentTxId: uuid("adjustment_tx_id"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInventorySnapshotSchema = createInsertSchema(inventorySnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertInventorySnapshot = z.infer<typeof insertInventorySnapshotSchema>;
export type InventorySnapshot = typeof inventorySnapshots.$inferSelect;

// Inventory Snapshot Lines
export const inventorySnapshotLines = pgTable("inventory_snapshot_lines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotId: uuid("snapshot_id").notNull(),
  itemId: uuid("item_id").notNull(),
  calculatedQty: numeric("calculated_qty", { precision: 15, scale: 4 }).notNull(),
  actualQty: numeric("actual_qty", { precision: 15, scale: 4 }).notNull(),
  differenceQty: numeric("difference_qty", { precision: 15, scale: 4 }).notNull(),
  differenceReason: text("difference_reason"),
});

export const insertInventorySnapshotLineSchema = createInsertSchema(inventorySnapshotLines).omit({
  id: true,
});

export type InsertInventorySnapshotLine = z.infer<typeof insertInventorySnapshotLineSchema>;
export type InventorySnapshotLine = typeof inventorySnapshotLines.$inferSelect;

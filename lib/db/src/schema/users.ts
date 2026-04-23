import { pgTable, text, timestamp, numeric, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio").default("").notNull(),
  avatarUrl: text("avatar_url"),
  plan: text("plan").default("Free").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

import { pgTable, text, timestamp, numeric, uuid, integer } from "drizzle-orm/pg-core";

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
  // Referral attribution. Set once at signup time from the cookie that
  // the public template/explore pages drop on first visit. We do NOT
  // FK-constrain `referredViaProjectId` here to avoid a circular
  // import with `projectsTable`; it's a loose reference and a deleted
  // template just leaves the original credit row in place.
  referredByUserId: uuid("referred_by_user_id"),
  referredViaProjectId: uuid("referred_via_project_id"),
  // Admin override of the platform-default referral commission %.
  // NULL means "use the global default" (currently 15). Stored as an
  // integer for clean JSON; values are interpreted as a percentage.
  referralCommissionPct: integer("referral_commission_pct"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

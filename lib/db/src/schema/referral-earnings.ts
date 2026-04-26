import {
  pgTable,
  text,
  timestamp,
  numeric,
  uuid,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralEarningsTable = pgTable(
  "referral_earnings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerUserId: uuid("referrer_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    referredUserId: uuid("referred_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sourceProjectId: uuid("source_project_id"),
    transactionId: uuid("transaction_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    commissionPct: integer("commission_pct").notNull(),
    kind: text("kind").default("recurring").notNull(),
    status: text("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    referrerIdx: index("referral_earnings_referrer_idx").on(t.referrerUserId),
    referredIdx: index("referral_earnings_referred_idx").on(t.referredUserId),
  }),
);

export type ReferralEarning = typeof referralEarningsTable.$inferSelect;
export type InsertReferralEarning = typeof referralEarningsTable.$inferInsert;

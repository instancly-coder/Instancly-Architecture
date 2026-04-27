import {
  pgTable,
  text,
  timestamp,
  numeric,
  uuid,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { transactionsTable } from "./transactions";

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
    // Tying every earning row to the transaction that produced it lets
    // us enforce one-credit-per-payment at the DB level (see the unique
    // index below) — the webhook can be safely retried without
    // double-paying the referrer.
    transactionId: uuid("transaction_id").references(
      () => transactionsTable.id,
      { onDelete: "set null" },
    ),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    commissionPct: integer("commission_pct").notNull(),
    kind: text("kind").default("recurring").notNull(),
    status: text("status").default("pending").notNull(),
    // Set when the row gets attached to a payout batch. We deliberately
    // do NOT FK-constrain this with a hard reference because the
    // payouts table itself imports this one's owner column transitively
    // through `usersTable`; a stringly-loose ref via uuid is enough for
    // joins and avoids a circular schema import. On payout failure we
    // null this back out and revert `status` to 'pending'.
    payoutId: uuid("payout_id"),
    // Mirrors `payouts.failureReason` for the most recent failed
    // attempt against this row, copied here so the per-creator
    // earnings table can surface the error inline without a join.
    // Cleared when the row is re-batched into a fresh payout.
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => ({
    referrerIdx: index("referral_earnings_referrer_idx").on(t.referrerUserId),
    referredIdx: index("referral_earnings_referred_idx").on(t.referredUserId),
    // At most one earning per transaction, regardless of how many times
    // the source webhook gets retried.
    transactionUniq: uniqueIndex(
      "referral_earnings_transaction_id_uniq",
    ).on(t.transactionId),
  }),
);

export type ReferralEarning = typeof referralEarningsTable.$inferSelect;
export type InsertReferralEarning = typeof referralEarningsTable.$inferInsert;

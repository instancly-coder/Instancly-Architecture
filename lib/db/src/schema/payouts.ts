import {
  pgTable,
  text,
  timestamp,
  numeric,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * One row per outgoing payout to a creator. Created when the payout job
 * (cron or admin-triggered) batches a creator's pending referral
 * earnings into a single Stripe Connect transfer.
 *
 * Lifecycle:
 *   - inserted with `status='queued'` and a NULL `stripeTransferId`
 *     INSIDE the same transaction that flips the matching
 *     `referral_earnings.status` from 'pending' → 'paid' and links
 *     them via `referral_earnings.payout_id`. This is the atomic step
 *     that prevents the same earnings row from being batched into two
 *     payouts even if the job runs concurrently.
 *   - then the Stripe transfer call happens *outside* the transaction.
 *     On success we stamp `stripeTransferId` and `paidAt`.
 *   - on failure we move the payout to `status='failed'`, record the
 *     reason, and revert the linked earnings back to `status='pending'`
 *     with the same failure reason copied so the creator/admin can see
 *     why their balance didn't ship. The admin "Retry" action wipes the
 *     failure reason and re-enqueues the rows for the next cycle.
 */
export const payoutsTable = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerUserId: uuid("referrer_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Stripe `tr_…` id once the transfer call has succeeded. Null while
    // the row is queued or after a transfer failure that never produced
    // a transfer object. Unique so a duplicate webhook delivery can't
    // attach the same Stripe transfer to two distinct payout rows.
    stripeTransferId: text("stripe_transfer_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    // queued | paid | failed
    status: text("status").default("queued").notNull(),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
  },
  (t) => ({
    referrerIdx: index("payouts_referrer_idx").on(t.referrerUserId),
    transferIdUniq: uniqueIndex("payouts_stripe_transfer_id_uniq").on(
      t.stripeTransferId,
    ),
    statusIdx: index("payouts_status_idx").on(t.status),
  }),
);

export type Payout = typeof payoutsTable.$inferSelect;
export type InsertPayout = typeof payoutsTable.$inferInsert;

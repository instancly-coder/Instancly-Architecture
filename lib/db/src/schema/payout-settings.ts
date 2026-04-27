import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
} from "drizzle-orm/pg-core";

/**
 * Single-row table holding admin-tunable payout configuration:
 *   - the minimum pending balance (in GBP) before a creator's payout
 *     ships, which keeps Stripe per-transaction overhead from eating
 *     trivial transfers, and
 *   - the cron cycle interval (in minutes) controlling how often the
 *     payout scheduler wakes up and processes batches.
 *
 * The table is keyed by a synthetic constant ("singleton") so all
 * read/write paths target the same row via upsert. When the row is
 * absent — fresh DBs, or before an admin saves anything — code falls
 * back to env-var defaults (`PAYOUTS_MIN_GBP`, `PAYOUTS_INTERVAL_MS`)
 * so existing deployments keep their current behaviour until an admin
 * explicitly overrides it.
 */
export const payoutSettingsTable = pgTable("payout_settings", {
  // Always the literal string "singleton". Using a text PK (vs uuid)
  // makes the upsert-by-constant pattern obvious and unambiguous.
  id: text("id").primaryKey(),
  minPayoutGbp: numeric("min_payout_gbp", { precision: 12, scale: 2 })
    .notNull(),
  cycleIntervalMinutes: integer("cycle_interval_minutes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PayoutSettingsRow = typeof payoutSettingsTable.$inferSelect;
export type InsertPayoutSettingsRow =
  typeof payoutSettingsTable.$inferInsert;

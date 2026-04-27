import {
  pgTable,
  text,
  timestamp,
  numeric,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").default("Success").notNull(),
    method: text("method").default("Visa •••• 4242").notNull(),
    // Canonical Stripe identifier for the *real-world payment* this
    // row represents — typically an invoice id (`in_…`) for
    // subscription charges or a payment intent id (`pi_…`) for one-off
    // checkout payments. Critically, this is NOT the event id: a
    // single subscription charge fires both `checkout.session.completed`
    // AND `invoice.payment_succeeded`, with different event ids but
    // the SAME underlying invoice. Using the invoice/PI id as the
    // dedup key collapses both deliveries onto one transaction.
    // Null for legacy / manually-inserted rows.
    stripePaymentRef: text("stripe_payment_ref"),
    // The exact Stripe `event.id` (`evt_…`) that produced this row.
    // Stripe retries webhook deliveries aggressively when we 5xx or
    // time out; the unique index below is what guarantees those
    // retries can never double-credit a user even if every other
    // dedup layer (payment_ref, in-flight checks) somehow misses.
    // Distinct from `stripePaymentRef`: a single payment may legally
    // produce multiple events (e.g. a subscription's first charge
    // fires both `checkout.session.completed` and
    // `invoice.payment_succeeded`) — the payment_ref collapses those,
    // while this column collapses retries of the SAME event.
    //
    // Rollout / backfill: this column is nullable on purpose. Existing
    // rows written before the column was introduced get NULL, and
    // Postgres permits unlimited NULLs under a unique B-tree index, so
    // adding the constraint can never collide with legacy data. The
    // schema is applied to every environment by
    // `scripts/post-merge.sh` (`pnpm --filter db push`), which is this
    // project's only DDL pathway — there are no checked-in SQL
    // migration files.
    stripeEventId: text("stripe_event_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    stripePaymentRefIdx: uniqueIndex(
      "transactions_stripe_payment_ref_uniq",
    ).on(t.stripePaymentRef),
    stripeEventIdIdx: uniqueIndex(
      "transactions_stripe_event_id_uniq",
    ).on(t.stripeEventId),
  }),
);

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    stripePaymentRefIdx: uniqueIndex(
      "transactions_stripe_payment_ref_uniq",
    ).on(t.stripePaymentRef),
  }),
);

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;

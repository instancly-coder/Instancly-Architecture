import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  transactionsTable,
  referralEarningsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  DEFAULT_REFERRAL_COMMISSION_PCT,
  resolveCommissionPct,
} from "../lib/referral-commission";

const router: IRouter = Router();

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const SIGNATURE_TOLERANCE_SEC = 5 * 60;

/**
 * Verify a Stripe-style `Stripe-Signature` header against a raw request
 * body. Format: `t=<timestamp>,v1=<hex hmac>[,v0=<hex hmac>...]`.
 *
 * We re-implement this here (rather than pull in `stripe`) so the webhook
 * can be wired up without taking a hard dependency on the SDK. The
 * verification scheme matches Stripe's own constructEvent: HMAC-SHA256
 * of `${t}.${rawBody}` keyed by the webhook secret, compared against
 * the v1 entry in constant time.
 */
function verifyStripeSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.trim());
  let timestamp: string | null = null;
  const v1Sigs: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v;
    else if (k === "v1") v1Sigs.push(v);
  }
  if (!timestamp || v1Sigs.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const ageSec = Math.abs(Date.now() / 1000 - ts);
  if (ageSec > SIGNATURE_TOLERANCE_SEC) return false;

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  return v1Sigs.some((sig) => {
    let sigBuf: Buffer;
    try {
      sigBuf = Buffer.from(sig, "hex");
    } catch {
      return false;
    }
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  });
}

type StripeChargeEvent = {
  id: string;
  type: string;
  data?: {
    object?: {
      // common
      id?: string | null;
      // checkout.session.completed
      client_reference_id?: string | null;
      customer_email?: string | null;
      amount_total?: number | null;
      currency?: string | null;
      payment_method_types?: string[] | null;
      invoice?: string | null;
      payment_intent?: string | null;
      // payment_intent.succeeded (kept for completeness; this event
      // type is filtered out below — see PAYMENT_SUCCESS_EVENTS)
      amount?: number | null;
      receipt_email?: string | null;
      metadata?: Record<string, string> | null;
      // invoice.payment_succeeded
      amount_paid?: number | null;
      total?: number | null;
      customer_email_address?: string | null;
    };
  };
};

/**
 * Compute the canonical "this real-world payment" identifier from a
 * Stripe event's object payload. The mapping is deliberate:
 *
 *   invoice.payment_succeeded → invoice id (`obj.id`, e.g. `in_…`)
 *   checkout.session.completed (subscription mode) → invoice id
 *     (`obj.invoice`)
 *   checkout.session.completed (one-off mode) → payment intent id
 *     (`obj.payment_intent`)
 *
 * The crucial property: a single subscription's initial charge fires
 * BOTH `checkout.session.completed` AND `invoice.payment_succeeded`,
 * but both resolve to the same invoice id here. The unique index on
 * `transactions.stripe_payment_ref` then ensures only one transaction
 * (and therefore only one referral_earnings credit) is ever written.
 *
 * As a last-ditch fallback for events with neither (extremely unusual)
 * we fall back to the object id, which still gives per-event
 * idempotency.
 */
function pickPaymentRef(
  obj: NonNullable<StripeChargeEvent["data"]>["object"],
): string | null {
  if (!obj) return null;
  if (typeof obj.invoice === "string" && obj.invoice) return obj.invoice;
  if (typeof obj.payment_intent === "string" && obj.payment_intent)
    return obj.payment_intent;
  if (typeof obj.id === "string" && obj.id) return obj.id;
  return null;
}

/**
 * Pull the amount in minor units (pence/cents) from whichever Stripe
 * object shape we've been handed. Each event type uses a slightly
 * different field — checkout sessions expose `amount_total`, invoices
 * expose `amount_paid` (with `total` as a fallback), and payment
 * intents would use `amount` if we ever accepted them. We try the
 * most-specific field first so a partial refund on an invoice (where
 * `amount_paid < total`) still credits the actual paid amount.
 */
function pickAmountMinorUnits(obj: NonNullable<StripeChargeEvent["data"]>["object"]): number | null {
  if (!obj) return null;
  if (typeof obj.amount_paid === "number") return obj.amount_paid;
  if (typeof obj.amount_total === "number") return obj.amount_total;
  if (typeof obj.total === "number") return obj.total;
  if (typeof obj.amount === "number") return obj.amount;
  return null;
}

function pickPayerEmail(obj: NonNullable<StripeChargeEvent["data"]>["object"]): string | null {
  if (!obj) return null;
  // Invoice events use `customer_email_address`; checkout sessions use
  // `customer_email`; payment intents (when accepted) use `receipt_email`.
  return (
    obj.customer_email ??
    obj.customer_email_address ??
    obj.receipt_email ??
    null
  );
}

function pickPayerUserId(obj: NonNullable<StripeChargeEvent["data"]>["object"]): string | null {
  if (!obj) return null;
  if (typeof obj.client_reference_id === "string" && obj.client_reference_id) {
    return obj.client_reference_id;
  }
  const metaUserId = obj.metadata?.userId;
  if (typeof metaUserId === "string" && metaUserId) return metaUserId;
  return null;
}

/**
 * Handle one Stripe payment-success event end-to-end:
 *   1. Compute a stable payment ref (invoice / payment-intent id) and
 *      short-circuit if this real-world payment has already been
 *      processed. This canonicalisation is what stops a subscription's
 *      initial charge — which fires both `checkout.session.completed`
 *      AND `invoice.payment_succeeded` — from being credited twice.
 *      Stripe retries are at-least-once, so we MUST be idempotent.
 *   2. Resolve the paying user (by client_reference_id or email).
 *   3. Insert a `transactions` row tagged with `stripePaymentRef` so
 *      the user sees the payment in their billing history.
 *   4. If they were referred, insert a matching `referral_earnings`
 *      row tied back to that transaction. The unique index on
 *      `referral_earnings.transaction_id` is the second line of
 *      defence: even if two webhook deliveries race past the
 *      payment-ref check, only one earning row can ever stick.
 *
 * Errors are logged and re-thrown to the caller, which translates
 * them into 5xx so Stripe will retry — better than silently dropping
 * the event and leaving the user under-credited.
 */
async function processPaymentSuccess(event: StripeChargeEvent): Promise<void> {
  const obj = event.data?.object;
  if (!obj) return;

  const paymentRef = pickPaymentRef(obj);
  if (!paymentRef) {
    logger.warn(
      { eventId: event.id, eventType: event.type },
      "Stripe webhook: could not derive a stable payment ref, skipping",
    );
    return;
  }

  // Idempotency keyed on the stable payment ref (invoice / payment
  // intent / session id), NOT the event id. This means the second
  // delivery of a subscription's initial charge —
  // `checkout.session.completed` followed by `invoice.payment_succeeded`
  // — collapses onto the same transaction and produces only one
  // referral_earnings row.
  const existing = (
    await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(eq(transactionsTable.stripePaymentRef, paymentRef))
      .limit(1)
  )[0];
  if (existing) {
    logger.info(
      { eventId: event.id, paymentRef, transactionId: existing.id },
      "Stripe webhook: payment already processed, skipping",
    );
    return;
  }

  const amountMinor = pickAmountMinorUnits(obj);
  if (amountMinor == null || amountMinor <= 0) {
    logger.warn(
      { eventId: event.id, eventType: event.type },
      "Stripe webhook: payment event missing amount, skipping",
    );
    return;
  }
  const amount = amountMinor / 100;

  const userId = pickPayerUserId(obj);
  const email = pickPayerEmail(obj);

  let user: typeof usersTable.$inferSelect | undefined;
  if (userId) {
    user = (
      await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
    )[0];
  }
  if (!user && email) {
    user = (
      await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1)
    )[0];
  }
  if (!user) {
    logger.warn(
      { eventId: event.id, userId, email },
      "Stripe webhook: could not resolve paying user, skipping",
    );
    return;
  }

  const method = (() => {
    const types = obj.payment_method_types;
    if (Array.isArray(types) && types.length > 0) {
      const t = types[0];
      return t.charAt(0).toUpperCase() + t.slice(1);
    }
    return "Card";
  })();

  // Insert the transaction. If a concurrent retry beats us to this
  // INSERT, the unique index on `stripe_payment_ref` will reject the
  // second one — we treat that as a no-op.
  let transactionId: string;
  try {
    const inserted = await db
      .insert(transactionsTable)
      .values({
        userId: user.id,
        amount: amount.toFixed(2),
        status: "Success",
        method,
        stripePaymentRef: paymentRef,
      })
      .returning({ id: transactionsTable.id });
    transactionId = inserted[0].id;
  } catch (err) {
    // 23505 = unique_violation; means another delivery already won.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: unknown }).code === "23505"
    ) {
      logger.info(
        { eventId: event.id },
        "Stripe webhook: lost race to insert transaction, skipping",
      );
      return;
    }
    throw err;
  }

  if (!user.referredByUserId) return;

  // Look up the referrer's commission % override. Falls back to the
  // platform default if they haven't been touched by an admin.
  const referrer = (
    await db
      .select({
        id: usersTable.id,
        referralCommissionPct: usersTable.referralCommissionPct,
      })
      .from(usersTable)
      .where(eq(usersTable.id, user.referredByUserId))
      .limit(1)
  )[0];
  if (!referrer) {
    logger.warn(
      { eventId: event.id, referrerId: user.referredByUserId, payerId: user.id },
      "Stripe webhook: payer's referrer no longer exists, skipping commission",
    );
    return;
  }
  const pct = resolveCommissionPct(referrer.referralCommissionPct);
  // Round to two decimals to keep DB-side numeric values clean.
  const earned = Math.round(amount * pct) / 100;

  try {
    await db.insert(referralEarningsTable).values({
      referrerUserId: referrer.id,
      referredUserId: user.id,
      sourceProjectId: user.referredViaProjectId ?? null,
      transactionId,
      amount: earned.toFixed(2),
      commissionPct: pct,
      status: "pending",
      kind: "recurring",
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: unknown }).code === "23505"
    ) {
      // Already credited via another delivery — safe to ignore.
      logger.info(
        { eventId: event.id, transactionId },
        "Stripe webhook: referral earning already exists for this transaction",
      );
      return;
    }
    throw err;
  }

  logger.info(
    {
      eventId: event.id,
      referrerId: referrer.id,
      payerId: user.id,
      transactionId,
      amount,
      pct,
      earned,
    },
    "Stripe webhook: credited referral earning",
  );
}

// Only one canonical event per logical payment:
//   - `checkout.session.completed` — initial one-off / first subscription
//     payment via Stripe Checkout.
//   - `invoice.payment_succeeded` — every subsequent recurring renewal.
// We deliberately skip `payment_intent.succeeded`, which overlaps with
// both of the above and would double-count if accepted.
const PAYMENT_SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "invoice.payment_succeeded",
]);

/**
 * Stripe webhook receiver. Mounted with `express.raw` (not the global
 * JSON parser) so we still have the original byte stream available for
 * HMAC signature verification — Stripe's signature is computed against
 * the raw body, and re-serializing JSON would break verification.
 *
 * In dev we accept un-signed events (no `STRIPE_WEBHOOK_SECRET`) so the
 * flow can be smoke-tested with `curl`. In production the secret MUST
 * be set; an unsigned request is rejected with 400.
 */
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req: Request, res: Response): Promise<void> => {
    const rawBody = req.body as Buffer;
    const sigHeader = req.headers["stripe-signature"];
    const sig =
      typeof sigHeader === "string"
        ? sigHeader
        : Array.isArray(sigHeader)
          ? sigHeader[0]
          : undefined;

    if (WEBHOOK_SECRET) {
      const ok = verifyStripeSignature(rawBody, sig, WEBHOOK_SECRET);
      if (!ok) {
        res
          .status(400)
          .json({ status: "error", message: "Invalid Stripe signature" });
        return;
      }
    } else if (process.env.NODE_ENV === "production") {
      res.status(400).json({
        status: "error",
        message: "Stripe webhook secret is not configured",
      });
      return;
    }

    let event: StripeChargeEvent;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as StripeChargeEvent;
    } catch {
      res
        .status(400)
        .json({ status: "error", message: "Invalid JSON payload" });
      return;
    }

    if (!event.type || !PAYMENT_SUCCESS_EVENTS.has(event.type)) {
      // Acknowledge unrelated events so Stripe stops retrying them.
      res.json({ received: true, handled: false });
      return;
    }

    try {
      await processPaymentSuccess(event);
    } catch (err) {
      logger.error(
        { err, eventId: event.id, eventType: event.type },
        "Stripe webhook: failed to process payment success event",
      );
      // Surface a 500 so Stripe retries — better than silently dropping
      // the event and leaving the user under-credited.
      res
        .status(500)
        .json({ status: "error", message: "Processing failed" });
      return;
    }

    res.json({ received: true, handled: true });
  },
);

export { DEFAULT_REFERRAL_COMMISSION_PCT };
export default router;

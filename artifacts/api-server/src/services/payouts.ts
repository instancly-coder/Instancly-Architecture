// Per-creator payout batching: gathers a creator's pending referral
// earnings into a single Stripe Connect transfer, atomically reserves
// the rows so two concurrent runs can't double-pay, then ships the
// transfer outside the transaction. Failures roll the rows back so the
// next cycle (or an admin retry) picks them up again.

import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  referralEarningsTable,
  payoutsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  createTransfer,
  StripeApiError,
  stripeConfigured,
} from "../lib/stripe";
import { getPayoutSettings } from "./payout-settings";

export type PayoutCycleResult = {
  considered: number;
  paidOut: number;
  failed: number;
  skipped: number;
  // True when STRIPE_SECRET_KEY is present and the cycle actually ran.
  // False means we no-op'd the whole cycle (dev / unconfigured envs)
  // — useful for the admin UI to render "Stripe not configured" copy.
  configured: boolean;
};

/**
 * Find every creator with pending earnings, batch each one's pending
 * pile into one payout, and ship the transfer. Returns aggregate
 * counts so callers (cron tick, admin button) can log/render a summary.
 *
 * Concurrency-safe: the per-creator "reserve rows" step runs inside a
 * single SQL UPDATE that scopes to `status='pending' AND payout_id IS
 * NULL`, so even if two cycles overlap only one can claim a given
 * earnings row.
 */
export async function runPayoutCycle(): Promise<PayoutCycleResult> {
  if (!stripeConfigured()) {
    logger.warn("payout cycle skipped: STRIPE_SECRET_KEY not configured");
    return {
      considered: 0,
      paidOut: 0,
      failed: 0,
      skipped: 0,
      configured: false,
    };
  }

  // Crash-recovery sweep: any payout still `queued` (no
  // stripeTransferId) older than the stale threshold is from a process
  // that died between reserving rows and shipping the transfer. Unlink
  // its earnings and delete the row so the candidate query below
  // picks them up again. Five minutes is well past the longest healthy
  // transfer roundtrip but short enough to free funds quickly.
  await recoverStaleQueuedPayouts();

  // Read the live admin-tunable threshold ONCE per cycle so all
  // creators in this run are evaluated against the same value (no
  // half-and-half cycle if an admin saves a new threshold mid-run)
  // and so we don't query the settings row inside the per-creator
  // loop. The same value is also passed into the inner
  // `batchAndPayCreator` reservation guard.
  const { minPayoutGbp } = await getPayoutSettings();

  // Pull every creator who has at least one ready-to-pay row AND a
  // verified Connect account. We aggregate the eligible amount in SQL
  // so we can early-skip creators below the minimum without pulling
  // their per-row data.
  const candidates = await db
    .select({
      userId: usersTable.id,
      stripeConnectAccountId: usersTable.stripeConnectAccountId,
      stripeConnectStatus: usersTable.stripeConnectStatus,
      pendingTotal: sql<string>`coalesce(sum(${referralEarningsTable.amount}), 0)`,
      pendingCount: sql<number>`count(${referralEarningsTable.id})`,
    })
    .from(usersTable)
    .innerJoin(
      referralEarningsTable,
      eq(referralEarningsTable.referrerUserId, usersTable.id),
    )
    .where(
      and(
        eq(referralEarningsTable.status, "pending"),
        isNull(referralEarningsTable.payoutId),
      ),
    )
    .groupBy(
      usersTable.id,
      usersTable.stripeConnectAccountId,
      usersTable.stripeConnectStatus,
    );

  let considered = 0;
  let paidOut = 0;
  let failed = 0;
  let skipped = 0;

  for (const c of candidates) {
    considered++;
    const total = Number(c.pendingTotal);
    if (
      !c.stripeConnectAccountId ||
      c.stripeConnectStatus !== "verified" ||
      total < minPayoutGbp
    ) {
      skipped++;
      continue;
    }
    try {
      const r = await batchAndPayCreator(
        c.userId,
        c.stripeConnectAccountId,
        minPayoutGbp,
      );
      if (r === "paid") paidOut++;
      else if (r === "failed") failed++;
      else skipped++;
    } catch (err) {
      logger.error(
        { err, userId: c.userId },
        "payout cycle: unexpected error processing creator",
      );
      failed++;
    }
  }

  if (considered > 0) {
    logger.info(
      { considered, paidOut, failed, skipped },
      "payout cycle complete",
    );
  }
  return { considered, paidOut, failed, skipped, configured: true };
}

/**
 * Batch one creator's pending earnings into a single payout row,
 * attempt the Stripe transfer, and either finalize the payout or
 * roll the rows back. Returns "paid" / "failed" / "skipped" so the
 * cycle summary stays accurate.
 *
 * The atomic reservation step is the critical bit: we INSERT a payout
 * row and UPDATE the matching earnings rows inside a single
 * transaction. Any concurrent cycle that re-reads `payout_id IS NULL`
 * will see an empty result and harmlessly skip.
 */
async function batchAndPayCreator(
  userId: string,
  destinationAccount: string,
  minPayoutGbp: number,
): Promise<"paid" | "failed" | "skipped"> {
  type Reserved = {
    payoutId: string;
    earningIds: string[];
    amount: number;
  };
  const reserved = await db.transaction(async (tx): Promise<Reserved | null> => {
    // Lock the candidate rows for the duration of the txn. SKIP LOCKED
    // means a concurrent cycle picking up the same creator just sees
    // an empty result set and harmlessly bails — no double-pay risk
    // even if cron and the admin button fire simultaneously.
    const rows = await tx
      .select({
        id: referralEarningsTable.id,
        amount: referralEarningsTable.amount,
      })
      .from(referralEarningsTable)
      .where(
        and(
          eq(referralEarningsTable.referrerUserId, userId),
          eq(referralEarningsTable.status, "pending"),
          isNull(referralEarningsTable.payoutId),
        ),
      )
      .for("update", { skipLocked: true });
    if (rows.length === 0) return null;

    const total =
      Math.round(rows.reduce((n, r) => n + Number(r.amount), 0) * 100) / 100;
    if (total < minPayoutGbp) return null;

    const [inserted] = await tx
      .insert(payoutsTable)
      .values({
        referrerUserId: userId,
        amount: total.toFixed(2),
        status: "queued",
      })
      .returning({ id: payoutsTable.id });

    // Defence-in-depth: even though we hold row locks, we also constrain
    // the UPDATE to rows still pending and unlinked. If a row somehow
    // mutated between SELECT and UPDATE the count mismatch will trip
    // the assert below and abort the txn before we ship a transfer.
    const updated = await tx
      .update(referralEarningsTable)
      .set({ payoutId: inserted.id, failureReason: null })
      .where(
        and(
          inArray(
            referralEarningsTable.id,
            rows.map((r) => r.id),
          ),
          eq(referralEarningsTable.status, "pending"),
          isNull(referralEarningsTable.payoutId),
        ),
      )
      .returning({ id: referralEarningsTable.id });

    if (updated.length !== rows.length) {
      // Another writer slipped in between SELECT FOR UPDATE and our
      // UPDATE — extremely unlikely with row locks held, but if it
      // does happen we'd rather throw and roll back than ship a
      // partial transfer.
      throw new Error(
        `payout reservation race: locked ${rows.length}, claimed ${updated.length}`,
      );
    }

    return {
      payoutId: inserted.id,
      earningIds: rows.map((r) => r.id),
      amount: total,
    };
  });

  if (!reserved) return "skipped";

  // Outside the txn: ship the transfer. The idempotency key is the
  // payout row id, so retrying this exact payout (same row) collapses
  // to one Stripe transfer even on transient network blips.
  try {
    const transfer = await createTransfer({
      destination: destinationAccount,
      amountMinor: Math.round(reserved.amount * 100),
      currency: "usd",
      description: `DeployBro referral earnings payout`,
      metadata: { payoutId: reserved.payoutId, userId },
      idempotencyKey: `payout:${reserved.payoutId}`,
    });

    await db.transaction(async (tx) => {
      await tx
        .update(payoutsTable)
        .set({
          status: "paid",
          stripeTransferId: transfer.id,
          paidAt: new Date(),
        })
        .where(eq(payoutsTable.id, reserved.payoutId));
      await tx
        .update(referralEarningsTable)
        .set({ status: "paid", paidAt: new Date() })
        .where(
          inArray(referralEarningsTable.id, reserved.earningIds),
        );
    });

    logger.info(
      {
        userId,
        payoutId: reserved.payoutId,
        amount: reserved.amount,
        transferId: transfer.id,
        rows: reserved.earningIds.length,
      },
      "payout shipped",
    );
    return "paid";
  } catch (err) {
    const reason = formatFailureReason(err);
    logger.warn(
      { err, userId, payoutId: reserved.payoutId, reason },
      "payout transfer failed; reverting reserved rows",
    );
    await db.transaction(async (tx) => {
      await tx
        .update(payoutsTable)
        .set({
          status: "failed",
          failureReason: reason,
          failedAt: new Date(),
        })
        .where(eq(payoutsTable.id, reserved.payoutId));
      // Revert the earnings rows so the next cycle / retry can pick
      // them up again. We also unlink them from the failed payout so
      // the unique-payout-per-batch invariant holds for the retry.
      await tx
        .update(referralEarningsTable)
        .set({
          status: "pending",
          payoutId: null,
          failureReason: reason,
        })
        .where(
          inArray(referralEarningsTable.id, reserved.earningIds),
        );
    });
    return "failed";
  }
}

function formatFailureReason(err: unknown): string {
  if (err instanceof StripeApiError) {
    return `Stripe ${err.status}${err.stripeCode ? ` (${err.stripeCode})` : ""}: ${err.bodyExcerpt.slice(0, 180)}`;
  }
  if (err instanceof Error) return err.message.slice(0, 200);
  return "Unknown error";
}

/**
 * Re-queue a previously-failed payout so the next cycle picks it up.
 * Idempotent: a payout in any other state is a no-op so the admin can
 * spam-click safely.
 *
 * Implementation note: rather than try to "resume" the failed payout
 * row, we delete it and unlink any earning rows that still reference
 * it. The next cycle then re-batches those rows into a fresh payout
 * with a fresh idempotency key. This sidesteps Stripe's idempotency
 * cache, which would otherwise replay the original failure.
 */
export async function retryFailedPayout(
  payoutId: string,
): Promise<{ requeued: boolean; reason?: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: payoutsTable.id,
        status: payoutsTable.status,
        referrerUserId: payoutsTable.referrerUserId,
      })
      .from(payoutsTable)
      .where(eq(payoutsTable.id, payoutId))
      .limit(1);
    if (!row) return { requeued: false, reason: "not_found" };
    if (row.status !== "failed")
      return { requeued: false, reason: `status=${row.status}` };

    await tx
      .update(referralEarningsTable)
      .set({ payoutId: null, failureReason: null })
      .where(eq(referralEarningsTable.payoutId, payoutId));
    await tx.delete(payoutsTable).where(eq(payoutsTable.id, payoutId));
    return { requeued: true };
  });
}


// How long a payout can sit in `queued` before we treat it as a crash
// orphan. Healthy transfers complete in <30s; five minutes leaves
// generous headroom for slow Stripe responses while still freeing
// stranded funds before the next hourly cron tick.
const STALE_QUEUED_MS = 5 * 60 * 1000;

/**
 * Recover any `queued` payout rows that never got a stripeTransferId
 * — a sign that the process died after reserving the earnings rows
 * but before the Stripe transfer call returned. We unlink the
 * earnings (so the next batch picks them up) and delete the orphaned
 * payout. Idempotent: safe to call at the start of every cycle.
 */
async function recoverStaleQueuedPayouts(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_QUEUED_MS);
  const stale = await db
    .select({ id: payoutsTable.id })
    .from(payoutsTable)
    .where(
      and(
        eq(payoutsTable.status, "queued"),
        isNull(payoutsTable.stripeTransferId),
        lt(payoutsTable.createdAt, cutoff),
      ),
    );
  if (stale.length === 0) return;

  const ids = stale.map((p) => p.id);
  await db.transaction(async (tx) => {
    await tx
      .update(referralEarningsTable)
      .set({ payoutId: null, failureReason: null })
      .where(inArray(referralEarningsTable.payoutId, ids));
    await tx.delete(payoutsTable).where(inArray(payoutsTable.id, ids));
  });

  logger.warn(
    { count: stale.length, ids },
    "payout cycle: recovered stale queued payouts (likely crash before transfer)",
  );
}

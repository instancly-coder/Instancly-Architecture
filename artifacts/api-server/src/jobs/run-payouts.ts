// Scheduled background ticker that runs the referral-earnings payout
// cycle. The actual batching/transfer logic lives in
// `services/payouts.ts` so the admin "Run payouts now" button and this
// job share one code path.
//
// Design notes:
//   - Self-skips when STRIPE_SECRET_KEY isn't set, so the API server
//     boots cleanly in dev without forcing the secret.
//   - Single-flight via an in-memory `running` flag: if a cycle runs
//     long, the next tick no-ops instead of stacking calls.
//   - Long default interval (1h) — payouts don't need second-level
//     latency and frequent cycles would just bombard Stripe with
//     "nothing to do" lookups for empty queues.

import { logger } from "../lib/logger";
import { runPayoutCycle } from "../services/payouts";
import { stripeConfigured } from "../lib/stripe";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startPayoutScheduler(): void {
  if (intervalHandle) {
    logger.warn("payout scheduler already started; ignoring second start");
    return;
  }
  if (!stripeConfigured()) {
    logger.warn(
      "STRIPE_SECRET_KEY not set; payout scheduler will not start",
    );
    return;
  }

  const intervalMs = positiveIntFromEnv(
    "PAYOUTS_INTERVAL_MS",
    DEFAULT_INTERVAL_MS,
  );

  logger.info({ intervalMs }, "payout scheduler starting");

  // Stagger the first run (0–60s) so multiple instances (if we ever
  // scale out) don't all fire on the exact same wall clock.
  const startupDelay = Math.floor(Math.random() * 60_000);
  setTimeout(() => {
    void runOneCycle();
    intervalHandle = setInterval(() => {
      void runOneCycle();
    }, intervalMs);
    if (intervalHandle.unref) intervalHandle.unref();
  }, startupDelay);
}

export function stopPayoutScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

async function runOneCycle(): Promise<void> {
  if (running) {
    logger.debug("payout cycle skipped: previous cycle still running");
    return;
  }
  running = true;
  try {
    await runPayoutCycle();
  } catch (err) {
    logger.error({ err }, "payout cycle crashed");
  } finally {
    running = false;
  }
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

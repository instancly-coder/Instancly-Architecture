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
//   - Cycle interval is admin-configurable (DB-backed) and re-read
//     after every cycle, so changes from the admin UI take effect on
//     the next tick — no server restart needed. We use recursive
//     `setTimeout` (instead of `setInterval`) precisely so the new
//     interval value is honoured every reschedule.

import { logger } from "../lib/logger";
import { runPayoutCycle } from "../services/payouts";
import { getPayoutSettings } from "../services/payout-settings";
import { stripeConfigured } from "../lib/stripe";

// Hard fallback used only when reading settings throws (e.g. DB
// hiccup). Keeps the scheduler ticking instead of stopping forever.
const FALLBACK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let stopped = false;
// Dedicated lifecycle flag so a second `startPayoutScheduler()` call
// during an in-flight cycle (when `timer` is momentarily null while
// `tick()` is awaiting `runPayoutCycle()`) doesn't accidentally spawn
// a duplicate loop. `stopPayoutScheduler()` flips this back to false.
let started = false;

export function startPayoutScheduler(): void {
  if (started) {
    logger.warn("payout scheduler already started; ignoring second start");
    return;
  }
  if (!stripeConfigured()) {
    logger.warn(
      "STRIPE_SECRET_KEY not set; payout scheduler will not start",
    );
    return;
  }

  started = true;
  stopped = false;
  logger.info("payout scheduler starting");

  // Stagger the first run (0–60s) so multiple instances (if we ever
  // scale out) don't all fire on the exact same wall clock.
  const startupDelay = Math.floor(Math.random() * 60_000);
  schedule(startupDelay);
}

export function stopPayoutScheduler(): void {
  stopped = true;
  started = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function schedule(delayMs: number): void {
  timer = setTimeout(() => {
    void tick();
  }, delayMs);
  if (timer.unref) timer.unref();
}

async function tick(): Promise<void> {
  timer = null;
  if (stopped) return;

  if (running) {
    logger.debug("payout cycle skipped: previous cycle still running");
  } else {
    running = true;
    try {
      await runPayoutCycle();
    } catch (err) {
      logger.error({ err }, "payout cycle crashed");
    } finally {
      running = false;
    }
  }

  if (stopped) return;

  // Re-read the interval AFTER the cycle finishes so admin-saved
  // changes apply on the very next reschedule. If the read fails
  // (DB blip, schema not yet pushed) we fall back to one hour rather
  // than dropping the schedule entirely.
  let nextDelayMs = FALLBACK_INTERVAL_MS;
  try {
    const cfg = await getPayoutSettings();
    nextDelayMs = Math.max(1, cfg.cycleIntervalMinutes) * 60_000;
  } catch (err) {
    logger.error(
      { err },
      "payout scheduler: failed to read settings; using 1h fallback",
    );
  }
  schedule(nextDelayMs);
}

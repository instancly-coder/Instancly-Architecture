// Read/write the admin-tunable payout configuration: the minimum
// pending balance before a creator's payout ships, and the cron
// interval. Values live in the `payout_settings` singleton row; if
// that row is absent (fresh DBs, or before any admin save) the
// helpers fall back to env-var defaults so existing deployments keep
// their current behaviour.

import { eq } from "drizzle-orm";
import { db, payoutSettingsTable } from "@workspace/db";

const SINGLETON_ID = "singleton";

// Hard defaults used when neither the DB row nor an env override is
// present. Match the previous hard-coded constants exactly so a
// fresh deployment with no settings row behaves identically to the
// pre-refactor server.
const FALLBACK_MIN_GBP = 10;
const FALLBACK_INTERVAL_MIN = 60;

// Lower/upper bounds for the editable values. Validating here (and
// not just in the route) means the cron can also trust whatever it
// reads from the DB even if a future code path writes directly.
//   - Min payout: must be > 0 (otherwise we'd ship empty transfers)
//     and capped at $10,000 to catch obvious admin mistakes.
//   - Interval: must be at least 1 minute (sub-minute polling would
//     hammer the DB pointlessly) and at most 7 days (longer than that
//     and creators would complain that payouts feel broken).
export const MIN_PAYOUT_GBP_FLOOR = 0.01;
export const MIN_PAYOUT_GBP_CEILING = 10_000;
export const CYCLE_INTERVAL_MIN_FLOOR = 1;
export const CYCLE_INTERVAL_MIN_CEILING = 7 * 24 * 60;

export type PayoutConfig = {
  minPayoutGbp: number;
  cycleIntervalMinutes: number;
};

function envMinGbp(): number {
  const raw = process.env.PAYOUTS_MIN_GBP;
  if (!raw) return FALLBACK_MIN_GBP;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : FALLBACK_MIN_GBP;
}

function envIntervalMinutes(): number {
  // PAYOUTS_INTERVAL_MS stays in milliseconds for back-compat with
  // any deployment already using it; we just translate to minutes.
  const raw = process.env.PAYOUTS_INTERVAL_MS;
  if (!raw) return FALLBACK_INTERVAL_MIN;
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return FALLBACK_INTERVAL_MIN;
  return Math.max(1, Math.round(ms / 60_000));
}

/**
 * Return the live payout configuration. Reads the singleton row;
 * falls back to env-derived defaults when the row hasn't been
 * created yet. Always resolves with a fully-populated object so
 * callers never have to handle "missing settings" themselves.
 */
export async function getPayoutSettings(): Promise<PayoutConfig> {
  const [row] = await db
    .select({
      minPayoutGbp: payoutSettingsTable.minPayoutGbp,
      cycleIntervalMinutes: payoutSettingsTable.cycleIntervalMinutes,
    })
    .from(payoutSettingsTable)
    .where(eq(payoutSettingsTable.id, SINGLETON_ID))
    .limit(1);

  if (!row) {
    return {
      minPayoutGbp: envMinGbp(),
      cycleIntervalMinutes: envIntervalMinutes(),
    };
  }
  return {
    minPayoutGbp: Number(row.minPayoutGbp),
    cycleIntervalMinutes: row.cycleIntervalMinutes,
  };
}

export type UpdatePayoutSettingsInput = {
  minPayoutGbp: number;
  cycleIntervalMinutes: number;
};

export class InvalidPayoutSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPayoutSettingsError";
  }
}

/**
 * Upsert the singleton row with new values. Throws
 * `InvalidPayoutSettingsError` if either field is out of range so the
 * route handler can map it to a 400 without leaking implementation
 * detail. Returns the persisted (validated) values.
 */
export async function updatePayoutSettings(
  input: UpdatePayoutSettingsInput,
): Promise<PayoutConfig> {
  const minPayoutGbp = Number(input.minPayoutGbp);
  const cycleIntervalMinutes = Number(input.cycleIntervalMinutes);

  if (
    !Number.isFinite(minPayoutGbp) ||
    minPayoutGbp < MIN_PAYOUT_GBP_FLOOR ||
    minPayoutGbp > MIN_PAYOUT_GBP_CEILING
  ) {
    throw new InvalidPayoutSettingsError(
      `minPayoutGbp must be a number between ${MIN_PAYOUT_GBP_FLOOR} and ${MIN_PAYOUT_GBP_CEILING}.`,
    );
  }
  // Reject decimals outright instead of silently flooring — the
  // OpenAPI contract declares this field as an integer, and an admin
  // who typed "60.5" deserves a clear error rather than a surprise
  // 60-minute persistence.
  if (
    !Number.isInteger(cycleIntervalMinutes) ||
    cycleIntervalMinutes < CYCLE_INTERVAL_MIN_FLOOR ||
    cycleIntervalMinutes > CYCLE_INTERVAL_MIN_CEILING
  ) {
    throw new InvalidPayoutSettingsError(
      `cycleIntervalMinutes must be an integer between ${CYCLE_INTERVAL_MIN_FLOOR} and ${CYCLE_INTERVAL_MIN_CEILING}.`,
    );
  }

  // Round the dollar threshold to whole cents so the persisted value
  // matches what an admin actually typed, not a binary-float artifact.
  const roundedMin = Math.round(minPayoutGbp * 100) / 100;

  const now = new Date();
  await db
    .insert(payoutSettingsTable)
    .values({
      id: SINGLETON_ID,
      minPayoutGbp: roundedMin.toFixed(2),
      cycleIntervalMinutes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: payoutSettingsTable.id,
      set: {
        minPayoutGbp: roundedMin.toFixed(2),
        cycleIntervalMinutes,
        updatedAt: now,
      },
    });

  return { minPayoutGbp: roundedMin, cycleIntervalMinutes };
}

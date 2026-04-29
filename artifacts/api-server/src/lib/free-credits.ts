import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export const FREE_TIER_MONTHLY_AMOUNT = "2.50";
export const FREE_TIER_GRANT_INTERVAL_SQL = sql`interval '30 days'`;

/**
 * Top up a user to the Free-tier monthly minimum ($2.50) if they're due.
 *
 * "Due" means ALL of:
 *   1. plan = 'Free'   (paying users handle their own balance via Stripe)
 *   2. balance < 2.50  (already-funded users get nothing — no stacking)
 *   3. free_monthly_grant_at IS NULL  OR  > 30 days ago
 *
 * The single conditional UPDATE is idempotent and cheap: when the user
 * isn't due, Postgres short-circuits on the WHERE clause and writes
 * nothing. Safe to call on every authed request — current callers gate
 * it to the auth-middleware path so it runs roughly once per session.
 *
 * Returns the granted amount (string for numeric precision) or null
 * when no grant was made. The function intentionally does NOT insert a
 * row in the transactions table — those are reserved for real-money
 * Stripe events. Free monthly grants are surfaced as the implicit
 * starting/refresh balance, not as ledger entries.
 */
export async function grantFreeMonthlyIfDue(
  userId: string,
): Promise<string | null> {
  if (!userId) return null;
  try {
    const updated = await db
      .update(usersTable)
      .set({
        balance: sql`${FREE_TIER_MONTHLY_AMOUNT}::numeric`,
        freeMonthlyGrantAt: sql`now()`,
      })
      .where(
        sql`${usersTable.id} = ${userId}
          AND ${usersTable.plan} = 'Free'
          AND ${usersTable.balance} < ${FREE_TIER_MONTHLY_AMOUNT}::numeric
          AND (${usersTable.freeMonthlyGrantAt} IS NULL
               OR ${usersTable.freeMonthlyGrantAt} < now() - ${FREE_TIER_GRANT_INTERVAL_SQL})`,
      )
      .returning({ balance: usersTable.balance });

    if (updated.length > 0) {
      logger.info(
        { userId, newBalance: updated[0].balance },
        "granted Free-tier monthly credit",
      );
      return String(updated[0].balance);
    }
    return null;
  } catch (err) {
    // Never fail the auth flow because the grant attempt failed.
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), userId },
      "grantFreeMonthlyIfDue failed; ignoring",
    );
    return null;
  }
}

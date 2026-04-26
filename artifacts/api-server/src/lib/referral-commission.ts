/**
 * Platform-default referral commission percentage applied when a user
 * has no explicit `referralCommissionPct` override. Keep in sync with
 * the comment on `users.referralCommissionPct` in the DB schema.
 */
export const DEFAULT_REFERRAL_COMMISSION_PCT = 15;

export function resolveCommissionPct(override: number | null): number {
  return override ?? DEFAULT_REFERRAL_COMMISSION_PCT;
}

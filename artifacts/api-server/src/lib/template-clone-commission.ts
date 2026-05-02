/**
 * Platform-default template-clone commission percentage applied when
 * a template author has no explicit `templateAuthorCommissionPct`
 * override on their user row. Kept lower than
 * DEFAULT_REFERRAL_COMMISSION_PCT (15) on purpose: a clone is a
 * lighter-touch attribution than a direct invite, so the headline
 * cut is smaller. Tuneable per-author via the user override.
 *
 * Mirrors the pattern in `referral-commission.ts`.
 */
export const DEFAULT_TEMPLATE_CLONE_COMMISSION_PCT = 10;

export function resolveTemplateCloneCommissionPct(
  override: number | null,
): number {
  return override ?? DEFAULT_TEMPLATE_CLONE_COMMISSION_PCT;
}

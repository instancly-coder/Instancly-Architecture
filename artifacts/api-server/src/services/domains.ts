// Domain lifecycle helpers shared between the HTTP routes and the
// background polling job. Lifted out of `routes/domains.ts` so the cron
// path doesn't need to know about Express.
//
// Two responsibilities live here:
//   1. `refreshFromVercel` — pulls the latest domain + DNS state from
//      Vercel and writes it back to the row.
//   2. `notifyVerifiedTransitionIfNeeded` — when a refresh flips a row
//      to verified for the first time, fire off a transactional email
//      and stamp `verifiedNotifiedAt` so we never email twice.
//
// The notify step always stamps `verifiedNotifiedAt` after the first
// observed transition — even when the email actually failed (e.g. no
// API key, Resend 4xx). This is intentional: we'd rather drop a single
// notification than spam the user every poll cycle while the operator
// fixes their email config. The failure is logged loudly.

import { db, projectDomainsTable, projectsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  getDomainConfig,
  getProjectDomain,
  type VercelDomain,
  type VercelDomainConfig,
} from "../lib/vercel";
import {
  EmailNotConfiguredError,
  isEmailConfigured,
  renderDomainVerifiedEmail,
  sendEmail,
} from "../lib/email";

export type DomainRow = typeof projectDomainsTable.$inferSelect;

// Sync a single domain row from Vercel. Always swallows network errors
// so a transient Vercel hiccup doesn't bubble up — the row keeps its
// last-known state and the caller sees the cached values.
export async function refreshFromVercel(
  vercelProjectId: string,
  row: DomainRow,
): Promise<DomainRow> {
  let domain: VercelDomain | null = null;
  let config: VercelDomainConfig | null = null;
  try {
    domain = await getProjectDomain(vercelProjectId, row.host);
  } catch (err) {
    logger.warn(
      { err, host: row.host },
      "getProjectDomain failed; keeping cached state",
    );
  }
  try {
    config = await getDomainConfig(row.host);
  } catch (err) {
    logger.warn(
      { err, host: row.host },
      "getDomainConfig failed; keeping cached misconfigured flag",
    );
  }

  const verified = domain?.verified ?? row.verified;
  const verificationRecords = domain?.verification ?? row.verificationRecords;
  const misconfigured = config?.misconfigured ?? row.misconfigured;
  // Only overwrite the cached resolver values when we actually got a
  // fresh config back. A failed Vercel call shouldn't wipe the
  // last-known DNS state we'd otherwise show in the UI.
  const aValues = config ? config.aValues ?? null : row.aValues;
  const cnames = config ? config.cnames ?? null : row.cnames;
  const configuredBy = config
    ? config.configuredBy ?? null
    : row.configuredBy;

  const [updated] = await db
    .update(projectDomainsTable)
    .set({
      verified,
      verificationRecords: verificationRecords ?? null,
      misconfigured,
      aValues,
      cnames,
      configuredBy,
      lastCheckedAt: new Date(),
    })
    .where(eq(projectDomainsTable.id, row.id))
    .returning();
  return updated;
}

// If a verified domain exists, make sure projects.primaryCustomDomain
// reflects the user-marked primary (or the oldest verified one if none
// is marked yet). If no verified domains remain, clear the field so the
// navbar chip falls back to the auto-generated `*.vercel.app` URL.
export async function reconcilePrimary(projectId: string): Promise<void> {
  const rows = await db
    .select()
    .from(projectDomainsTable)
    .where(eq(projectDomainsTable.projectId, projectId))
    .orderBy(projectDomainsTable.createdAt);
  const verified = rows.filter((r) => r.verified);
  const primary = verified.find((r) => r.isPrimary) ?? verified[0] ?? null;
  await db
    .update(projectsTable)
    .set({ primaryCustomDomain: primary ? primary.host : null })
    .where(eq(projectsTable.id, projectId));
}

// Detect a `false → true` transition in the `verified` flag and, when
// the row hasn't been notified yet, send the "your domain is live"
// email. Returns the (possibly stamped) row so callers can use the
// updated value without re-querying.
//
// Caller passes `previous` (the row as it looked before refresh) and
// `current` (the row after refresh). Both come from the same DB.
export async function notifyVerifiedTransitionIfNeeded(
  previous: DomainRow,
  current: DomainRow,
): Promise<DomainRow> {
  // Only act on a real transition. Already-verified rows that predate
  // this column simply get their `verifiedNotifiedAt` left null forever
  // — by design, we don't backfill emails for old verifications.
  const justVerified = !previous.verified && current.verified;
  if (!justVerified) return current;
  if (current.verifiedNotifiedAt) return current;

  // Look up project + owner so we know who to email and what to call
  // the project. Bail (without stamping) if we can't resolve them — a
  // future poll will retry, and the cost of retrying a lookup is small.
  const rows = await db
    .select({
      projectSlug: projectsTable.slug,
      ownerEmail: usersTable.email,
      ownerDisplayName: usersTable.displayName,
      ownerUsername: usersTable.username,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(eq(projectsTable.id, current.projectId))
    .limit(1);
  const meta = rows[0];
  if (!meta) {
    logger.warn(
      { domainId: current.id, projectId: current.projectId },
      "domain verified but project/owner lookup empty; will retry next cycle",
    );
    return current;
  }

  const tmpl = renderDomainVerifiedEmail({
    recipientName: meta.ownerDisplayName || meta.ownerUsername,
    host: current.host,
    projectSlug: meta.projectSlug,
  });

  let sentOk = false;
  try {
    await sendEmail({
      to: meta.ownerEmail,
      subject: tmpl.subject,
      text: tmpl.text,
      html: tmpl.html,
    });
    sentOk = true;
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      // Operator hasn't wired Resend yet — log once per row and stamp
      // anyway so we don't email when the key is added later. The poll
      // still does its main job of updating verification state.
      logger.warn(
        { host: current.host, ownerEmail: meta.ownerEmail },
        "domain verified but RESEND_API_KEY is not set; skipping email",
      );
    } else {
      logger.error(
        { err, host: current.host, ownerEmail: meta.ownerEmail },
        "failed to send domain-verified email; will not retry",
      );
    }
  }

  // Stamp regardless of email outcome — see the file header for why.
  const [stamped] = await db
    .update(projectDomainsTable)
    .set({ verifiedNotifiedAt: new Date() })
    .where(eq(projectDomainsTable.id, current.id))
    .returning();

  if (sentOk) {
    logger.info(
      { host: current.host, projectId: current.projectId },
      "domain verified email delivered",
    );
  }
  return stamped ?? current;
}

// Convenience wrapper used by routes and the cron alike: refresh a row
// from Vercel and, if the refresh flipped it to verified for the first
// time, send the email. Returns the final row.
export async function refreshAndNotify(
  vercelProjectId: string,
  row: DomainRow,
): Promise<DomainRow> {
  const refreshed = await refreshFromVercel(vercelProjectId, row);
  return notifyVerifiedTransitionIfNeeded(row, refreshed);
}

export { isEmailConfigured };

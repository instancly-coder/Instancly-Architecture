// Background poller that walks all "pending" custom domains across the
// system and asks Vercel for the latest verification + DNS state. When a
// domain transitions to verified, the shared service module sends the
// "your domain is live" email.
//
// Why this exists: the Domains tab on the frontend already polls every
// 15s, but a user who adds a domain and then closes the tab gets no
// signal when verification eventually completes. This job closes that
// loop.
//
// Design notes:
//   * Single-flight: we keep an in-memory `running` flag so two ticks
//     can't overlap if a cycle runs long.
//   * Bounded concurrency (default 5) so a backlog doesn't fan out and
//     hammer the Vercel API.
//   * Only "pending" rows are polled (unverified OR misconfigured). A
//     verified, non-misconfigured row is in steady state and pulling
//     it every cycle would waste quota.
//   * Idempotent emails: the service module guards every send behind
//     `verifiedNotifiedAt`, so even a double-tick wouldn't double-send.
//   * Graceful when Vercel isn't configured: if `VERCEL_API_TOKEN` is
//     missing the job logs once on start and then no-ops every cycle.

import { db, projectDomainsTable, projectsTable } from "@workspace/db";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  reconcilePrimary,
  refreshAndNotify,
  type DomainRow,
} from "../services/domains";

// Defaults chosen to feel snappy without burning quota: every 3
// minutes, with a small 0–30s startup jitter so multiple instances
// (if we ever scale out) don't all fire at the exact same wall clock.
const DEFAULT_INTERVAL_MS = 3 * 60 * 1000;
const DEFAULT_CONCURRENCY = 5;

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startDomainPoller(): void {
  if (intervalHandle) {
    logger.warn("domain poller already started; ignoring second start");
    return;
  }
  if (!process.env.VERCEL_API_TOKEN) {
    logger.warn(
      "VERCEL_API_TOKEN not set; domain poller will not start",
    );
    return;
  }

  const intervalMs = positiveIntFromEnv(
    "DOMAIN_POLL_INTERVAL_MS",
    DEFAULT_INTERVAL_MS,
  );
  const concurrency = positiveIntFromEnv(
    "DOMAIN_POLL_CONCURRENCY",
    DEFAULT_CONCURRENCY,
  );

  logger.info(
    { intervalMs, concurrency },
    "domain poller starting",
  );

  // Stagger the first run so a fresh deploy doesn't immediately hit
  // Vercel before the rest of the server is warmed up.
  const startupDelay = Math.floor(Math.random() * 30_000);
  setTimeout(() => {
    void runPollCycle(concurrency);
    intervalHandle = setInterval(() => {
      void runPollCycle(concurrency);
    }, intervalMs);
    // Allow a clean shutdown to drop the handle.
    if (intervalHandle.unref) intervalHandle.unref();
  }, startupDelay);
}

export function stopDomainPoller(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

// Exported so it can be triggered manually from a one-off script if
// needed (e.g. a /admin/poll-domains route in the future).
export async function runPollCycle(concurrency: number): Promise<void> {
  if (running) {
    logger.debug("domain poll cycle skipped: previous cycle still running");
    return;
  }
  running = true;
  const startedAt = Date.now();
  try {
    const pending = await loadPendingDomains();
    if (pending.length === 0) {
      logger.debug("domain poll cycle: no pending domains");
      return;
    }
    logger.info(
      { count: pending.length },
      "domain poll cycle: refreshing pending domains",
    );

    let processed = 0;
    let transitioned = 0;
    // Track which projects had a row flip to verified so we can call
    // `reconcilePrimary` exactly once per project at the end of the
    // cycle. Otherwise `projects.primaryCustomDomain` stays stale until
    // the user happens to load the Domains tab and the route handler
    // does it for us.
    const projectsToReconcile = new Set<string>();
    await runWithConcurrency(pending, concurrency, async (entry) => {
      try {
        const before = entry.row;
        const after = await refreshAndNotify(entry.vercelProjectId, before);
        processed++;
        if (!before.verified && after.verified) {
          transitioned++;
          projectsToReconcile.add(after.projectId);
        }
      } catch (err) {
        // refreshAndNotify itself swallows Vercel errors; getting here
        // means a DB problem or template bug. Log and keep going so one
        // bad row doesn't kill the cycle.
        logger.error(
          { err, host: entry.row.host },
          "domain poll: failed to refresh row",
        );
      }
    });

    for (const projectId of projectsToReconcile) {
      try {
        await reconcilePrimary(projectId);
      } catch (err) {
        logger.error(
          { err, projectId },
          "domain poll: reconcilePrimary failed; primaryCustomDomain may be stale",
        );
      }
    }

    logger.info(
      {
        processed,
        transitioned,
        reconciled: projectsToReconcile.size,
        durationMs: Date.now() - startedAt,
      },
      "domain poll cycle complete",
    );
  } catch (err) {
    logger.error({ err }, "domain poll cycle crashed");
  } finally {
    running = false;
  }
}

type PendingEntry = { row: DomainRow; vercelProjectId: string };

// Pull every domain that's still in flight (unverified or misconfigured)
// AND belongs to a project that actually has a Vercel project to query.
// We join through projects so we can carry the vercelProjectId without a
// second round trip per row.
async function loadPendingDomains(): Promise<PendingEntry[]> {
  const rows = await db
    .select({
      row: projectDomainsTable,
      vercelProjectId: projectsTable.vercelProjectId,
    })
    .from(projectDomainsTable)
    .innerJoin(
      projectsTable,
      eq(projectsTable.id, projectDomainsTable.projectId),
    )
    .where(
      and(
        isNotNull(projectsTable.vercelProjectId),
        or(
          eq(projectDomainsTable.verified, false),
          eq(projectDomainsTable.misconfigured, true),
        ),
      ),
    );
  // Drizzle's type for the joined column is `string | null` even with
  // `isNotNull` in the WHERE; narrow it explicitly so downstream code
  // doesn't need the !.
  const out: PendingEntry[] = [];
  for (const r of rows) {
    if (r.vercelProjectId) {
      out.push({ row: r.row, vercelProjectId: r.vercelProjectId });
    }
  }
  return out;
}

// Tiny worker-pool: starts up to N parallel workers that pull from a
// shared queue. Avoids `Promise.all(map(...))` blowing up the API when
// there are dozens of pending rows.
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = items.slice();
  const n = Math.max(1, Math.min(concurrency, queue.length));
  const workers: Promise<void>[] = [];
  for (let i = 0; i < n; i++) {
    workers.push(
      (async () => {
        for (;;) {
          const item = queue.shift();
          if (item === undefined) return;
          await worker(item);
        }
      })(),
    );
  }
  await Promise.all(workers);
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    logger.warn({ name, raw }, "invalid env value; using default");
    return fallback;
  }
  return Math.floor(n);
}

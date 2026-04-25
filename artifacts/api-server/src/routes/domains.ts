import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  projectsTable,
  usersTable,
  projectDomainsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, getAuthedUser } from "../middlewares/auth";
import { logger } from "../lib/logger";
import {
  addProjectDomain,
  getProjectDomain,
  verifyProjectDomain,
  removeProjectDomain,
  getDomainConfig,
  VercelApiError,
  type VercelDomain,
  type VercelDomainConfig,
} from "../lib/vercel";

const router: IRouter = Router();

// RFC-1123 hostname check, conservative. Lowercased and trimmed before this
// runs. We additionally require at least one dot so a typo like "localhost"
// or a bare slug never reaches the Vercel API.
const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
function isValidHost(h: string): boolean {
  return HOST_RE.test(h);
}

// Trim and lowercase. Drop any leading scheme/path the user might paste so
// `https://app.example.com/` and `app.example.com` are treated identically.
function normalizeHost(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0];
  if (!isValidHost(s)) return null;
  return s;
}

async function findProjectWithOwner(username: string, slug: string) {
  const rows = await db
    .select({
      project: projectsTable,
      ownerId: usersTable.id,
      ownerPlan: usersTable.plan,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
    .limit(1);
  return rows[0] ?? null;
}

// Cheap derivation so the UI can render a sensible CNAME hint immediately
// after the user adds the domain — before the first config refresh comes
// back from Vercel. Vercel's recommended target for non-apex hostnames is
// `cname.vercel-dns.com`; for apex (e.g. `example.com`) we point users at
// the official A record `76.76.21.21`.
function suggestedDnsRecords(host: string): Array<{
  type: "CNAME" | "A";
  name: string;
  value: string;
}> {
  const labels = host.split(".");
  const isApex = labels.length === 2;
  if (isApex) {
    return [{ type: "A", name: "@", value: "76.76.21.21" }];
  }
  // For "app.example.com" the user usually creates a CNAME on the
  // sub-record (`app`) — surfaced as the leftmost label.
  return [{ type: "CNAME", name: labels[0], value: "cname.vercel-dns.com" }];
}

// Shape the DB row + Vercel state into the JSON the frontend renders.
type DomainResponse = {
  id: string;
  host: string;
  verified: boolean;
  isPrimary: boolean;
  misconfigured: boolean;
  verificationRecords: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
  suggestedRecords: Array<{ type: "CNAME" | "A"; name: string; value: string }>;
  createdAt: string;
  lastCheckedAt: string | null;
};

function toResponse(row: typeof projectDomainsTable.$inferSelect): DomainResponse {
  return {
    id: row.id,
    host: row.host,
    verified: row.verified,
    isPrimary: row.isPrimary,
    misconfigured: row.misconfigured,
    verificationRecords: row.verificationRecords ?? [],
    suggestedRecords: suggestedDnsRecords(row.host),
    createdAt: row.createdAt.toISOString(),
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
  };
}

// Sync a single domain row from Vercel. Always swallows network errors so
// a transient Vercel hiccup doesn't 500 a list/refresh — the row keeps its
// last-known state and the UI shows it.
async function refreshFromVercel(
  vercelProjectId: string,
  row: typeof projectDomainsTable.$inferSelect,
): Promise<typeof projectDomainsTable.$inferSelect> {
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

  const [updated] = await db
    .update(projectDomainsTable)
    .set({
      verified,
      verificationRecords: verificationRecords ?? null,
      misconfigured,
      lastCheckedAt: new Date(),
    })
    .where(eq(projectDomainsTable.id, row.id))
    .returning();
  return updated;
}

// If a verified domain exists, make sure projects.primaryCustomDomain
// reflects the user-marked primary (or the oldest verified one if none is
// marked yet). If no verified domains remain, clear the field so the
// navbar chip falls back to the auto-generated `*.vercel.app` URL.
//
// Order by createdAt ASC so the fallback choice is deterministic — without
// this, two verified domains could swap places between requests depending
// on storage layout.
async function reconcilePrimary(projectId: string): Promise<void> {
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

// ---------- GET list ----------
router.get(
  "/projects/:username/:slug/domains",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const row = await findProjectWithOwner(username, slug);
    if (!row) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== row.ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }

    const rows = await db
      .select()
      .from(projectDomainsTable)
      .where(eq(projectDomainsTable.projectId, row.project.id))
      .orderBy(projectDomainsTable.createdAt);

    // Refresh any rows that aren't fully healthy from Vercel so the polling
    // loop on the client actually flips a "Pending DNS" row to "Active"
    // without the user having to click the Refresh button. We only re-check
    // unverified or misconfigured rows to keep the request fast and avoid
    // burning Vercel quota on already-stable domains.
    if (row.project.vercelProjectId) {
      const stale = rows.filter((r) => !r.verified || r.misconfigured);
      if (stale.length > 0) {
        const refreshed = await Promise.all(
          stale.map((r) => refreshFromVercel(row.project.vercelProjectId!, r)),
        );
        // Re-merge the refreshed rows back into the original ordering. We
        // mutate a copy rather than the array we're iterating to keep it
        // simple.
        const byId = new Map(refreshed.map((r) => [r.id, r]));
        for (let i = 0; i < rows.length; i++) {
          const updated = byId.get(rows[i].id);
          if (updated) rows[i] = updated;
        }
        // If any of those refreshes flipped a row to verified, the project's
        // primary may need to update too.
        await reconcilePrimary(row.project.id);
      }
    }

    res.json(rows.map(toResponse));
  },
);

// ---------- POST add ----------
router.post(
  "/projects/:username/:slug/domains",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const row = await findProjectWithOwner(username, slug);
    if (!row) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== row.ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }

    // Pro-only: same gate as publishing. Free plans get the same shape so
    // the UI can show an upgrade prompt instead of a generic error.
    const planLower = (row.ownerPlan ?? "Free").toLowerCase();
    if (planLower === "free") {
      res.status(402).json({
        status: "error",
        message: "Custom domains are a Pro plan feature.",
        requiresUpgrade: true,
      });
      return;
    }

    // Vercel's domain endpoints take a project id. If the user hasn't
    // published yet there's no project to attach the domain to — bail
    // early with a clear message rather than calling Vercel and getting
    // a confusing 404.
    if (!row.project.vercelProjectId) {
      res.status(409).json({
        status: "error",
        message: "Publish your app first, then add a custom domain.",
      });
      return;
    }

    if (!process.env.VERCEL_API_TOKEN) {
      res.status(503).json({
        status: "error",
        message: "Custom domains are not configured on this server.",
      });
      return;
    }

    const host = normalizeHost((req.body as { host?: unknown } | null)?.host);
    if (!host) {
      res.status(400).json({
        status: "error",
        message: "Enter a valid domain like app.example.com",
      });
      return;
    }

    // Block obvious foot-guns — our own root domain shouldn't be added as
    // a "custom" domain. (subdomains under `*.deploybro.app` are also
    // blocked since those are reserved for our auto-generated URLs.)
    if (host === "deploybro.app" || host.endsWith(".deploybro.app")) {
      res.status(400).json({
        status: "error",
        message: "That hostname is reserved.",
      });
      return;
    }

    const existing = await db
      .select()
      .from(projectDomainsTable)
      .where(
        and(
          eq(projectDomainsTable.projectId, row.project.id),
          eq(projectDomainsTable.host, host),
        ),
      )
      .limit(1);
    if (existing[0]) {
      res.status(409).json({
        status: "error",
        message: "That domain is already on this project.",
      });
      return;
    }

    let vercelDomain: VercelDomain;
    try {
      vercelDomain = await addProjectDomain(row.project.vercelProjectId, host);
    } catch (err) {
      if (err instanceof VercelApiError) {
        // 409 from Vercel = domain belongs to another project (possibly
        // owned by another user). 400/403 typically mean a malformed name
        // or a reserved zone (e.g. `vercel.app`). Surface a friendly
        // message rather than the raw bodyExcerpt.
        if (err.status === 409) {
          res.status(409).json({
            status: "error",
            message:
              "That domain is already attached to another project. Remove it from the other project first.",
          });
          return;
        }
        if (err.status === 400 || err.status === 403) {
          res.status(400).json({
            status: "error",
            message:
              "Vercel rejected that domain. Double-check spelling and that it's not on a reserved zone.",
          });
          return;
        }
      }
      logger.error({ err, host }, "addProjectDomain failed");
      res.status(502).json({
        status: "error",
        message: "Could not reach Vercel to add this domain. Try again.",
      });
      return;
    }

    // Best-effort initial config fetch so the response carries a
    // misconfigured hint up front. Failure is fine — the row is created
    // either way and the UI re-fetches on the next refresh.
    let initialConfig: VercelDomainConfig | null = null;
    try {
      initialConfig = await getDomainConfig(host);
    } catch (err) {
      logger.warn({ err, host }, "Initial getDomainConfig failed (non-fatal)");
    }

    const [created] = await db
      .insert(projectDomainsTable)
      .values({
        projectId: row.project.id,
        host,
        verified: vercelDomain.verified,
        verificationRecords: vercelDomain.verification ?? null,
        misconfigured: initialConfig?.misconfigured ?? false,
        lastCheckedAt: new Date(),
        // First-added domain that lands verified becomes primary
        // automatically. Otherwise the user can promote one later.
        isPrimary: false,
      })
      .returning();

    await reconcilePrimary(row.project.id);

    res.status(201).json(toResponse(created));
  },
);

// ---------- POST verify (refresh status) ----------
router.post(
  "/projects/:username/:slug/domains/:host/verify",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const host = String(req.params.host).toLowerCase();
    const row = await findProjectWithOwner(username, slug);
    if (!row) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== row.ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }
    if (!row.project.vercelProjectId) {
      res.status(409).json({
        status: "error",
        message: "Project has no Vercel deployment.",
      });
      return;
    }

    const existing = (
      await db
        .select()
        .from(projectDomainsTable)
        .where(
          and(
            eq(projectDomainsTable.projectId, row.project.id),
            eq(projectDomainsTable.host, host),
          ),
        )
        .limit(1)
    )[0];
    if (!existing) {
      res.status(404).json({ status: "error", message: "Domain not found" });
      return;
    }

    // POST /verify asks Vercel to re-check the TXT records. If the records
    // aren't there yet Vercel returns 400; we still want to GET the latest
    // state so misconfigured/dns hints stay fresh.
    try {
      await verifyProjectDomain(row.project.vercelProjectId, host);
    } catch (err) {
      if (err instanceof VercelApiError && err.status !== 400) {
        logger.warn({ err, host }, "verifyProjectDomain failed (non-400)");
      }
    }
    const refreshed = await refreshFromVercel(
      row.project.vercelProjectId,
      existing,
    );
    await reconcilePrimary(row.project.id);
    res.json(toResponse(refreshed));
  },
);

// ---------- POST set primary ----------
router.post(
  "/projects/:username/:slug/domains/:host/primary",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const host = String(req.params.host).toLowerCase();
    const row = await findProjectWithOwner(username, slug);
    if (!row) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== row.ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }
    const target = (
      await db
        .select()
        .from(projectDomainsTable)
        .where(
          and(
            eq(projectDomainsTable.projectId, row.project.id),
            eq(projectDomainsTable.host, host),
          ),
        )
        .limit(1)
    )[0];
    if (!target) {
      res.status(404).json({ status: "error", message: "Domain not found" });
      return;
    }
    if (!target.verified) {
      res.status(409).json({
        status: "error",
        message: "Verify the domain before making it primary.",
      });
      return;
    }
    // Single-statement reset + set is fine — there's at most a handful of
    // rows per project and they're all owned by the same user.
    await db.transaction(async (tx) => {
      await tx
        .update(projectDomainsTable)
        .set({ isPrimary: false })
        .where(eq(projectDomainsTable.projectId, row.project.id));
      await tx
        .update(projectDomainsTable)
        .set({ isPrimary: true })
        .where(eq(projectDomainsTable.id, target.id));
    });
    await reconcilePrimary(row.project.id);
    res.json({ status: "ok" });
  },
);

// ---------- DELETE ----------
router.delete(
  "/projects/:username/:slug/domains/:host",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const host = String(req.params.host).toLowerCase();
    const row = await findProjectWithOwner(username, slug);
    if (!row) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== row.ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }
    const target = (
      await db
        .select()
        .from(projectDomainsTable)
        .where(
          and(
            eq(projectDomainsTable.projectId, row.project.id),
            eq(projectDomainsTable.host, host),
          ),
        )
        .limit(1)
    )[0];
    if (!target) {
      // Idempotent: nothing to delete is success.
      res.status(204).end();
      return;
    }

    if (row.project.vercelProjectId) {
      try {
        await removeProjectDomain(row.project.vercelProjectId, host);
      } catch (err) {
        logger.warn(
          { err, host },
          "removeProjectDomain failed; deleting local row anyway",
        );
      }
    }
    await db
      .delete(projectDomainsTable)
      .where(eq(projectDomainsTable.id, target.id));
    await reconcilePrimary(row.project.id);
    res.status(204).end();
  },
);

export default router;

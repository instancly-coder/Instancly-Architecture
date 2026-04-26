import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc, sql, max } from "drizzle-orm";
import pg from "pg";
import {
  db,
  usersTable,
  projectsTable,
  buildsTable,
} from "@workspace/db";
import {
  GetProjectResponse,
  ListProjectBuildsResponse,
  CreateProjectBuildResponse,
} from "@workspace/api-zod";
import { requireAuth, getAuthedUser } from "../middlewares/auth";
import { decryptSecret, encryptSecret } from "../lib/secret-cipher";
import { provisionAppDatabase, parentProjectId } from "../lib/neon";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function loadProject(username: string, slug: string) {
  const rows = await db
    .select({ project: projectsTable, user: usersTable })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
    .limit(1);
  return rows[0];
}

router.get("/projects/:username/:slug", async (req: Request, res: Response): Promise<void> => {
  const row = await loadProject(String(req.params.username), String(req.params.slug));
  if (!row) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  const { project, user } = row;

  const [counts] = await db
    .select({
      builds: sql<number>`count(*)`,
      lastBuild: max(buildsTable.createdAt),
    })
    .from(buildsTable)
    .where(eq(buildsTable.projectId, project.id));

  res.json(
    GetProjectResponse.parse({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      framework: project.framework,
      status: project.status,
      isPublic: project.isPublic,
      isFeaturedTemplate: project.isFeaturedTemplate,
      features: project.features ?? [],
      coverImageUrl: project.coverImageUrl,
      clones: project.clones,
      createdAt: project.createdAt.toISOString(),
      lastBuiltAt: project.lastBuiltAt.toISOString(),
      owner: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      buildsCount: Number(counts?.builds ?? 0),
      lastBuildAt: counts?.lastBuild ? counts.lastBuild.toISOString() : null,
    }),
  );
});

// Owner-gated update for the public listing fields. Only fields explicitly
// present on the body are touched — partial updates are intentional so the
// SettingsPane can post just `{ isPublic: false }` without nulling out the
// description, etc. The admin-only `isFeaturedTemplate` flag is NOT
// settable here; it lives on PATCH /admin/projects/:id/feature-template.
router.patch(
  "/projects/:username/:slug",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const auth = getAuthedUser(req);
    if (!auth) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const row = await loadProject(username, slug);
    if (!row) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    if (row.user.id !== auth.id) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim().slice(0, 80);
      if (trimmed.length === 0) {
        res.status(400).json({ status: "error", message: "name cannot be empty" });
        return;
      }
      updates.name = trimmed;
    }
    if (typeof body.description === "string") {
      updates.description = body.description.slice(0, 600);
    }
    if (typeof body.framework === "string") {
      updates.framework = body.framework.slice(0, 60);
    }
    if (typeof body.isPublic === "boolean") {
      updates.isPublic = body.isPublic;
    }
    if (Array.isArray(body.features)) {
      updates.features = (body.features as unknown[])
        .filter((f): f is string => typeof f === "string")
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
        .slice(0, 12);
    }
    if (typeof body.coverImageUrl === "string" || body.coverImageUrl === null) {
      const v =
        typeof body.coverImageUrl === "string"
          ? body.coverImageUrl.trim()
          : null;
      updates.coverImageUrl = v && v.length > 0 ? v.slice(0, 500) : null;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(projectsTable)
        .set(updates)
        .where(eq(projectsTable.id, row.project.id));
    }

    const refreshed = await loadProject(username, slug);
    if (!refreshed) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const { project: p, user: u } = refreshed;

    const [counts] = await db
      .select({
        builds: sql<number>`count(*)`,
        lastBuild: max(buildsTable.createdAt),
      })
      .from(buildsTable)
      .where(eq(buildsTable.projectId, p.id));

    res.json(
      GetProjectResponse.parse({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        framework: p.framework,
        status: p.status,
        isPublic: p.isPublic,
        isFeaturedTemplate: p.isFeaturedTemplate,
        features: p.features ?? [],
        coverImageUrl: p.coverImageUrl,
        clones: p.clones,
        createdAt: p.createdAt.toISOString(),
        lastBuiltAt: p.lastBuiltAt.toISOString(),
        owner: {
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
        },
        buildsCount: Number(counts?.builds ?? 0),
        lastBuildAt: counts?.lastBuild ? counts.lastBuild.toISOString() : null,
      }),
    );
  },
);

router.get("/projects/:username/:slug/builds", async (req: Request, res: Response): Promise<void> => {
  const row = await loadProject(String(req.params.username), String(req.params.slug));
  if (!row) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }

  const builds = await db
    .select()
    .from(buildsTable)
    .where(eq(buildsTable.projectId, row.project.id))
    .orderBy(desc(buildsTable.number));

  res.json(
    ListProjectBuildsResponse.parse(
      builds.map((b) => ({
        ...b,
        cost: Number(b.cost),
        createdAt: b.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/projects/:username/:slug/builds", async (req: Request, res: Response): Promise<void> => {
  const row = await loadProject(String(req.params.username), String(req.params.slug));
  if (!row) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  const { prompt, model = "Claude Sonnet 4.5" } = req.body ?? {};
  if (!prompt) {
    res.status(400).json({ status: "error", message: "prompt required" });
    return;
  }

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${buildsTable.number}), 0) + 1` })
    .from(buildsTable)
    .where(eq(buildsTable.projectId, row.project.id));

  const cost = (Math.random() * 0.08 + 0.01).toFixed(4);
  const duration = Math.floor(Math.random() * 200) + 30;

  const [created] = await db
    .insert(buildsTable)
    .values({
      projectId: row.project.id,
      number: Number(next),
      prompt,
      aiMessage: `Working on it — ${prompt}`,
      model,
      cost,
      durationSec: duration,
      filesChanged: Math.floor(Math.random() * 10) + 1,
      tokensIn: Math.floor(Math.random() * 20000) + 2000,
      tokensOut: Math.floor(Math.random() * 8000) + 800,
    })
    .returning();

  await db
    .update(projectsTable)
    .set({ lastBuiltAt: new Date() })
    .where(eq(projectsTable.id, row.project.id));

  res.status(201).json(
    CreateProjectBuildResponse.parse({
      ...created,
      cost: Number(created.cost),
      createdAt: created.createdAt.toISOString(),
    }),
  );
});

/* ------------------------- Per-project database ------------------------- */
//
// These endpoints are scoped to ONE user-app's Postgres (a Neon branch
// provisioned on demand), not the platform's central control DB. The
// builder's "Database" tab calls them so each project sees its own
// schema and rows in isolation.
//
// We open a transient `pg.Client` per request rather than pooling — the
// builder makes a handful of calls per visit and pooling per-project would
// require a registry that has to handle revoked credentials, branch
// deletion, etc. The 10s timeout prevents a slow Neon cold-start from
// hanging the request indefinitely.

const PROJECT_DB_QUERY_TIMEOUT_MS = 10_000;

async function loadOwnedProject(
  req: Request,
  res: Response,
): Promise<{ project: typeof projectsTable.$inferSelect } | null> {
  const auth = getAuthedUser(req);
  if (!auth) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return null;
  }
  const row = await loadProject(
    String(req.params.username),
    String(req.params.slug),
  );
  if (!row) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return null;
  }
  if (row.user.id !== auth.id) {
    // Don't disclose existence to non-owners.
    res.status(404).json({ status: "error", message: "Project not found" });
    return null;
  }
  return { project: row.project };
}

function maskedConnectionString(uri: string): string {
  try {
    const u = new URL(uri);
    return `postgres://${u.username}:••••••••@${u.hostname}${u.pathname}`;
  } catch {
    return "(invalid connection string)";
  }
}

async function withProjectClient<T>(
  uri: string,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({
    connectionString: uri,
    ssl: /neon\.tech/i.test(uri) ? { rejectUnauthorized: false } : undefined,
    statement_timeout: PROJECT_DB_QUERY_TIMEOUT_MS,
    query_timeout: PROJECT_DB_QUERY_TIMEOUT_MS,
    connectionTimeoutMillis: PROJECT_DB_QUERY_TIMEOUT_MS,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

router.get(
  "/projects/:username/:slug/db/info",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwnedProject(req, res);
    if (!owned) return;
    const { project } = owned;

    if (!project.databaseUrl) {
      res.json({ provisioned: false });
      return;
    }

    let plain: string;
    try {
      plain = decryptSecret(project.databaseUrl);
    } catch (err) {
      logger.warn({ err, projectId: project.id }, "Could not decrypt project DATABASE_URL");
      res.status(500).json({
        status: "error",
        message: "Stored database credential is corrupt — please re-create the database.",
      });
      return;
    }

    try {
      const info = await withProjectClient(plain, async (client) => {
        const r = await client.query<{
          database: string;
          version: string;
          size: string;
          host: string;
        }>(
          `select current_database() as database,
                  version() as version,
                  pg_size_pretty(pg_database_size(current_database())) as size,
                  inet_server_addr()::text as host`,
        );
        return r.rows[0];
      });
      let host = info?.host ?? "";
      try {
        host = new URL(plain).hostname;
      } catch {
        /* keep inet host */
      }
      res.json({
        provisioned: true,
        provider: "neon",
        host,
        database: info?.database ?? "",
        size: info?.size ?? "",
        version: info?.version ?? "",
        connectionString: maskedConnectionString(plain),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err, projectId: project.id }, "Project DB info query failed");
      res.status(502).json({ status: "error", message });
    }
  },
);

router.get(
  "/projects/:username/:slug/db/tables",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwnedProject(req, res);
    if (!owned) return;
    const { project } = owned;

    if (!project.databaseUrl) {
      res.json({ provisioned: false, tables: [] });
      return;
    }

    let plain: string;
    try {
      plain = decryptSecret(project.databaseUrl);
    } catch {
      res.status(500).json({
        status: "error",
        message: "Stored database credential is corrupt — please re-create the database.",
      });
      return;
    }

    try {
      const tables = await withProjectClient(plain, async (client) => {
        const r = await client.query<{
          schema: string;
          name: string;
          rows: string;
          size: string;
          last_change: string | null;
        }>(
          `select n.nspname as schema,
                  c.relname as name,
                  c.reltuples::bigint::text as rows,
                  pg_size_pretty(pg_total_relation_size(c.oid)) as size,
                  to_char(greatest(s.last_autoanalyze, s.last_analyze), 'YYYY-MM-DD"T"HH24:MI:SSOF') as last_change
             from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
             left join pg_stat_user_tables s on s.relid = c.oid
            where c.relkind = 'r'
              and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
            order by n.nspname, c.relname`,
        );
        return r.rows.map((row) => ({
          schema: row.schema,
          name: row.name,
          rows: Number(row.rows ?? 0),
          exact: false,
          size: row.size,
          lastChange: row.last_change,
        }));
      });
      res.json({ provisioned: true, tables });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err, projectId: project.id }, "Project DB tables query failed");
      res.status(502).json({ status: "error", message });
    }
  },
);

router.post(
  "/projects/:username/:slug/db/provision",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwnedProject(req, res);
    if (!owned) return;
    const { project } = owned;

    // Idempotency check: a stored databaseUrl that still decrypts cleanly
    // is treated as already-provisioned (double-click safe). A stored
    // databaseUrl that FAILS to decrypt (corrupt blob, key rotated, etc.)
    // would otherwise leave the user stranded — `/db/info` and the publish
    // flow both refuse to use it. We treat this as a recovery path: clear
    // the stale fields and provision fresh below. The orphaned Neon
    // branch is left in place (no API key needed to re-create here, and
    // we'd need to call Neon to delete it); operators can sweep these
    // separately via the Neon console.
    if (project.databaseUrl) {
      try {
        decryptSecret(project.databaseUrl);
        res.json({ provisioned: true, alreadyProvisioned: true });
        return;
      } catch (err) {
        logger.warn(
          { err, projectId: project.id },
          "Stored DATABASE_URL is corrupt — re-provisioning a fresh branch",
        );
      }
    }

    try {
      const provisioned = await provisionAppDatabase(
        `${String(req.params.slug)}-${String(req.params.username)}`,
      );
      await db
        .update(projectsTable)
        .set({
          databaseUrl: encryptSecret(provisioned.connectionUri),
          neonBranchId: provisioned.branchId,
          neonRoleName: provisioned.roleName,
          neonProjectId: parentProjectId(),
        })
        .where(eq(projectsTable.id, project.id));
      res.json({ provisioned: true, alreadyProvisioned: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { err, projectId: project.id },
        "Project DB provision failed",
      );
      res.status(502).json({
        status: "error",
        message: message.slice(0, 400),
      });
    }
  },
);

export default router;

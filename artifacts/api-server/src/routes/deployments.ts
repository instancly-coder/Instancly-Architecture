import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  projectsTable,
  usersTable,
  projectFilesTable,
  deploymentsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAuth, getAuthedUser } from "../middlewares/auth";
import { logger } from "../lib/logger";
import {
  getOrCreateProject,
  upsertEnvVar,
  createDeployment,
  getDeployment,
  projectNameFor,
  deleteProject as vercelDeleteProject,
  cancelDeployment as vercelCancelDeployment,
  type VercelDeployment,
} from "../lib/vercel";
import { provisionAppDatabase, deleteBranch as neonDeleteBranch } from "../lib/neon";
import {
  buildVercelPayload,
  PayloadTooLargeError,
  type ProjectFileLite,
} from "../lib/deploy-payload";
import { encryptSecret, decryptSecret } from "../lib/secret-cipher";

const router: IRouter = Router();

// How long to poll Vercel for a terminal status before we give up. Vercel
// builds for small Vite apps complete in under a minute, but we leave a
// generous ceiling so larger projects don't false-fail.
const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_MS = 10 * 60_000;

// Sanitize an error so we never leak internals (stack traces, tokens) to the
// client while still giving the user something actionable.
function userFacingError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = String((err as { message: unknown }).message);
    return m.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 400);
  }
  return "Deployment failed";
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

// In-process pipeline. Runs after the HTTP response has already gone back
// to the client; status is communicated exclusively through the deployments
// row that the frontend polls.
async function runPublishPipeline(args: {
  deploymentId: string;
  projectId: string;
  username: string;
  slug: string;
}): Promise<void> {
  const { deploymentId, projectId, username, slug } = args;

  const setStatus = async (
    status: string,
    extras: Partial<typeof deploymentsTable.$inferInsert> = {},
  ) => {
    await db
      .update(deploymentsTable)
      .set({ status, ...extras })
      .where(eq(deploymentsTable.id, deploymentId));
  };

  // Track which cloud resources we created in *this* run so the failure
  // path can clean them up without touching pre-existing reusable state.
  const createdInThisRun: {
    neonBranchId: string | null;
    vercelProjectName: string | null;
    vercelDeploymentId: string | null;
  } = {
    neonBranchId: null,
    vercelProjectName: null,
    vercelDeploymentId: null,
  };

  try {
    // ---------- 1. Reload current project state ----------
    const project = (
      await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId))
        .limit(1)
    )[0];
    if (!project) throw new Error("Project disappeared mid-publish");

    // ---------- 1b. Pre-flight: load files and validate the payload ----------
    // We build the payload up front (before any cloud provisioning) so that
    // binary-file or oversized-project rejections fail fast with a clear
    // error and don't leave orphaned Neon branches or Vercel projects behind.
    // The result is reused at step 5 — buildVercelPayload is pure.
    await setStatus("validating");
    const fileRows = await db
      .select({
        path: projectFilesTable.path,
        content: projectFilesTable.content,
        // Tells buildVercelPayload whether `content` is raw source or
        // already base64-encoded binary so it can pass-through instead
        // of double-encoding (which would corrupt images/fonts/etc.).
        encoding: projectFilesTable.encoding,
      })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, projectId));
    if (fileRows.length === 0) {
      throw new Error("Project has no files to deploy yet — run a build first");
    }
    // The DB column is plain `text` so Drizzle types `encoding` as
    // `string`. Narrow it here against the two values the schema's
    // CHECK / app code can actually produce — anything else is a bug
    // we'd want to surface immediately rather than silently mis-route
    // through buildVercelPayload's text path.
    const typedFiles: ProjectFileLite[] = fileRows.map((r) => {
      const enc = r.encoding === "base64" ? "base64" : "utf8";
      return { path: r.path, content: r.content, encoding: enc };
    });
    const payload = buildVercelPayload(typedFiles);

    // ---------- 2. Provision (or reuse) the Neon database ----------
    // `databaseUrl` is encrypted-at-rest. If a prior publish stored one we
    // decrypt for the in-memory pipeline; otherwise we provision fresh and
    // store the new ciphertext.
    let plainDatabaseUrl: string | null = null;
    let neonBranchId = project.neonBranchId;
    let neonRoleName = project.neonRoleName;
    let neonProjectId = project.neonProjectId;

    if (project.databaseUrl) {
      try {
        plainDatabaseUrl = decryptSecret(project.databaseUrl);
      } catch (decErr) {
        // Stored value is corrupt or was written under a different key —
        // fall through to re-provisioning below. Log so an operator notices.
        logger.warn({ decErr, projectId }, "Could not decrypt stored DATABASE_URL; re-provisioning");
        plainDatabaseUrl = null;
        neonBranchId = null;
      }
    }

    if (!plainDatabaseUrl || !neonBranchId) {
      await setStatus("provisioning_db");
      const provisioned = await provisionAppDatabase(`${slug}-${username}`);
      plainDatabaseUrl = provisioned.connectionUri;
      neonBranchId = provisioned.branchId;
      neonRoleName = provisioned.roleName;
      neonProjectId = process.env.NEON_PARENT_PROJECT_ID ?? null;
      createdInThisRun.neonBranchId = neonBranchId;
      await db
        .update(projectsTable)
        .set({
          databaseUrl: encryptSecret(plainDatabaseUrl),
          neonBranchId,
          neonRoleName,
          neonProjectId,
          publishStatus: "provisioning",
        })
        .where(eq(projectsTable.id, projectId));
    }

    // ---------- 3. Get or create the Vercel project ----------
    await setStatus("creating_project");
    await db
      .update(projectsTable)
      .set({ publishStatus: "creating_project" })
      .where(eq(projectsTable.id, projectId));
    const projectName = projectNameFor(username, slug);
    const hadVercelProject = !!project.vercelProjectId;
    const vercelProject = await getOrCreateProject(projectName);
    if (!hadVercelProject) {
      createdInThisRun.vercelProjectName = projectName;
    }

    // ---------- 4. Push DATABASE_URL into the Vercel env ----------
    await upsertEnvVar(vercelProject.id, "DATABASE_URL", plainDatabaseUrl);

    // ---------- 5. Create the deployment ----------
    // `payload` was already built and validated in step 1b.
    await setStatus("deploying");
    await db
      .update(projectsTable)
      .set({ publishStatus: "deploying" })
      .where(eq(projectsTable.id, projectId));

    const deployment = await createDeployment(projectName, payload);
    createdInThisRun.vercelDeploymentId = deployment.id;

    // Vercel returns `url` as a hostname (e.g. `myapp-abc.vercel.app`).
    const tentativeUrl = deployment.url ? `https://${deployment.url}` : null;
    await setStatus("polling", {
      vercelDeploymentId: deployment.id,
      vercelInspectorUrl: deployment.inspectorUrl ?? null,
      liveUrl: tentativeUrl,
    });
    await db
      .update(projectsTable)
      .set({
        vercelProjectId: vercelProject.id,
        vercelDeploymentId: deployment.id,
        publishStatus: "polling",
      })
      .where(eq(projectsTable.id, projectId));

    // ---------- 6. Poll until terminal ----------
    const start = Date.now();
    let final: VercelDeployment | null = null;
    while (Date.now() - start < POLL_MAX_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const fresh = await getDeployment(deployment.id);
      if (
        fresh.readyState === "READY" ||
        fresh.readyState === "ERROR" ||
        fresh.readyState === "CANCELED"
      ) {
        final = fresh;
        break;
      }
    }
    if (!final) throw new Error("Deployment timed out after 10 minutes");

    if (final.readyState !== "READY") {
      throw new Error(`Vercel deployment ${final.readyState ?? "failed"}`);
    }

    const finalUrl = final.url ? `https://${final.url}` : tentativeUrl;
    // Success — the deployment is now the project's live state, so it is
    // no longer a candidate for cleanup even though we created it in this run.
    createdInThisRun.vercelDeploymentId = null;
    createdInThisRun.vercelProjectName = null;
    createdInThisRun.neonBranchId = null;
    await setStatus("live", {
      liveUrl: finalUrl,
      finishedAt: new Date(),
    });
    await db
      .update(projectsTable)
      .set({
        liveUrl: finalUrl,
        lastPublishedAt: new Date(),
        publishStatus: "live",
      })
      .where(eq(projectsTable.id, projectId));
  } catch (err) {
    logger.error({ err, deploymentId }, "Publish pipeline failed");
    await setStatus("failed", {
      errorMessage: userFacingError(err),
      finishedAt: new Date(),
    }).catch((dbErr) => {
      logger.error({ dbErr, deploymentId }, "Failed to record deployment failure");
    });
    await db
      .update(projectsTable)
      .set({ publishStatus: "failed" })
      .where(eq(projectsTable.id, projectId))
      .catch(() => {
        /* noop */
      });

    // ---------- Best-effort cleanup of resources we created in this run ----------
    // Order: cancel the in-flight Vercel deployment first (cheap), then
    // delete the Vercel project if it was net-new, then delete the Neon
    // branch if we provisioned it. Each step swallows its own errors so a
    // cleanup failure can never mask the original publish failure.
    if (createdInThisRun.vercelDeploymentId) {
      const id = createdInThisRun.vercelDeploymentId;
      vercelCancelDeployment(id).catch((cleanupErr) => {
        logger.warn({ cleanupErr, deploymentId, vercelDeploymentId: id }, "Failed to cancel Vercel deployment during cleanup");
      });
    }
    if (createdInThisRun.vercelProjectName) {
      const name = createdInThisRun.vercelProjectName;
      vercelDeleteProject(name)
        .then(() => {
          // Also clear the FK on the project row since the underlying
          // resource is gone.
          return db
            .update(projectsTable)
            .set({ vercelProjectId: null, vercelDeploymentId: null })
            .where(eq(projectsTable.id, projectId));
        })
        .catch((cleanupErr) => {
          logger.warn({ cleanupErr, deploymentId, vercelProjectName: name }, "Failed to delete Vercel project during cleanup");
        });
    }
    if (createdInThisRun.neonBranchId) {
      const branchId = createdInThisRun.neonBranchId;
      neonDeleteBranch(branchId)
        .then(() => {
          // Branch is gone — wipe the now-stale credential + FKs.
          return db
            .update(projectsTable)
            .set({
              databaseUrl: null,
              neonBranchId: null,
              neonRoleName: null,
              neonProjectId: null,
            })
            .where(eq(projectsTable.id, projectId));
        })
        .catch((cleanupErr) => {
          logger.warn({ cleanupErr, deploymentId, neonBranchId: branchId }, "Failed to delete Neon branch during cleanup");
        });
    }
  }
}


// ---------- POST /publish ----------
router.post(
  "/projects/:username/:slug/publish",
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

    // Pro-only feature. Free plan users get a structured payload the UI
    // can switch on to show an upgrade prompt instead of a generic error.
    const planLower = (row.ownerPlan ?? "Free").toLowerCase();
    if (planLower === "free") {
      res.status(402).json({
        status: "error",
        message: "Publishing is a Pro plan feature.",
        requiresUpgrade: true,
      });
      return;
    }

    // Required server config — fail fast with a clear message rather than
    // letting the pipeline blow up two steps in.
    const missing: string[] = [];
    if (!process.env.VERCEL_API_TOKEN) missing.push("VERCEL_API_TOKEN");
    if (!process.env.NEON_API_KEY) missing.push("NEON_API_KEY");
    if (!process.env.NEON_PARENT_PROJECT_ID) missing.push("NEON_PARENT_PROJECT_ID");
    if (!process.env.DATABASE_URL_ENC_KEY) missing.push("DATABASE_URL_ENC_KEY");
    if (missing.length > 0) {
      res.status(503).json({
        status: "error",
        message: `Publishing is not configured on this server. Missing: ${missing.join(", ")}`,
      });
      return;
    }

    // Don't allow stacking publishes. The check + insert MUST be atomic,
    // otherwise two concurrent POSTs both pass the check and start parallel
    // pipelines (duplicate Vercel deployments, duplicate Neon provisioning).
    // We use a row-level lock on the project to serialise concurrent
    // publishes for the same project.
    const NON_TERMINAL = [
      "queued",
      "validating",
      "provisioning_db",
      "creating_project",
      "deploying",
      "polling",
    ];
    const txResult = await db.transaction(async (tx) => {
      // SELECT … FOR UPDATE on the project row — any other concurrent
      // publish for the same project waits here until we commit.
      await tx.execute(
        sql`select id from ${projectsTable} where id = ${row.project.id} for update`,
      );
      const inflight = (
        await tx
          .select()
          .from(deploymentsTable)
          .where(eq(deploymentsTable.projectId, row.project.id))
          .orderBy(desc(deploymentsTable.createdAt))
          .limit(1)
      )[0];
      if (inflight && NON_TERMINAL.includes(inflight.status)) {
        return { kind: "alreadyRunning" as const, deploymentId: inflight.id };
      }
      const [created] = await tx
        .insert(deploymentsTable)
        .values({ projectId: row.project.id, status: "queued" })
        .returning();
      return { kind: "created" as const, deploymentId: created.id };
    });

    if (txResult.kind === "alreadyRunning") {
      res.status(202).json({
        deploymentId: txResult.deploymentId,
        alreadyRunning: true,
      });
      return;
    }
    const created = { id: txResult.deploymentId };

    // Fire-and-forget the pipeline. Errors are caught inside.
    void runPublishPipeline({
      deploymentId: created.id,
      projectId: row.project.id,
      username,
      slug,
    });

    res.status(202).json({ deploymentId: created.id });
  },
);

// ---------- GET list ----------
router.get(
  "/projects/:username/:slug/deployments",
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
      .from(deploymentsTable)
      .where(eq(deploymentsTable.projectId, row.project.id))
      .orderBy(desc(deploymentsTable.createdAt))
      .limit(50);
    res.json(
      rows.map((d) => ({
        id: d.id,
        status: d.status,
        liveUrl: d.liveUrl,
        vercelInspectorUrl: d.vercelInspectorUrl,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt.toISOString(),
        finishedAt: d.finishedAt?.toISOString() ?? null,
      })),
    );
  },
);

// ---------- GET one ----------
router.get(
  "/projects/:username/:slug/deployments/:id",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const id = String(req.params.id);
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
    const d = (
      await db
        .select()
        .from(deploymentsTable)
        .where(
          and(
            eq(deploymentsTable.projectId, row.project.id),
            eq(deploymentsTable.id, id),
          ),
        )
        .limit(1)
    )[0];
    if (!d) {
      res.status(404).json({ status: "error", message: "Deployment not found" });
      return;
    }
    res.json({
      id: d.id,
      status: d.status,
      liveUrl: d.liveUrl,
      vercelInspectorUrl: d.vercelInspectorUrl,
      errorMessage: d.errorMessage,
      createdAt: d.createdAt.toISOString(),
      finishedAt: d.finishedAt?.toISOString() ?? null,
    });
  },
);

// Used by the navbar live-URL chip — surfaces the project's most recent
// successful publish without hitting the deployments list.
router.get(
  "/projects/:username/:slug/publish-status",
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
    res.json({
      publishStatus: row.project.publishStatus,
      liveUrl: row.project.liveUrl,
      lastPublishedAt: row.project.lastPublishedAt?.toISOString() ?? null,
      primaryCustomDomain: row.project.primaryCustomDomain,
    });
  },
);

export default router;

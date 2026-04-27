import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  buildsTable,
  transactionsTable,
  payoutsTable,
} from "@workspace/db";
import { authConfigured, getAuthedUser } from "../middlewares/auth";
import {
  GetAdminMeResponse,
  GetAdminStatsResponse,
  ListAdminRecentBuildsResponse,
  ListAdminUsersResponse,
  ListAdminCostByModelResponse,
  ListAdminPayoutsResponse,
  RunAdminPayoutsResponse,
  RetryAdminPayoutResponse,
} from "@workspace/api-zod";
import { stripeConfigured } from "../lib/stripe";
import { retryFailedPayout, runPayoutCycle } from "../services/payouts";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_USERNAMES = (process.env.ADMIN_USERNAMES ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const DEV_ADMIN_ALLOWED =
  process.env.NODE_ENV !== "production" && !authConfigured;

// In dev (no auth configured at all and not production) we permit admin access for the demo
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (DEV_ADMIN_ALLOWED) return next();
  const user = getAuthedUser(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  if (ADMIN_USERNAMES.length === 0 || !ADMIN_USERNAMES.includes(user.username.toLowerCase())) {
    res.status(403).json({ status: "error", message: "Forbidden" });
    return;
  }
  next();
}

router.get("/admin/me", async (req: Request, res: Response): Promise<void> => {
  if (DEV_ADMIN_ALLOWED) {
    res.json(GetAdminMeResponse.parse({ isAdmin: true, configured: false }));
    return;
  }
  const user = getAuthedUser(req);
  const isAdmin =
    !!user &&
    ADMIN_USERNAMES.length > 0 &&
    ADMIN_USERNAMES.includes(user.username.toLowerCase());
  res.json(GetAdminMeResponse.parse({ isAdmin, configured: true }));
});

router.get("/admin/stats", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const [{ totalUsers }] = await db
    .select({ totalUsers: sql<number>`count(*)` })
    .from(usersTable);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ buildsToday }] = await db
    .select({ buildsToday: sql<number>`count(*)` })
    .from(buildsTable)
    .where(sql`${buildsTable.createdAt} >= ${since}`);

  const [{ totalProjects }] = await db
    .select({ totalProjects: sql<number>`count(*)` })
    .from(projectsTable);

  const [{ revenue }] = await db
    .select({ revenue: sql<number>`coalesce(sum(${transactionsTable.amount}), 0)` })
    .from(transactionsTable);

  const [{ spend }] = await db
    .select({ spend: sql<number>`coalesce(sum(${buildsTable.cost}), 0)` })
    .from(buildsTable);

  res.json(
    GetAdminStatsResponse.parse({
      totalUsers: Number(totalUsers),
      totalProjects: Number(totalProjects),
      buildsToday: Number(buildsToday),
      revenueGbp: Number(revenue),
      spendGbp: Number(spend),
    }),
  );
});

router.get("/admin/recent-builds", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: buildsTable.id,
      duration: buildsTable.durationSec,
      cost: buildsTable.cost,
      status: buildsTable.status,
      createdAt: buildsTable.createdAt,
      project: projectsTable.slug,
      username: usersTable.username,
    })
    .from(buildsTable)
    .innerJoin(projectsTable, eq(projectsTable.id, buildsTable.projectId))
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .orderBy(desc(buildsTable.createdAt))
    .limit(20);
  res.json(
    ListAdminRecentBuildsResponse.parse(
      rows.map((r) => ({
        ...r,
        cost: Number(r.cost),
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.get("/admin/users", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      plan: usersTable.plan,
      balance: usersTable.balance,
      status: usersTable.status,
      createdAt: usersTable.createdAt,
      referralCommissionPct: usersTable.referralCommissionPct,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(
    ListAdminUsersResponse.parse(
      rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        plan: r.plan,
        balance: Number(r.balance),
        status: r.status,
        signupDate: r.createdAt.toISOString().slice(0, 10),
        referralCommissionPct: r.referralCommissionPct,
      })),
    ),
  );
});

// Override (or clear) a single user's referral commission %. Pass `null`
// to fall back to the platform default. We deliberately don't accept a
// blank `{}` body — the field is required in the request schema so the
// "did the admin mean to clear it?" intent is unambiguous.
router.patch(
  "/admin/users/:id/commission-pct",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const body = (req.body ?? {}) as { referralCommissionPct?: unknown };

    if (!("referralCommissionPct" in body)) {
      res.status(400).json({
        status: "error",
        message: "referralCommissionPct is required (use null to clear).",
      });
      return;
    }
    const raw = body.referralCommissionPct;
    let nextValue: number | null;
    if (raw === null) {
      nextValue = null;
    } else if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 100) {
      nextValue = raw;
    } else {
      res.status(400).json({
        status: "error",
        message: "referralCommissionPct must be an integer 0-100, or null.",
      });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ referralCommissionPct: nextValue })
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        plan: usersTable.plan,
        balance: usersTable.balance,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
        referralCommissionPct: usersTable.referralCommissionPct,
      });
    if (!updated) {
      res.status(404).json({ status: "error", message: "User not found" });
      return;
    }
    res.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      plan: updated.plan,
      balance: Number(updated.balance),
      status: updated.status,
      signupDate: updated.createdAt.toISOString().slice(0, 10),
      referralCommissionPct: updated.referralCommissionPct,
    });
  },
);

// Admin curation list — every public project, marked with whether it's
// currently surfaced on /templates. We deliberately include unfeatured
// rows so admins can promote them with a single toggle. Sorting puts
// already-featured items first so the curation surface is obvious.
router.get(
  "/admin/templates",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    const rows = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        slug: projectsTable.slug,
        description: projectsTable.description,
        framework: projectsTable.framework,
        coverImageUrl: projectsTable.coverImageUrl,
        clones: projectsTable.clones,
        isFeaturedTemplate: projectsTable.isFeaturedTemplate,
        author: usersTable.username,
        authorDisplayName: usersTable.displayName,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
      .where(eq(projectsTable.isPublic, true))
      .orderBy(desc(projectsTable.isFeaturedTemplate), desc(projectsTable.clones));
    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

router.patch(
  "/admin/projects/:id/feature-template",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id);
    const { isFeaturedTemplate } = (req.body ?? {}) as {
      isFeaturedTemplate?: unknown;
    };
    if (typeof isFeaturedTemplate !== "boolean") {
      res.status(400).json({
        status: "error",
        message: "isFeaturedTemplate must be a boolean",
      });
      return;
    }
    const [updated] = await db
      .update(projectsTable)
      .set({ isFeaturedTemplate })
      .where(eq(projectsTable.id, id))
      .returning({
        id: projectsTable.id,
        name: projectsTable.name,
        slug: projectsTable.slug,
        description: projectsTable.description,
        framework: projectsTable.framework,
        coverImageUrl: projectsTable.coverImageUrl,
        clones: projectsTable.clones,
        isFeaturedTemplate: projectsTable.isFeaturedTemplate,
        userId: projectsTable.userId,
        createdAt: projectsTable.createdAt,
      });
    if (!updated) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const [author] = await db
      .select({
        username: usersTable.username,
        displayName: usersTable.displayName,
      })
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId))
      .limit(1);
    res.json({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      framework: updated.framework,
      coverImageUrl: updated.coverImageUrl,
      clones: updated.clones,
      isFeaturedTemplate: updated.isFeaturedTemplate,
      author: author?.username ?? "",
      authorDisplayName: author?.displayName ?? "",
      createdAt: updated.createdAt.toISOString(),
    });
  },
);

router.get(
  "/admin/payouts",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    // Most-recent first so admins see fresh failures at the top.
    const rows = await db
      .select({
        id: payoutsTable.id,
        amount: payoutsTable.amount,
        status: payoutsTable.status,
        failureReason: payoutsTable.failureReason,
        stripeTransferId: payoutsTable.stripeTransferId,
        createdAt: payoutsTable.createdAt,
        paidAt: payoutsTable.paidAt,
        failedAt: payoutsTable.failedAt,
        referrerUserId: payoutsTable.referrerUserId,
        referrerUsername: usersTable.username,
      })
      .from(payoutsTable)
      .leftJoin(usersTable, eq(usersTable.id, payoutsTable.referrerUserId))
      .orderBy(desc(payoutsTable.createdAt))
      .limit(500);

    res.json(
      ListAdminPayoutsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          status: r.status,
          failureReason: r.failureReason,
          stripeTransferId: r.stripeTransferId,
          createdAt: r.createdAt.toISOString(),
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
          failedAt: r.failedAt ? r.failedAt.toISOString() : null,
          referrerUserId: r.referrerUserId,
          referrerUsername: r.referrerUsername,
        })),
      ),
    );
  },
);

router.post(
  "/admin/payouts/run",
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    if (!stripeConfigured()) {
      res.status(503).json({
        status: "error",
        message:
          "Payouts are not configured on this server (STRIPE_SECRET_KEY missing).",
      });
      return;
    }
    try {
      const result = await runPayoutCycle();
      res.json(RunAdminPayoutsResponse.parse(result));
    } catch (err) {
      logger.error({ err }, "admin/payouts/run: cycle failed");
      res.status(500).json({
        status: "error",
        message: err instanceof Error ? err.message : "Payout cycle failed",
      });
    }
  },
);

router.post(
  "/admin/payouts/:id/retry",
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (typeof id !== "string" || id.length === 0) {
      res
        .status(400)
        .json({ status: "error", message: "Missing payout id" });
      return;
    }
    try {
      // Retry just unlinks the earnings + deletes the failed payout
      // row; the next cycle (manual or cron) re-batches and re-attempts
      // the transfer with a fresh idempotency key.
      const result = await retryFailedPayout(id);
      if (!result.requeued) {
        if (result.reason === "not_found") {
          res
            .status(404)
            .json({ status: "error", message: "Payout not found" });
          return;
        }
        res.status(409).json({
          status: "error",
          message: `Only failed payouts can be retried (${result.reason ?? "not retryable"})`,
        });
        return;
      }
      res.json(
        RetryAdminPayoutResponse.parse({
          requeued: true,
          reason: null,
        }),
      );
    } catch (err) {
      logger.error({ err, payoutId: id }, "admin/payouts/:id/retry failed");
      res.status(500).json({
        status: "error",
        message: err instanceof Error ? err.message : "Retry failed",
      });
    }
  },
);

router.get("/admin/cost-by-model", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      model: buildsTable.model,
      total: sql<number>`coalesce(sum(${buildsTable.cost}), 0)`,
    })
    .from(buildsTable)
    .groupBy(buildsTable.model);
  res.json(
    ListAdminCostByModelResponse.parse(
      rows.map((r) => ({ model: r.model, total: Number(r.total) })),
    ),
  );
});

export default router;

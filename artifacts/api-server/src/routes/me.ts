import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, ne, sql, inArray } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  projectDomainsTable,
  referralEarningsTable,
  transactionsTable,
  payoutsTable,
} from "@workspace/db";
import {
  GetMeResponse,
  UpdateMeResponse,
  ListMyProjectsResponse,
  ListMyTransactionsResponse,
  RenameMyProjectResponse,
  CreateMyProjectResponse,
  GetMyEarningsSummaryResponse,
  ListMyEarningsResponse,
  ListMyPayoutsResponse,
  GetMyReferralsResponse,
  GetMyPayoutAccountResponse,
  CreateMyPayoutOnboardingLinkBody,
  CreateMyPayoutOnboardingLinkResponse,
  CompleteOnboardingBody,
} from "@workspace/api-zod";
import { DEFAULT_REFERRAL_COMMISSION_PCT } from "../lib/referral-commission";
import { authConfigured, getAuthedUser } from "../middlewares/auth";
import { removeProjectDomain } from "../lib/vercel";
import {
  createAccountLink,
  createConnectExpressAccount,
  getConnectAccount,
  StripeApiError,
  stripeConfigured,
} from "../lib/stripe";
import { getPayoutSettings } from "../services/payout-settings";
import { logger } from "../lib/logger";

// Best-effort cleanup of every custom domain attached to a Vercel project
// before the local DB rows are dropped. We have to do this BEFORE
// deletion because once the projects row goes the FK cascade also wipes
// `project_domains`, and we'd no longer know which hosts to detach.
//
// Vercel's "remove domain from project" endpoint is the only way to free
// a hostname for re-use — without this call the same domain can never be
// re-added (Vercel returns 409). We swallow individual failures so that
// a transient Vercel outage doesn't block the user from deleting their
// own project; the orphan can be reaped manually if needed.
async function detachVercelDomainsForProjects(
  projectIds: ReadonlyArray<string>,
): Promise<void> {
  if (projectIds.length === 0) return;

  // Pull every (vercelProjectId, host) pair we need to detach in one query.
  // Joining keeps us from issuing N selects when a user deletes their
  // whole account.
  const rows = await db
    .select({
      vercelProjectId: projectsTable.vercelProjectId,
      host: projectDomainsTable.host,
    })
    .from(projectDomainsTable)
    .innerJoin(
      projectsTable,
      eq(projectsTable.id, projectDomainsTable.projectId),
    )
    .where(inArray(projectDomainsTable.projectId, [...projectIds]));

  for (const r of rows) {
    if (!r.vercelProjectId) continue;
    try {
      await removeProjectDomain(r.vercelProjectId, r.host);
    } catch (err) {
      logger.warn(
        { err, host: r.host, vercelProjectId: r.vercelProjectId },
        "removeProjectDomain failed during project teardown; skipping",
      );
    }
  }
}

const RESERVED_USERNAMES = new Set([
  "admin", "api", "www", "dashboard", "explore", "settings", "billing",
  "support", "deploybro", "help", "handler", "login", "signup", "logout",
  "signin", "auth", "me", "static", "public",
]);

const router: IRouter = Router();

const FALLBACK_USERNAME = "johndoe";
const DEV_FALLBACK_ALLOWED =
  process.env.NODE_ENV !== "production" && !authConfigured;

async function getMe(req: Request) {
  const authed = getAuthedUser(req);
  if (authed) {
    return (await db.select().from(usersTable).where(eq(usersTable.id, authed.id)).limit(1))[0];
  }
  // Dev fallback: only when auth is not configured AND we're not in production
  if (DEV_FALLBACK_ALLOWED) {
    return (
      await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, FALLBACK_USERNAME))
        .limit(1)
    )[0];
  }
  return null;
}

// Trim the raw users row down to the public Me shape. The `Me` schema is
// the single source of truth for what leaves this endpoint — anything
// added later (e.g. internal flags, billing internals) must be opted-in
// through the schema, not leaked by spreading the raw row.
function toMe(user: typeof usersTable.$inferSelect): typeof GetMeResponse._type {
  return GetMeResponse.parse({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    plan: user.plan,
    balance: Number(user.balance),
    status: user.status,
    signupDate: user.createdAt.toISOString().slice(0, 10),
    role: user.role ?? null,
    signupSource: user.signupSource ?? null,
    onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
  });
}

// Allowlists for the onboarding payload. Keep these in lock-step with the
// option lists rendered on the onboarding page in the frontend. Using
// Sets rather than enums keeps the API permissive enough that we can add
// a new option client-side without an API redeploy, but still rejects
// junk payloads from a hostile client.
const ALLOWED_ONBOARDING_ROLES = new Set([
  "developer",
  "entrepreneur",
  "designer",
  "product_manager",
  "student",
  "hobbyist",
  "other",
]);
const ALLOWED_ONBOARDING_SOURCES = new Set([
  "google",
  "twitter",
  "youtube",
  "reddit",
  "producthunt",
  "friend",
  "word_of_mouth",
  "other",
]);
const ALLOWED_ONBOARDING_PLANS = new Set(["free", "pro", "teams"]);

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  res.json(toMe(user));
});

router.get("/me/projects", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.json(ListMyProjectsResponse.parse([]));
    return;
  }
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      slug: projectsTable.slug,
      description: projectsTable.description,
      framework: projectsTable.framework,
      status: projectsTable.status,
      isPublic: projectsTable.isPublic,
      isFeaturedTemplate: projectsTable.isFeaturedTemplate,
      clones: projectsTable.clones,
      coverImageUrl: projectsTable.coverImageUrl,
      lastBuiltAt: projectsTable.lastBuiltAt,
      buildsCount: sql<number>`(select count(*) from builds where builds.project_id = ${projectsTable.id})`,
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(projectsTable.lastBuiltAt));
  const data = ListMyProjectsResponse.parse(
    rows.map((r) => ({
      ...r,
      lastBuiltAt: r.lastBuiltAt.toISOString(),
      buildsCount: Number(r.buildsCount),
    })),
  );
  res.json(data);
});

router.get(
  "/me/earnings/summary",
  async (req: Request, res: Response): Promise<void> => {
    const user = await getMe(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }

    // Aggregate the entire history in one round-trip. `paid` and `pending`
    // are computed via FILTER clauses so a future "voided" or "reversed"
    // status doesn't accidentally land in either bucket — only the
    // explicit statuses we recognise contribute. `totalEarned` is the
    // gross of everything that hasn't been reversed (paid + pending).
    const [agg] = await db
      .select({
        total: sql<string>`coalesce(sum(${referralEarningsTable.amount}) filter (where ${referralEarningsTable.status} in ('pending','paid')), 0)`,
        pending: sql<string>`coalesce(sum(${referralEarningsTable.amount}) filter (where ${referralEarningsTable.status} = 'pending'), 0)`,
        paid: sql<string>`coalesce(sum(${referralEarningsTable.amount}) filter (where ${referralEarningsTable.status} = 'paid'), 0)`,
      })
      .from(referralEarningsTable)
      .where(eq(referralEarningsTable.referrerUserId, user.id));

    res.json(
      GetMyEarningsSummaryResponse.parse({
        totalEarned: Number(agg?.total ?? 0),
        pending: Number(agg?.pending ?? 0),
        paid: Number(agg?.paid ?? 0),
        commissionPct:
          user.referralCommissionPct ?? DEFAULT_REFERRAL_COMMISSION_PCT,
      }),
    );
  },
);

router.get(
  "/me/earnings",
  async (req: Request, res: Response): Promise<void> => {
    const user = await getMe(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }

    // Left-join the referred user (always present, but we still LEFT JOIN
    // so a deleted user doesn't drop the row) and the source project (may
    // be NULL because attribution can come from a public profile view, not
    // just a template). The schema deliberately doesn't FK-constrain
    // `sourceProjectId` so a deleted template leaves the credit row in
    // place — see the comment on `users.referredViaProjectId`.
    const rows = await db
      .select({
        id: referralEarningsTable.id,
        amount: referralEarningsTable.amount,
        commissionPct: referralEarningsTable.commissionPct,
        status: referralEarningsTable.status,
        kind: referralEarningsTable.kind,
        createdAt: referralEarningsTable.createdAt,
        paidAt: referralEarningsTable.paidAt,
        referredUsername: usersTable.username,
        sourceProjectSlug: projectsTable.slug,
        sourceProjectName: projectsTable.name,
      })
      .from(referralEarningsTable)
      .leftJoin(
        usersTable,
        eq(usersTable.id, referralEarningsTable.referredUserId),
      )
      .leftJoin(
        projectsTable,
        eq(projectsTable.id, referralEarningsTable.sourceProjectId),
      )
      .where(eq(referralEarningsTable.referrerUserId, user.id))
      .orderBy(desc(referralEarningsTable.createdAt))
      .limit(200);

    res.json(
      ListMyEarningsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          commissionPct: r.commissionPct,
          status: r.status,
          kind: r.kind,
          referredUsername: r.referredUsername,
          sourceProjectSlug: r.sourceProjectSlug,
          sourceProjectName: r.sourceProjectName,
          createdAt: r.createdAt.toISOString(),
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        })),
      ),
    );
  },
);

router.get(
  "/me/referrals",
  async (req: Request, res: Response): Promise<void> => {
    const user = await getMe(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }

    // Pull every user that signed up under this creator. The left-join on
    // projects is by `referredViaProjectId` (the template they came in
    // through, if any).
    //
    // We deliberately keep BOTH the loose `referredViaProjectId` column
    // and the joined project columns so we can distinguish three cases
    // when grouping:
    //   - `referredViaProjectId IS NULL`            → "profile" signup
    //   - `referredViaProjectId` set + join hits    → "template" signup
    //   - `referredViaProjectId` set + join misses  → "deleted_template"
    // (`referredViaProjectId` has no FK — see users schema.)
    //
    // `hasPaid` is computed via EXISTS against `referral_earnings` rather
    // than `users.plan` so we count actual money produced by the funnel —
    // a user could be on a paid plan via a path that didn't generate any
    // referral credit (e.g. a comp), and we shouldn't claim that as a
    // conversion for this creator.
    const rows = await db
      .select({
        username: usersTable.username,
        displayName: usersTable.displayName,
        createdAt: usersTable.createdAt,
        referredViaProjectId: usersTable.referredViaProjectId,
        sourceProjectSlug: projectsTable.slug,
        sourceProjectName: projectsTable.name,
        hasPaid: sql<boolean>`exists (
          select 1 from ${referralEarningsTable}
          where ${referralEarningsTable.referrerUserId} = ${user.id}
            and ${referralEarningsTable.referredUserId} = ${usersTable.id}
        )`,
      })
      .from(usersTable)
      .leftJoin(
        projectsTable,
        eq(projectsTable.id, usersTable.referredViaProjectId),
      )
      .where(eq(usersTable.referredByUserId, user.id))
      .orderBy(desc(usersTable.createdAt));

    type Kind = "profile" | "template" | "deleted_template";
    function kindOf(r: (typeof rows)[number]): Kind {
      if (r.referredViaProjectId === null) return "profile";
      return r.sourceProjectSlug ? "template" : "deleted_template";
    }

    const total = rows.length;
    const paying = rows.reduce((n, r) => n + (r.hasPaid ? 1 : 0), 0);
    // Round to 1 decimal for stable display; 0/0 collapses to 0 (not NaN).
    const conversionPct =
      total === 0 ? 0 : Math.round((paying / total) * 1000) / 10;

    // Group by source. Live templates are keyed by slug, "profile" signups
    // collapse into one bucket, and every deleted-template signup lands
    // under its own per-id bucket so we don't lose attribution if the
    // creator later renames or restores the row. We surface them as a
    // single "Deleted template" entry by keying on a constant, which
    // matches the historical behaviour callers were relying on.
    const grouped = new Map<
      string,
      {
        sourceProjectSlug: string | null;
        sourceProjectName: string | null;
        kind: Kind;
        total: number;
        paying: number;
      }
    >();
    for (const r of rows) {
      const kind = kindOf(r);
      const key =
        kind === "template"
          ? `template:${r.sourceProjectSlug}`
          : kind === "deleted_template"
            ? "deleted_template"
            : "profile";
      const cur = grouped.get(key) ?? {
        sourceProjectSlug: r.sourceProjectSlug,
        sourceProjectName: r.sourceProjectName,
        kind,
        total: 0,
        paying: 0,
      };
      cur.total += 1;
      if (r.hasPaid) cur.paying += 1;
      grouped.set(key, cur);
    }
    // Highest-volume sources first; "Public profile" / "Deleted template"
    // naturally sort alongside live templates by their row count.
    const bySource = [...grouped.values()].sort((a, b) => b.total - a.total);

    res.json(
      GetMyReferralsResponse.parse({
        total,
        paying,
        conversionPct,
        bySource,
        users: rows.map((r) => ({
          username: r.username,
          displayName: r.displayName,
          signupDate: r.createdAt.toISOString().slice(0, 10),
          sourceProjectSlug: r.sourceProjectSlug,
          sourceProjectName: r.sourceProjectName,
          kind: kindOf(r),
          hasPaid: Boolean(r.hasPaid),
        })),
      }),
    );
  },
);

router.get(
  "/me/payouts",
  async (req: Request, res: Response): Promise<void> => {
    const user = await getMe(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }

    // Newest first so the freshest payouts (and any failures the
    // creator needs to act on) sit at the top of the table. We surface
    // every status — queued, paid, and failed — because the failed
    // rows are the whole point of letting creators see this on their
    // own (the admin payouts table is staff-only).
    const rows = await db
      .select({
        id: payoutsTable.id,
        amount: payoutsTable.amount,
        status: payoutsTable.status,
        failureReason: payoutsTable.failureReason,
        createdAt: payoutsTable.createdAt,
        paidAt: payoutsTable.paidAt,
        failedAt: payoutsTable.failedAt,
      })
      .from(payoutsTable)
      .where(eq(payoutsTable.referrerUserId, user.id))
      .orderBy(desc(payoutsTable.createdAt))
      .limit(200);

    res.json(
      ListMyPayoutsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          status: r.status,
          failureReason: r.failureReason,
          createdAt: r.createdAt.toISOString(),
          paidAt: r.paidAt ? r.paidAt.toISOString() : null,
          failedAt: r.failedAt ? r.failedAt.toISOString() : null,
        })),
      ),
    );
  },
);

router.get(
  "/me/payouts/account",
  async (req: Request, res: Response): Promise<void> => {
    const user = await getMe(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }

    // The cached `stripeConnectStatus` is the source of truth for the
    // CTA copy — we don't round-trip Stripe on every page load. The
    // `account.updated` webhook keeps the cache fresh, and the
    // onboarding-link endpoint refreshes it on demand.
    const cachedStatus = user.stripeConnectStatus;
    const validStatus =
      cachedStatus === "pending" || cachedStatus === "verified"
        ? cachedStatus
        : null;

    // We still surface `pendingTotal` because the earnings page wants
    // to render "you have £X waiting" alongside the connect CTA. The
    // live admin-tunable payout threshold is fetched from the settings
    // singleton (with env fallback) so creators always see the same
    // number the cron would actually use.
    const [agg, settings] = await Promise.all([
      db
        .select({
          pending: sql<string>`coalesce(sum(${referralEarningsTable.amount}) filter (where ${referralEarningsTable.status} = 'pending'), 0)`,
        })
        .from(referralEarningsTable)
        .where(eq(referralEarningsTable.referrerUserId, user.id))
        .then((r) => r[0]),
      getPayoutSettings(),
    ]);

    res.json(
      GetMyPayoutAccountResponse.parse({
        connected: !!user.stripeConnectAccountId,
        status: validStatus,
        // `payoutsEnabled`/`detailsSubmitted` mirror the cached fields
        // so the UI can branch on a richer "in progress vs done" state
        // without an extra round-trip. Both default to false until we
        // see a verified status.
        payoutsEnabled: validStatus === "verified",
        detailsSubmitted: validStatus !== null,
        pendingTotal: Number(agg?.pending ?? 0),
        minPayoutGbp: settings.minPayoutGbp,
      }),
    );
  },
);

router.post(
  "/me/payouts/account/onboarding-link",
  async (req: Request, res: Response): Promise<void> => {
    const user = await getMe(req);
    if (!user) {
      res.status(401).json({ status: "error", message: "Unauthenticated" });
      return;
    }
    if (!stripeConfigured()) {
      res.status(503).json({
        status: "error",
        message:
          "Payouts are not configured on this server (STRIPE_SECRET_KEY missing).",
      });
      return;
    }

    const parsed = CreateMyPayoutOnboardingLinkBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Invalid body",
      });
      return;
    }

    try {
      // Lazily provision the Connect account on first call. Subsequent
      // calls just refresh the cached status and mint a new link.
      let accountId = user.stripeConnectAccountId;
      if (!accountId) {
        const account = await createConnectExpressAccount({
          email: user.email,
          metadata: { userId: user.id, username: user.username },
        });
        accountId = account.id;
        await db
          .update(usersTable)
          .set({
            stripeConnectAccountId: accountId,
            stripeConnectStatus: account.payouts_enabled
              ? "verified"
              : "pending",
          })
          .where(eq(usersTable.id, user.id));
      } else {
        // Refresh the cached status so the UI doesn't show "pending"
        // forever if the user comes back after finishing onboarding.
        try {
          const account = await getConnectAccount(accountId);
          await db
            .update(usersTable)
            .set({
              stripeConnectStatus: account.payouts_enabled
                ? "verified"
                : "pending",
            })
            .where(eq(usersTable.id, user.id));
        } catch (err) {
          // Status refresh failures shouldn't block minting a fresh
          // onboarding link — the webhook will eventually catch up.
          logger.warn(
            { err, accountId, userId: user.id },
            "onboarding-link: status refresh failed, continuing",
          );
        }
      }

      const link = await createAccountLink({
        account: accountId,
        returnUrl: parsed.data.returnUrl,
        refreshUrl: parsed.data.refreshUrl,
      });

      res.json(
        CreateMyPayoutOnboardingLinkResponse.parse({
          url: link.url,
          expiresAt: link.expires_at,
        }),
      );
    } catch (err) {
      const reason =
        err instanceof StripeApiError
          ? `Stripe ${err.status}${err.stripeCode ? ` (${err.stripeCode})` : ""}`
          : err instanceof Error
            ? err.message
            : "Unknown error";
      logger.error(
        { err, userId: user.id },
        "onboarding-link: failed to create Connect onboarding link",
      );
      res.status(502).json({
        status: "error",
        message: `Failed to start onboarding: ${reason}`,
      });
    }
  },
);

router.get("/me/transactions", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.json(ListMyTransactionsResponse.parse([]));
    return;
  }
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, user.id))
    .orderBy(desc(transactionsTable.createdAt));
  const data = ListMyTransactionsResponse.parse(
    rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      status: r.status,
      method: r.method,
      createdAt: r.createdAt.toISOString(),
    })),
  );
  res.json(data);
});

router.patch("/me", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  const { username, displayName, bio } = req.body ?? {};
  const updates: Record<string, unknown> = {};

  if (typeof displayName === "string") {
    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      res.status(400).json({ status: "error", message: "Display name must be 1-60 chars." });
      return;
    }
    updates.displayName = trimmed;
  }

  if (typeof bio === "string") {
    if (bio.length > 280) {
      res.status(400).json({ status: "error", message: "Bio must be at most 280 chars." });
      return;
    }
    updates.bio = bio;
  }

  if (typeof username === "string" && username !== user.username) {
    const u = username.toLowerCase();
    if (!/^[a-z][a-z0-9-]{2,19}$/.test(u) || u.endsWith("-")) {
      res.status(400).json({ status: "error", message: "Invalid username format." });
      return;
    }
    if (RESERVED_USERNAMES.has(u)) {
      res.status(400).json({ status: "error", message: "This username is reserved." });
      return;
    }
    const taken = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.username, u), ne(usersTable.id, user.id)))
      .limit(1);
    if (taken.length > 0) {
      res.status(409).json({ status: "error", message: "Username is already taken." });
      return;
    }
    updates.username = u;
  }

  if (Object.keys(updates).length === 0) {
    // No-op update — return the current row through the same shape so the
    // frontend cache lands on a Me-shaped value either way.
    res.json(UpdateMeResponse.parse(toMe(user)));
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(UpdateMeResponse.parse(toMe(updated)));
});

// POST /me/onboarding — record the answers from the multi-step welcome
// flow and stamp `onboardedAt` so the AuthGate stops bouncing the user
// back here on subsequent navigations. We DO NOT change `users.plan`
// from the picked tier — that field tracks the actual paid subscription
// and is owned by the Stripe webhook. The picked plan is preserved as
// the user's stated preference (so the frontend can route them to the
// billing page after Pro selection) but the source of truth for whether
// they've actually paid stays with Stripe.
router.post("/me/onboarding", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }

  const parsed = CompleteOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ status: "error", message: "Invalid onboarding payload." });
    return;
  }
  const { displayName, role, signupSource, plan } = parsed.data;

  if (!ALLOWED_ONBOARDING_ROLES.has(role)) {
    res.status(400).json({ status: "error", message: "Unknown role option." });
    return;
  }
  if (!ALLOWED_ONBOARDING_SOURCES.has(signupSource)) {
    res.status(400).json({ status: "error", message: "Unknown signup source option." });
    return;
  }
  if (!ALLOWED_ONBOARDING_PLANS.has(plan)) {
    res.status(400).json({ status: "error", message: "Unknown plan option." });
    return;
  }

  const updates: Record<string, unknown> = {
    role,
    signupSource,
    onboardedAt: new Date(),
  };

  if (typeof displayName === "string") {
    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      res.status(400).json({ status: "error", message: "Display name must be 1-60 chars." });
      return;
    }
    updates.displayName = trimmed;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json(toMe(updated));
});

router.patch("/me/projects/:slug", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  const slug = String(req.params.slug);
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ status: "error", message: "name required" });
    return;
  }
  const trimmed = name.trim().slice(0, 80);
  const newSlug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "project";

  // If slug would change, ensure uniqueness within user
  let finalSlug = newSlug;
  if (newSlug !== slug) {
    let n = 2;
    while (
      (
        await db
          .select({ id: projectsTable.id })
          .from(projectsTable)
          .where(and(eq(projectsTable.userId, user.id), eq(projectsTable.slug, finalSlug)))
          .limit(1)
      ).length > 0
    ) {
      finalSlug = `${newSlug}-${n++}`;
    }
  }

  // Explicit field projection — never spread the raw row because it now
  // contains sensitive Neon/Vercel fields (databaseUrl, neonRoleName, etc.)
  // that must never leave the server.
  const [updated] = await db
    .update(projectsTable)
    .set({ name: trimmed, slug: finalSlug })
    .where(and(eq(projectsTable.userId, user.id), eq(projectsTable.slug, slug)))
    .returning({
      id: projectsTable.id,
      name: projectsTable.name,
      slug: projectsTable.slug,
      description: projectsTable.description,
      framework: projectsTable.framework,
      status: projectsTable.status,
      isPublic: projectsTable.isPublic,
      isFeaturedTemplate: projectsTable.isFeaturedTemplate,
      clones: projectsTable.clones,
      coverImageUrl: projectsTable.coverImageUrl,
      lastBuiltAt: projectsTable.lastBuiltAt,
    });

  if (!updated) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  const data = RenameMyProjectResponse.parse({
    ...updated,
    lastBuiltAt: updated.lastBuiltAt.toISOString(),
    buildsCount: 0,
  });
  res.json(data);
});

router.delete("/me/projects/:slug", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  const slug = String(req.params.slug);

  // Look up the project first so we can detach its custom domains from
  // Vercel BEFORE the FK cascade wipes the project_domains rows. If the
  // project doesn't exist we 404 without touching anything.
  const target = (
    await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(and(eq(projectsTable.userId, user.id), eq(projectsTable.slug, slug)))
      .limit(1)
  )[0];
  if (!target) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }

  await detachVercelDomainsForProjects([target.id]);

  const result = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.userId, user.id), eq(projectsTable.slug, slug)))
    .returning({ id: projectsTable.id });
  if (result.length === 0) {
    // Race: project was deleted between our check and the delete. Treat
    // as already-gone (the domains were detached above; no harm done).
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.status(204).send();
});

router.delete("/me", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  // Same teardown path as single-project delete, but for every project
  // the user owns. Run domain detachment first so the Vercel side is
  // clean before the FK cascade wipes the project_domains rows.
  const userProjectIds = (
    await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.userId, user.id))
  ).map((r) => r.id);
  await detachVercelDomainsForProjects(userProjectIds);

  // Cascade-delete projects, transactions, then the user. Builds cascade via projects FK.
  await db.delete(projectsTable).where(eq(projectsTable.userId, user.id));
  await db.delete(transactionsTable).where(eq(transactionsTable.userId, user.id));
  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  res.clearCookie("auth_token", { path: "/" });
  res.status(204).send();
});

router.post("/me/projects", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  const { name, description = "", framework = "React" } = req.body ?? {};
  if (!name) {
    res.status(400).json({ status: "error", message: "name required" });
    return;
  }

  const baseSlug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "project";

  let slug = baseSlug;
  let n = 2;
  while (
    (
      await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(sql`${projectsTable.userId} = ${user.id} and ${projectsTable.slug} = ${slug}`)
        .limit(1)
    ).length > 0
  ) {
    slug = `${baseSlug}-${n++}`;
  }

  const [created] = await db
    .insert(projectsTable)
    .values({
      userId: user.id,
      name,
      slug,
      description,
      framework,
      status: "provisioning",
    })
    .returning();

  // Stick to the documented CreateProjectResponse shape — the raw row has
  // internal Neon/Vercel fields the schema deliberately excludes.
  const data = CreateMyProjectResponse.parse({
    id: created.id,
    slug: created.slug,
    name: created.name,
    ownerUsername: user.username,
  });
  res.status(201).json(data);
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, usersTable, projectsTable } from "@workspace/db";
import {
  GetUserResponse,
  ListUserProjectsResponse,
} from "@workspace/api-zod";
import { setReferralCookieIfAbsent } from "../lib/referral-attribution";
import { getAuthedUser } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users/:username", async (req: Request, res: Response): Promise<void> => {
  const username = String(req.params.username);
  const user = (await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1))[0];
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
    return;
  }

  // Drop the short-lived attribution cookie so a later signup from this
  // visitor is credited back to this creator. Helper guards against
  // overwriting an existing cookie (first-touch wins) and skips the
  // write when an `auth_token` is already present.
  setReferralCookieIfAbsent(req, res, user.id);

  const [stats] = await db
    .select({
      publicProjects: sql<number>`count(*) filter (where ${projectsTable.isPublic} = true)`,
      totalClones: sql<number>`coalesce(sum(${projectsTable.clones}), 0)`,
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id));

  res.json(
    GetUserResponse.parse({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      tagline: user.tagline,
      location: user.location,
      websiteUrl: user.websiteUrl,
      skills: user.skills,
      bannerUrl: user.bannerUrl,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      balance: Number(user.balance),
      status: user.status,
      signupDate: user.createdAt.toISOString().slice(0, 10),
      publicProjects: Number(stats?.publicProjects ?? 0),
      totalClones: Number(stats?.totalClones ?? 0),
    }),
  );
});

router.get("/users/:username/projects", async (req: Request, res: Response): Promise<void> => {
  const username = String(req.params.username);
  const user = (await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1))[0];
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
    return;
  }

  // Privacy: only the profile owner sees their private projects. Everyone
  // else gets the public-only subset, even if their UI was hiding the
  // private rows on its own. Server is the source of truth here.
  const me = getAuthedUser(req);
  const isOwner = !!me && me.id === user.id;
  const visibilityFilter = isOwner
    ? eq(projectsTable.userId, user.id)
    : and(eq(projectsTable.userId, user.id), eq(projectsTable.isPublic, true));

  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      slug: projectsTable.slug,
      description: projectsTable.description,
      framework: projectsTable.framework,
      status: projectsTable.status,
      // See comment in routes/me.ts — `publishStatus` is what tells the
      // dashboard / public profile whether Vercel has actually deployed
      // the project, so the green dot only lights up post-publish.
      publishStatus: projectsTable.publishStatus,
      isPublic: projectsTable.isPublic,
      isFeaturedTemplate: projectsTable.isFeaturedTemplate,
      clones: projectsTable.clones,
      coverImageUrl: projectsTable.coverImageUrl,
      screenshotUrl: projectsTable.screenshotUrl,
      lastBuiltAt: projectsTable.lastBuiltAt,
      createdAt: projectsTable.createdAt,
      buildsCount: sql<number>`(select count(*) from builds where builds.project_id = ${projectsTable.id})`,
    })
    .from(projectsTable)
    .where(visibilityFilter)
    .orderBy(desc(projectsTable.lastBuiltAt));

  res.json(
    ListUserProjectsResponse.parse(
      rows.map((r) => ({
        ...r,
        // The schema requires `ownerUsername` on every row so the
        // client can build links/badges without a second lookup.
        // Since this endpoint is scoped to a single user, every row
        // shares the same owner — pull it from the user we already
        // fetched above.
        ownerUsername: user.username,
        lastBuiltAt: r.lastBuiltAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        buildsCount: Number(r.buildsCount),
      })),
    ),
  );
});

export default router;

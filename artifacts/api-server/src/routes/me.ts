import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  transactionsTable,
} from "@workspace/db";
import { authConfigured, getAuthedUser } from "../middlewares/auth";

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

router.get("/me", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    plan: user.plan,
    balance: Number(user.balance),
    status: user.status,
    signupDate: user.createdAt.toISOString().slice(0, 10),
  });
});

router.get("/me/projects", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.json([]);
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
      clones: projectsTable.clones,
      lastBuiltAt: projectsTable.lastBuiltAt,
      buildsCount: sql<number>`(select count(*) from builds where builds.project_id = ${projectsTable.id})`,
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(projectsTable.lastBuiltAt));
  res.json(rows.map((r) => ({ ...r, buildsCount: Number(r.buildsCount) })));
});

router.get("/me/transactions", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.json([]);
    return;
  }
  const rows = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, user.id))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
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
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      plan: user.plan,
      balance: Number(user.balance),
      status: user.status,
      signupDate: user.createdAt.toISOString().slice(0, 10),
    });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, user.id))
    .returning();

  res.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    email: updated.email,
    bio: updated.bio,
    plan: updated.plan,
    balance: Number(updated.balance),
    status: updated.status,
    signupDate: updated.createdAt.toISOString().slice(0, 10),
  });
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
      clones: projectsTable.clones,
      lastBuiltAt: projectsTable.lastBuiltAt,
    });

  if (!updated) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return;
  }
  res.json({ ...updated, buildsCount: 0 });
});

router.delete("/me/projects/:slug", async (req: Request, res: Response): Promise<void> => {
  const user = await getMe(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  const slug = String(req.params.slug);
  const result = await db
    .delete(projectsTable)
    .where(and(eq(projectsTable.userId, user.id), eq(projectsTable.slug, slug)))
    .returning({ id: projectsTable.id });
  if (result.length === 0) {
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

  res.status(201).json({ ...created, ownerUsername: user.username });
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  transactionsTable,
} from "@workspace/db";
import { authConfigured, getAuthedUser } from "../middlewares/auth";

const router: IRouter = Router();

const FALLBACK_USERNAME = "johndoe";

async function getMe(req: Request) {
  const authed = getAuthedUser(req);
  if (authed) {
    return (await db.select().from(usersTable).where(eq(usersTable.id, authed.id)).limit(1))[0];
  }
  // Dev fallback only when auth is not configured at all
  if (!authConfigured) {
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

  res.status(201).json(created);
});

export default router;

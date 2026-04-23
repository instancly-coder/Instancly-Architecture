import { Router, type IRouter, type Request, type Response } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  projectsTable,
  transactionsTable,
} from "@workspace/db";

const router: IRouter = Router();

const ME = "johndoe";

async function getMe() {
  return (await db.select().from(usersTable).where(eq(usersTable.username, ME)).limit(1))[0];
}

router.get("/me", async (_req: Request, res: Response): Promise<void> => {
  const user = await getMe();
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
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

router.get("/me/projects", async (_req: Request, res: Response): Promise<void> => {
  const user = await getMe();
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

router.get("/me/transactions", async (_req: Request, res: Response): Promise<void> => {
  const user = await getMe();
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
  const user = await getMe();
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
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

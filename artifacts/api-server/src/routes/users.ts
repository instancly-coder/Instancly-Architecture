import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, usersTable, projectsTable } from "@workspace/db";
import {
  GetUserResponse,
  ListUserProjectsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users/:username", async (req: Request, res: Response): Promise<void> => {
  const username = String(req.params.username);
  const user = (await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1))[0];
  if (!user) {
    res.status(404).json({ status: "error", message: "User not found" });
    return;
  }

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
      createdAt: projectsTable.createdAt,
      buildsCount: sql<number>`(select count(*) from builds where builds.project_id = ${projectsTable.id})`,
    })
    .from(projectsTable)
    .where(eq(projectsTable.userId, user.id))
    .orderBy(desc(projectsTable.lastBuiltAt));

  res.json(
    ListUserProjectsResponse.parse(
      rows.map((r) => ({
        ...r,
        lastBuiltAt: r.lastBuiltAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        buildsCount: Number(r.buildsCount),
      })),
    ),
  );
});

export default router;

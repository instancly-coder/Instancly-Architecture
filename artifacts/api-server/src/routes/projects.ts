import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, desc, sql, max } from "drizzle-orm";
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

export default router;

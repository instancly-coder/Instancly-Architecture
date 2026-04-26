import { Router, type IRouter } from "express";
import { desc, eq, ilike, or, sql, and } from "drizzle-orm";
import { db, projectsTable, usersTable } from "@workspace/db";
import { ExploreResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/explore", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const framework = req.query.framework as string | undefined;
  const sort = (req.query.sort as string | undefined) ?? "popular";

  const conds = [eq(projectsTable.isPublic, true)];
  if (q) {
    conds.push(
      or(
        ilike(projectsTable.name, `%${q}%`),
        ilike(projectsTable.description, `%${q}%`),
        ilike(usersTable.username, `%${q}%`),
      )!,
    );
  }
  if (framework && framework !== "all") {
    conds.push(eq(projectsTable.framework, framework));
  }

  const order =
    sort === "recent"
      ? desc(projectsTable.lastBuiltAt)
      : sort === "alpha"
        ? sql`${projectsTable.name} asc`
        : desc(projectsTable.clones);

  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      slug: projectsTable.slug,
      description: projectsTable.description,
      framework: projectsTable.framework,
      clones: projectsTable.clones,
      coverImageUrl: projectsTable.coverImageUrl,
      lastBuiltAt: projectsTable.lastBuiltAt,
      author: usersTable.username,
      authorDisplayName: usersTable.displayName,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(...conds))
    .orderBy(order)
    .limit(48);

  res.json(
    ExploreResponse.parse(
      rows.map((r) => ({
        ...r,
        lastBuiltAt: r.lastBuiltAt.toISOString(),
      })),
    ),
  );
});

// Public list of admin-curated templates. We don't paginate yet — until
// curation grows past a few dozen entries the simple "show them all"
// query keeps the page snappy and avoids needing a sort UI.
router.get("/templates", async (_req, res) => {
  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      slug: projectsTable.slug,
      description: projectsTable.description,
      framework: projectsTable.framework,
      features: projectsTable.features,
      coverImageUrl: projectsTable.coverImageUrl,
      clones: projectsTable.clones,
      author: usersTable.username,
      authorDisplayName: usersTable.displayName,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(
      and(
        eq(projectsTable.isPublic, true),
        eq(projectsTable.isFeaturedTemplate, true),
      ),
    )
    .orderBy(desc(projectsTable.clones))
    .limit(60);

  res.json(
    rows.map((r) => ({
      ...r,
      features: r.features ?? [],
    })),
  );
});

export default router;

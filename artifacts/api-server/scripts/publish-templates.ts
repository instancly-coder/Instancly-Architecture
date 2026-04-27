// One-shot: re-publish the three featured starter templates to Vercel
// so each one gets a real `live_url` (and, as a side-effect, a fresh
// post-deploy screenshot — the publish pipeline auto-captures one and
// overwrites `projects.screenshot_url` once the deployment is live).
//
// Usage: pnpm --filter @workspace/api-server exec tsx ./scripts/publish-templates.ts
//
// Required env: VERCEL_API_TOKEN, DATABASE_URL_ENC_KEY, NEON_DATABASE_URL
// Optional env: VERCEL_TEAM_ID
//
// This invokes the same `runPublishPipeline` the HTTP /publish endpoint
// uses, so output is identical to a normal user click — Vercel project,
// deployment, polling, screenshot capture, and `projects.live_url`
// update all happen exactly as in production.

import {
  db,
  projectsTable,
  deploymentsTable,
  usersTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { runPublishPipeline } from "../src/routes/deployments";

async function main(): Promise<void> {
  const templates = await db
    .select({
      id: projectsTable.id,
      slug: projectsTable.slug,
      username: usersTable.username,
    })
    .from(projectsTable)
    .innerJoin(usersTable, eq(projectsTable.userId, usersTable.id))
    .where(eq(projectsTable.isFeaturedTemplate, true));

  if (templates.length === 0) {
    console.log("No featured templates found. Nothing to do.");
    return;
  }

  console.log(`Re-publishing ${templates.length} featured template(s):`);

  for (const t of templates) {
    if (!t.username) {
      console.log(`- skipping ${t.slug} (owner has no username)`);
      continue;
    }
    console.log(`\n→ ${t.username}/${t.slug}`);

    // Insert a deployments row in `queued` so the pipeline can update it
    // through the same setStatus(...) calls the HTTP endpoint relies on.
    const [dep] = await db
      .insert(deploymentsTable)
      .values({ projectId: t.id, status: "queued" })
      .returning({ id: deploymentsTable.id });

    if (!dep) {
      console.log("  ✗ failed to insert deployments row, skipping");
      continue;
    }

    try {
      await runPublishPipeline({
        deploymentId: dep.id,
        projectId: t.id,
        username: t.username,
        slug: t.slug,
      });
    } catch (err) {
      // The pipeline already records its own failure on the deployments
      // row — log + continue so one bad template doesn't block the others.
      console.log(`  ✗ pipeline threw: ${(err as Error).message}`);
      continue;
    }

    // Read back what we ended with so the operator sees the result.
    const [finalDep] = await db
      .select({
        status: deploymentsTable.status,
        liveUrl: deploymentsTable.liveUrl,
        errorMessage: deploymentsTable.errorMessage,
      })
      .from(deploymentsTable)
      .where(
        and(
          eq(deploymentsTable.id, dep.id),
          eq(deploymentsTable.projectId, t.id),
        ),
      )
      .limit(1);

    if (!finalDep) {
      console.log("  (deployment row vanished after pipeline)");
      continue;
    }
    if (finalDep.status === "live") {
      console.log(`  ✓ live at ${finalDep.liveUrl}`);
    } else {
      console.log(
        `  ✗ ended in status=${finalDep.status}` +
          (finalDep.errorMessage ? ` — ${finalDep.errorMessage}` : ""),
      );
    }
  }

  console.log("\nDone. Background screenshot captures may still be in flight; give them ~30s before checking projects.screenshot_url.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

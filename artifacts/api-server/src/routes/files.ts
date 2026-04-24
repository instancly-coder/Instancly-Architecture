import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  projectsTable,
  usersTable,
  projectFilesTable,
} from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { contentTypeFor, sanitizePath } from "../lib/file-blocks";

const router: IRouter = Router();

async function findProject(username: string, slug: string) {
  const rows = await db
    .select({ project: projectsTable })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
    .limit(1);
  return rows[0]?.project ?? null;
}

// Lightweight metadata listing for the Files panel.
router.get(
  "/projects/:username/:slug/files",
  async (req: Request, res: Response): Promise<void> => {
    const project = await findProject(
      String(req.params.username),
      String(req.params.slug),
    );
    if (!project) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const rows = await db
      .select({
        path: projectFilesTable.path,
        size: projectFilesTable.size,
        updatedAt: projectFilesTable.updatedAt,
      })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id))
      .orderBy(asc(projectFilesTable.path));
    res.json(
      rows.map((r) => ({
        path: r.path,
        size: r.size,
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  },
);

// Single file content for the editor view. Path is everything after
// `…/files/` so it can include slashes.
router.get(
  "/projects/:username/:slug/files/*splat",
  async (req: Request, res: Response): Promise<void> => {
    const project = await findProject(
      String(req.params.username),
      String(req.params.slug),
    );
    if (!project) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const splat = (req.params as Record<string, unknown>).splat;
    const raw = Array.isArray(splat)
      ? splat.join("/")
      : typeof splat === "string"
      ? splat
      : "";
    const path = sanitizePath(raw);
    if (!path) {
      res.status(400).json({ status: "error", message: "Invalid path" });
      return;
    }
    const row = (
      await db
        .select({ content: projectFilesTable.content })
        .from(projectFilesTable)
        .where(
          and(
            eq(projectFilesTable.projectId, project.id),
            eq(projectFilesTable.path, path),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      res.status(404).json({ status: "error", message: "File not found" });
      return;
    }
    res.json({ path, content: row.content });
  },
);

// Iframe preview origin: serves files as real assets so the browser treats
// them like a normal site. `/api/preview/:user/:slug/` and
// `/api/preview/:user/:slug/index.html` both resolve to index.html.
router.get(
  "/preview/:username/:slug{/*splat}",
  async (req: Request, res: Response): Promise<void> => {
    const project = await findProject(
      String(req.params.username),
      String(req.params.slug),
    );
    if (!project) {
      res
        .status(404)
        .type("html")
        .send(emptyHtml("Project not found"));
      return;
    }
    const splat = (req.params as Record<string, unknown>).splat;
    const tail = Array.isArray(splat)
      ? splat.join("/")
      : typeof splat === "string"
      ? splat
      : "";
    // Default to index.html for the project root; otherwise canonicalize
    // the requested path through the same sanitiser used at write time so
    // lookups always match what was stored.
    const path =
      !tail || tail === "/" ? "index.html" : sanitizePath(tail);
    if (!path) {
      res.status(400).type("text/plain").send("Invalid path");
      return;
    }

    const row = (
      await db
        .select({ content: projectFilesTable.content })
        .from(projectFilesTable)
        .where(
          and(
            eq(projectFilesTable.projectId, project.id),
            eq(projectFilesTable.path, path),
          ),
        )
        .limit(1)
    )[0];

    if (!row) {
      // For the entry document, render a friendly placeholder so the user
      // sees something useful before the first build completes.
      if (path === "index.html") {
        res.status(200).type("html").send(emptyHtml());
        return;
      }
      res.status(404).type("text/plain").send("Not found");
      return;
    }

    // Always send fresh content — the AI may have just regenerated this.
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", contentTypeFor(path));
    res.send(row.content);
  },
);

function emptyHtml(headline = "Your app will appear here"): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${headline}</title>
    <style>
      :root { color-scheme: light dark; }
      html, body { height: 100%; margin: 0; }
      body {
        display: grid; place-items: center;
        font-family: ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
        background: #0b0b0e; color: #f5f5f7;
        text-align: center; padding: 24px;
      }
      .card {
        max-width: 28rem;
        border: 1px dashed #2a2a31;
        border-radius: 14px;
        padding: 28px;
        background: #111114;
      }
      h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
      p  { margin: 0; font-size: 13px; color: #9b9ba3; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${headline}</h1>
      <p>Send a prompt in the chat and Instancly will generate the code, persist the files, and render the result here.</p>
    </div>
  </body>
</html>`;
}

export default router;

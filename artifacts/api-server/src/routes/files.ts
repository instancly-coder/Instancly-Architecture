import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  projectsTable,
  usersTable,
  projectFilesTable,
} from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { contentTypeFor, injectOrphanScripts, sanitizePath } from "../lib/file-blocks";
import { requireAuth, getAuthedUser } from "../middlewares/auth";
import {
  ListProjectFilesResponse,
  GetProjectFileResponse,
  UploadProjectFileResponse,
  DeleteProjectFileResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Per-file cap on uploaded binary content (decoded). 10MB is generous for
// images/fonts and leaves comfortable headroom under express.json's 30MB
// body limit (base64 inflates by ~4/3 → ~13.3MB on the wire). Exported so
// the public `/api/config` endpoint can advertise it to the frontend
// (Files panel pre-flight check) without duplicating the number.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function findProject(username: string, slug: string) {
  const rows = await db
    .select({ project: projectsTable })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
    .limit(1);
  return rows[0]?.project ?? null;
}

// Lightweight metadata listing for the Files panel. Includes encoding +
// content type so the UI can render a binary badge / image preview without
// fetching the full content.
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
        encoding: projectFilesTable.encoding,
        contentType: projectFilesTable.contentType,
        updatedAt: projectFilesTable.updatedAt,
      })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id))
      .orderBy(asc(projectFilesTable.path));
    res.json(
      ListProjectFilesResponse.parse(
        rows.map((r) => ({
          path: r.path,
          size: r.size,
          encoding: r.encoding,
          contentType: r.contentType,
          updatedAt: r.updatedAt.toISOString(),
        })),
      ),
    );
  },
);

// Single file content for the editor view. Path is everything after
// `…/files/` so it can include slashes. Returns the raw stored content
// (base64 string for binary, source string for text) plus the encoding
// so the client knows how to render it.
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
        .select({
          content: projectFilesTable.content,
          encoding: projectFilesTable.encoding,
          contentType: projectFilesTable.contentType,
        })
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
    res.json(
      GetProjectFileResponse.parse({
        path,
        content: row.content,
        encoding: row.encoding,
        contentType: row.contentType,
      }),
    );
  },
);

// User-driven upload of a binary asset (image, font, favicon, etc.).
// Body: { path, contentBase64, contentType? }. The size budget is enforced
// against the *decoded* byte length so users can't sneak past it by
// padding the base64 string. Owner-only.
router.post(
  "/projects/:username/:slug/files/upload",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const project = await findProject(
      String(req.params.username),
      String(req.params.slug),
    );
    if (!project) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== project.userId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }

    const body = (req.body ?? {}) as {
      path?: unknown;
      contentBase64?: unknown;
      contentType?: unknown;
    };
    const rawPath = typeof body.path === "string" ? body.path : "";
    const rawB64 = typeof body.contentBase64 === "string" ? body.contentBase64 : "";
    const rawCt = typeof body.contentType === "string" ? body.contentType : "";

    const path = sanitizePath(rawPath);
    if (!path) {
      res.status(400).json({ status: "error", message: "Invalid path" });
      return;
    }
    if (!rawB64) {
      res.status(400).json({ status: "error", message: "Missing contentBase64" });
      return;
    }
    // Reject obviously-bad input before allocating a Buffer the size of
    // the request body. ~13.5MB of base64 covers our 10MB decoded cap with
    // padding to spare.
    if (rawB64.length > 14 * 1024 * 1024) {
      res.status(413).json({
        status: "error",
        message: `File is too large. Limit is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
      });
      return;
    }
    // Round-trip verifies it's actually valid base64. Buffer.from is
    // lenient (skips bad chars) so we re-encode and compare.
    const buf = Buffer.from(rawB64, "base64");
    if (buf.length === 0 || buf.toString("base64").replace(/=+$/, "") !== rawB64.replace(/=+$/, "")) {
      res.status(400).json({ status: "error", message: "Invalid base64 content" });
      return;
    }
    if (buf.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({
        status: "error",
        message: `File is too large (${(buf.length / (1024 * 1024)).toFixed(1)}MB). Limit is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
      });
      return;
    }

    // Fall back to extension-derived MIME if the client didn't send one
    // (or sent something silly like the empty string from File.type).
    const contentType =
      rawCt && /^[\w.+-]+\/[\w.+-]+(?:;.*)?$/.test(rawCt)
        ? rawCt.slice(0, 200)
        : contentTypeFor(path);

    const [upserted] = await db
      .insert(projectFilesTable)
      .values({
        projectId: project.id,
        path,
        content: rawB64,
        encoding: "base64",
        contentType,
        size: buf.length,
      })
      .onConflictDoUpdate({
        target: [projectFilesTable.projectId, projectFilesTable.path],
        set: {
          content: rawB64,
          encoding: "base64",
          contentType,
          size: buf.length,
          updatedAt: sql`now()`,
        },
      })
      .returning({ updatedAt: projectFilesTable.updatedAt });

    res.json(
      UploadProjectFileResponse.parse({
        path,
        size: buf.length,
        encoding: "base64",
        contentType,
        updatedAt: upserted.updatedAt.toISOString(),
      }),
    );
  },
);

// Delete a single file from the project. Owner-only. Used by the Files
// panel's delete affordance — primarily so users can undo a mistaken
// upload without poking at the database.
router.delete(
  "/projects/:username/:slug/files/*splat",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const project = await findProject(
      String(req.params.username),
      String(req.params.slug),
    );
    if (!project) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const me = getAuthedUser(req);
    if (!me || me.id !== project.userId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
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
    const result = await db
      .delete(projectFilesTable)
      .where(
        and(
          eq(projectFilesTable.projectId, project.id),
          eq(projectFilesTable.path, path),
        ),
      )
      .returning({ path: projectFilesTable.path });
    if (result.length === 0) {
      res.status(404).json({ status: "error", message: "File not found" });
      return;
    }
    res.json(DeleteProjectFileResponse.parse({ status: "ok", path }));
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
        .select({
          content: projectFilesTable.content,
          encoding: projectFilesTable.encoding,
          contentType: projectFilesTable.contentType,
        })
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

    // Always send fresh content — the AI may have just regenerated this,
    // and uploaded assets get overwritten in place too.
    res.setHeader("Cache-Control", "no-store");
    // Prefer the stored content type for binary uploads (it was set from
    // the browser's File.type at upload time and is more accurate than
    // an extension-only guess for things like svg-vs-svg+xml).
    const ct =
      row.contentType && row.encoding === "base64"
        ? row.contentType
        : contentTypeFor(path);
    res.setHeader("Content-Type", ct);
    if (row.encoding === "base64") {
      res.send(Buffer.from(row.content, "base64"));
      return;
    }
    // For HTML files served to the dev preview iframe, inject a small
    // runtime-error overlay so JS errors / unhandled promise rejections
    // / console.error calls become visible. Without this, a single
    // typo or runtime crash in the AI's generated code shows up as a
    // blank page with no clue what went wrong. The overlay is
    // dev-preview-only — it's not in the published Vercel build.
    if (ct.startsWith("text/html")) {
      // Auto-wire any `.jsx` files the AI created without re-emitting
      // index.html. Defends against the second-build "Element type is
      // invalid" crash where a new component file exists in the project
      // but has no `<script type="text/babel" src="…">` tag pointing at
      // it. We only fetch paths (not content) so this stays cheap even
      // for large projects.
      const jsxRows = await db
        .select({ path: projectFilesTable.path })
        .from(projectFilesTable)
        .where(
          and(
            eq(projectFilesTable.projectId, project.id),
            sql`${projectFilesTable.path} like '%.jsx'`,
          ),
        );
      const jsxPaths = jsxRows.map((r) => r.path);
      const withScripts = injectOrphanScripts(row.content, jsxPaths);
      res.send(injectErrorOverlay(withScripts));
      return;
    }
    res.send(row.content);
  },
);

// Inline error overlay + Babel-runner injected into every dev-preview HTML
// response. Three jobs:
//
// 1. **Take over Babel-standalone's auto-loader.** Babel's default
//    `transformScriptTags` evals user code via `new Function(...)`, which
//    strips the source URL — runtime errors then bubble up to
//    `window.onerror` as the useless cross-origin "Script error." with no
//    detail. We rename `<script type="text/babel">` to a custom type so
//    Babel ignores it, then process each tag ourselves with an explicit
//    `filename` + `//# sourceURL=` pragma so errors carry the real file
//    and line numbers.
//
// 2. **Show a friendly overlay when the user's code throws.** First error
//    wins so the overlay stays readable even in an error loop. Includes
//    a "Fix with AI" button that posts the error context up to the
//    builder shell so it can auto-prompt Claude with a fix request.
//
// 3. **Catch the slippery cases**: `unhandledrejection`, `console.error`
//    (Babel logs syntax errors here instead of throwing), and onerror.
//
// We inject the script at the START of `<head>` so the renamer runs
// BEFORE the parser hits the user's `<script type="text/babel">` tags
// further down the page. A MutationObserver covers tags that get parsed
// after the script executes but before Babel's DOMContentLoaded handler
// fires.
const ERROR_OVERLAY_SCRIPT = `<script data-deploybro-error-overlay>
(function () {
  if (window.__deploybroOverlay) return;
  window.__deploybroOverlay = true;

  // --- A. Defer text/babel scripts so Babel-standalone won't touch them.
  // We swap the type to a custom one the browser ignores. Renaming
  // happens both immediately (for tags already in the DOM) and via
  // MutationObserver (for tags added during HTML parsing or by JS).
  var DEFERRED_TYPE = "application/x-deploybro-babel";
  function renameAll() {
    var nodes = document.querySelectorAll('script[type="text/babel"]');
    for (var i = 0; i < nodes.length; i++) {
      var s = nodes[i];
      if (s.getAttribute("data-deploybro-deferred")) continue;
      s.setAttribute("data-deploybro-deferred", "1");
      // Stash original presets so we can pass them to Babel.transform.
      var presets = s.getAttribute("data-presets") || "react";
      s.setAttribute("data-deploybro-presets", presets);
      s.setAttribute("type", DEFERRED_TYPE);
    }
  }
  renameAll();
  var mo = null;
  if (typeof MutationObserver !== "undefined") {
    mo = new MutationObserver(renameAll);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // --- B. Error reporting helpers.
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }
  var shown = false;
  var lastError = null;
  function postToParent(payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          Object.assign({ type: "deploybro:preview-error" }, payload),
          "*",
        );
      }
    } catch (_) {}
  }
  function show(title, message, stack, where) {
    if (shown) return;
    shown = true;
    lastError = { title: title, message: message, stack: stack || "", where: where || "" };
    postToParent(lastError);
    function paint() {
      var el = document.createElement("div");
      el.setAttribute("data-deploybro-error-overlay-root", "");
      el.style.cssText =
        "position:fixed;inset:0;background:rgba(15,15,20,0.96);color:#fff;" +
        "font:14px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif;" +
        "z-index:2147483647;padding:24px;overflow:auto;";
      el.innerHTML =
        '<div style="max-width:760px;margin:0 auto;">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
            '<div style="width:10px;height:10px;background:#ef4444;border-radius:9999px;"></div>' +
            '<div style="font-weight:600;letter-spacing:0.05em;text-transform:uppercase;font-size:11px;color:#fca5a5;">' +
              esc(title) +
            "</div>" +
            (where ? '<div style="font:11px/1 ui-monospace,Menlo,Consolas,monospace;color:#9ca3af;margin-left:auto;">' + esc(where) + "</div>" : "") +
          "</div>" +
          '<pre style="background:#1f1f24;border:1px solid #2a2a30;border-radius:8px;padding:14px;' +
            'white-space:pre-wrap;word-break:break-word;color:#fee2e2;' +
            'font:12px/1.55 ui-monospace,Menlo,Consolas,monospace;margin:0;">' +
            esc(message) + (stack ? "\\n\\n" + esc(stack) : "") +
          "</pre>" +
          '<div style="margin-top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
            '<button type="button" data-deploybro-fix-btn ' +
              'style="background:#6366f1;color:#fff;border:0;border-radius:8px;padding:8px 14px;' +
              'font:600 12px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;">' +
              "Fix this with AI" +
            "</button>" +
            '<span style="font-size:12px;color:#9ca3af;">' +
              "or describe the problem in chat — DeployBro will read this error." +
            "</span>" +
          "</div>" +
        "</div>";
      var btn = el.querySelector("[data-deploybro-fix-btn]");
      if (btn) {
        btn.addEventListener("click", function () {
          postToParent(Object.assign({}, lastError, { autofix: true }));
        });
      }
      (document.body || document.documentElement).appendChild(el);
    }
    if (document.body) paint();
    else document.addEventListener("DOMContentLoaded", paint);
  }
  window.addEventListener("error", function (e) {
    var msg = (e.error && e.error.message) || e.message || "Unknown error";
    var stack = (e.error && e.error.stack) || "";
    var where = e.filename
      ? e.filename + ":" + (e.lineno || "?") + ":" + (e.colno || "?")
      : "";
    show("Runtime error", msg, stack, where);
  });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason || {};
    var msg = (r && r.message) || (typeof r === "string" ? r : "Unhandled promise rejection");
    show("Unhandled rejection", msg, (r && r.stack) || "", "");
  });
  // Babel-standalone reports JSX parse errors via console.error rather
  // than throwing. Hook so they surface to the user too.
  var origErr = console.error.bind(console);
  console.error = function () {
    try { origErr.apply(null, arguments); } catch (_) {}
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (a && a.stack) parts.push(String(a.stack));
      else if (typeof a === "string") parts.push(a);
      else { try { parts.push(JSON.stringify(a)); } catch (_) { parts.push(String(a)); } }
    }
    var text = parts.join(" ");
    if (/^(Warning:|\\[HMR\\])/.test(text)) return;
    show("Console error", text, "", "");
  };

  // --- C. Run the deferred text/babel scripts ourselves with proper
  // sourceURL + filename so errors carry real location info.
  //
  // CRITICAL: scripts must execute in **document order**, not in the order
  // their network fetches happen to complete. Multi-file React apps like
  // index.html → components/Nav.jsx → pages/Home.jsx → app.jsx rely on
  // earlier scripts defining \`Nav\`, \`Home\` etc. as globals before
  // app.jsx's <Routes> renders them. Naive async XHR-with-onload races
  // those fetches against each other and frequently runs app.jsx first,
  // producing "ReferenceError: Home is not defined".
  //
  // Strategy: fetch all external scripts in parallel for speed, queue the
  // execution, and process the queue strictly left-to-right so each
  // script's globals are visible to every script after it.
  // Scan source for top-level PascalCase declarations and force-expose
  // them as window globals. The canonical multi-file pattern relies on
  // \`function Home() {}\` becoming window.Home automatically (which
  // happens via sloppy-mode indirect eval), but the AI sometimes writes
  // \`const Home = () => {}\` instead — \`const\` is block-scoped and
  // does NOT leak to window. By auto-appending \`window.Home = Home\`
  // for every top-level component declaration, both styles work and
  // every later script can reference Home regardless of how it was
  // declared. PascalCase only — leaves regular helpers (camelCase) and
  // local consts alone.
  function exposeGlobals(source) {
    var names = {};
    var patterns = [
      /^(?:export\\s+(?:default\\s+)?)?function\\s+([A-Z][A-Za-z0-9_]*)\\s*\\(/gm,
      /^(?:export\\s+)?(?:const|let|var)\\s+([A-Z][A-Za-z0-9_]*)\\s*=/gm,
      /^(?:export\\s+(?:default\\s+)?)?class\\s+([A-Z][A-Za-z0-9_]*)\\b/gm,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var re = patterns[i];
      var m;
      while ((m = re.exec(source))) names[m[1]] = true;
    }
    var keys = Object.keys(names);
    if (!keys.length) return source;
    var tail = "\\n;";
    for (var j = 0; j < keys.length; j++) {
      var n = keys[j];
      // typeof guard handles the case where the binding ended up in
      // a temporal dead zone or wasn't actually declared at top level.
      tail += "try{if(typeof " + n + "!==\\"undefined\\")window." + n + "=" + n + ";}catch(_){}";
    }
    return source + tail;
  }
  function transformAndExec(source, filename, presets) {
    var prepared = exposeGlobals(source);
    var transformed;
    try {
      transformed = window.Babel.transform(prepared, {
        presets: presets,
        filename: filename,
        sourceMaps: false,
      }).code;
    } catch (compileErr) {
      var loc = compileErr && compileErr.loc;
      var where = loc ? filename + ":" + loc.line + ":" + loc.column : filename;
      show("Compile error", String(compileErr.message || compileErr), "", where);
      return;
    }
    // sourceURL pragma makes runtime errors carry the right filename.
    var withPragma = transformed + "\\n//# sourceURL=" + filename;
    try {
      // Indirect eval so user code runs in the global scope (matches
      // Babel-standalone's default behaviour for <script> tags). This
      // is what makes top-level \`function Home() {}\` declarations
      // become \`window.Home\`, which the canonical multi-file pattern
      // depends on. exposeGlobals() above handles \`const Home = ...\`
      // and other declaration styles that don't auto-leak.
      (0, eval)(withPragma);
    } catch (runtimeErr) {
      var stack = runtimeErr && runtimeErr.stack ? String(runtimeErr.stack) : "";
      show("Runtime error", String(runtimeErr.message || runtimeErr), stack, filename);
    }
  }
  function loadOne(node) {
    if (node.getAttribute("data-deploybro-processed")) return null;
    node.setAttribute("data-deploybro-processed", "1");
    var src = node.getAttribute("src") || "";
    var inline = node.textContent || "";
    var filename = src || "inline-script-" + Math.random().toString(36).slice(2, 7) + ".jsx";
    var presets = (node.getAttribute("data-deploybro-presets") || "react")
      .split(",").map(function (p) { return p.trim(); }).filter(Boolean);
    if (!src) {
      return { filename: filename, presets: presets, src: "", promise: Promise.resolve(inline) };
    }
    var p = fetch(src, { credentials: "same-origin", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      });
    return { filename: filename, presets: presets, src: src, promise: p };
  }
  // The dev-preview iframe loads at \`/api/preview/USER/SLUG/\` which
  // means \`window.location.pathname\` carries that prefix. AI-generated
  // apps use \`<BrowserRouter>\` with routes like \`<Route path="/">\` —
  // those never match the prefixed pathname, so the app silently
  // renders nothing (blank screen, no error). We monkey-patch
  // \`ReactRouterDOM.BrowserRouter\` to point at \`HashRouter\` before
  // user scripts execute. HashRouter ignores the path and reads from
  // the URL fragment, so client-side routing works regardless of where
  // the iframe is mounted. The patch is dev-preview-only — the
  // published Vercel build sits at the project root and BrowserRouter
  // works as the AI wrote it.
  function patchReactRouterForPreview() {
    var rrd = window.ReactRouterDOM;
    if (!rrd || !rrd.HashRouter || rrd.BrowserRouter === rrd.HashRouter) return;
    // Try in-place reassignment first — preserves any non-enumerable
    // properties / getters the UMD bundle may expose. Falls back to a
    // shallow-cloned namespace if the property is read-only.
    try {
      rrd.BrowserRouter = rrd.HashRouter;
      if (rrd.BrowserRouter === rrd.HashRouter) return;
    } catch (_) { /* fall through to clone */ }
    try {
      var descriptors = Object.getOwnPropertyDescriptors(rrd);
      var patched = Object.create(Object.getPrototypeOf(rrd) || Object.prototype, descriptors);
      patched.BrowserRouter = rrd.HashRouter;
      window.ReactRouterDOM = patched;
    } catch (_) {
      // Namespace frozen and global non-writable — nothing more we can
      // do. The error overlay will surface any subsequent render error.
    }
  }
  function processDeferred() {
    if (!window.Babel || !window.Babel.transform) {
      // Babel hasn't finished loading yet — try again shortly. Keep the
      // MutationObserver running in the meantime so any text/babel tags
      // injected by other scripts (or still being parsed) get renamed
      // before Babel's own DOMContentLoaded handler can grab them.
      return setTimeout(processDeferred, 30);
    }
    patchReactRouterForPreview();
    if (mo) { try { mo.disconnect(); } catch (_) {} mo = null; }
    var nodes = document.querySelectorAll('script[type="' + DEFERRED_TYPE + '"]');
    // Kick off every fetch immediately (parallel) but execute strictly
    // in declared order by chaining each promise off the previous one.
    var chain = Promise.resolve();
    for (var i = 0; i < nodes.length; i++) {
      var item = loadOne(nodes[i]);
      if (!item) continue;
      (function (it) {
        chain = chain.then(function () {
          return it.promise.then(
            function (source) { transformAndExec(source, it.filename, it.presets); },
            function (err) {
              show(
                "Failed to load " + (it.src || it.filename),
                String((err && err.message) || err || "Network error"),
                "",
                it.filename
              );
            }
          );
        });
      })(item);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processDeferred);
  } else {
    processDeferred();
  }
})();
</script>`;

// react-router-dom v6's UMD bundle is just the DOM-specific layer — it
// expects `window.ReactRouter` (from `react-router`) and
// `window.RemixRouter` (from `@remix-run/router`) to already be loaded.
// Older AI-generated projects only included the `react-router-dom` script
// and crash at runtime with "undefined is not an object (evaluating
// 'r.Routes')". We patch their HTML on-the-fly so existing previews work
// without forcing the user to regenerate.
function fixUpReactRouterCdn(html: string): string {
  const hasRrd = /unpkg\.com\/react-router-dom@/i.test(html);
  if (!hasRrd) return html;
  const hasReactRouter =
    /unpkg\.com\/react-router@(?!dom)/i.test(html) ||
    /unpkg\.com\/react-router\/dist\//i.test(html) ||
    /unpkg\.com\/react-router\b(?!-dom)/i.test(html);
  const hasRemixRouter = /unpkg\.com\/@remix-run\/router/i.test(html);
  if (hasReactRouter && hasRemixRouter) return html;
  // Build only the missing scripts and inject them immediately before the
  // first `react-router-dom` script tag so load order stays correct.
  const missing: string[] = [];
  if (!hasRemixRouter) {
    missing.push(
      `<script crossorigin src="https://unpkg.com/@remix-run/router@1/dist/router.umd.min.js"></script>`,
    );
  }
  if (!hasReactRouter) {
    missing.push(
      `<script crossorigin src="https://unpkg.com/react-router@6/dist/umd/react-router.production.min.js"></script>`,
    );
  }
  return html.replace(
    /<script\b[^>]*\bsrc=["'][^"']*unpkg\.com\/react-router-dom@[^"']*["'][^>]*>\s*<\/script>/i,
    (m) => `${missing.join("\n")}\n${m}`,
  );
}

// Hot-patch the lucide-react + recharts CDN tags in already-stored
// index.html files so the dev preview keeps working without asking the
// AI to re-emit index.html.
//
// Two real bugs we saw in the wild:
// 1. lucide-react's UMD wrapper internally reads `globalThis.react`
//    (lowercase) instead of `globalThis.React`, so without a tiny
//    shim line it throws "undefined is not an object (forwardRef)"
//    on load. We inject `<script>window.react=window.React;</script>`
//    immediately BEFORE any lucide-react script tag.
// 2. unpkg's `recharts@2/umd/Recharts.min.js` major-range redirect
//    is broken and serves a 404 page (an HTML body) as JS, which
//    then explodes at parse time. We rewrite that URL to the
//    equivalent jsdelivr URL pinned to 2.15.4.
function hotPatchVisualCdns(html: string): string {
  let out = html;

  // Idempotent shim insert: only add it if a lucide script is present
  // AND the shim isn't already there.
  const hasLucide =
    /<script\b[^>]*\bsrc=["'][^"']*\blucide-react@[^"']*["'][^>]*>\s*<\/script>/i.test(
      out,
    );
  const hasShim = /window\.react\s*=\s*window\.React/.test(out);
  if (hasLucide && !hasShim) {
    out = out.replace(
      /(<script\b[^>]*\bsrc=["'][^"']*\blucide-react@[^"']*["'][^>]*>\s*<\/script>)/i,
      `<script data-deploybro-lucide-shim>window.react=window.React;</script>\n$1`,
    );
  }

  // Rewrite broken unpkg recharts URLs to the working jsdelivr URL.
  // Matches `unpkg.com/recharts@<anything>/umd/Recharts(.min)?.js` and
  // pins the replacement to a known-good version.
  out = out.replace(
    /(<script\b[^>]*\bsrc=["'])https?:\/\/unpkg\.com\/recharts@[^/]*\/umd\/Recharts(?:\.min)?\.js(["'][^>]*>\s*<\/script>)/gi,
    `$1https://cdn.jsdelivr.net/npm/recharts@2.15.4/umd/Recharts.min.js$2`,
  );

  return out;
}

// Tiny runtime shim that exposes the preview iframe's URL prefix as
// `window.__APP_BASENAME__` so user code can pass it as `basename` to
// `<BrowserRouter>` (or any equivalent router). Two scenarios:
//
//   - In the in-builder iframe (`/api/preview/{u}/{s}/`): the regex
//     matches and the global becomes `/api/preview/{u}/{s}`. NOTE: today
//     `processDeferred` also monkey-patches `ReactRouterDOM.BrowserRouter`
//     to `HashRouter` for the iframe (see `patchReactRouterForPreview`
//     above). HashRouter ignores `basename` entirely and routes off the
//     URL fragment, so the iframe currently works either way. The shim
//     is kept as a forward-compatible second layer so removing the
//     HashRouter patch later won't immediately re-break preview routing.
//
//   - In the production Vercel build (sits at the project root): the
//     regex misses and the global stays `""`, so `basename={"" || ""}`
//     is identical to the BrowserRouter default. This is the path that
//     ACTUALLY relies on the shim — without `basename` set, deeply-nested
//     deployed apps still work, but the same template source can opt into
//     the basename pattern and stay portable across both environments.
//
// Keep this script minuscule and side-effect-free — it runs before
// everything else on the page.
const BASENAME_SHIM_SCRIPT = `<script data-deploybro-basename-shim>
(function () {
  try {
    var m = window.location.pathname.match(/^\\/api\\/preview\\/[^\\/]+\\/[^\\/]+/);
    window.__APP_BASENAME__ = m ? m[0] : "";
  } catch (e) {
    window.__APP_BASENAME__ = "";
  }
})();
</script>`;

// ShadcnUI bundle — auto-injected into every preview just before </head>.
// The bundle requires React, which is loaded earlier in <head> by the AI's
// generated index.html, so injecting at the END of <head> (not the start)
// ensures window.React is already defined when this script executes.
const SHADCN_SCRIPT_TAG = `<script data-deploybro-shadcn src="/api/assets/shadcn-ui.js"></script>`;

function injectShadcnBundle(html: string): string {
  if (/data-deploybro-shadcn/.test(html)) return html; // already present
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${SHADCN_SCRIPT_TAG}\n</head>`);
  }
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${SHADCN_SCRIPT_TAG}\n</body>`);
  }
  return html + "\n" + SHADCN_SCRIPT_TAG;
}

function injectErrorOverlay(html: string): string {
  const withShadcn = injectShadcnBundle(hotPatchVisualCdns(fixUpReactRouterCdn(html)));
  if (/data-deploybro-error-overlay/.test(withShadcn)) return withShadcn;
  // Inject at the START of <head> so:
  //   1) `__APP_BASENAME__` is defined before any other script reads it
  //   2) the script-tag renamer runs BEFORE the parser reaches any
  //      `<script type="text/babel">` tags further down the page
  // Order matters — basename shim FIRST (so user code can read it from
  // the very first JSX file evaluated), error overlay second.
  const headInjection = `${BASENAME_SHIM_SCRIPT}\n${ERROR_OVERLAY_SCRIPT}`;
  if (/<head[^>]*>/i.test(withShadcn)) {
    return withShadcn.replace(/<head[^>]*>/i, (m) => `${m}\n${headInjection}`);
  }
  if (/<\/body>/i.test(withShadcn)) {
    return withShadcn.replace(/<\/body>/i, `${headInjection}\n</body>`);
  }
  return headInjection + "\n" + withShadcn;
}

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
      <p>Send a prompt in the chat and DeployBro will generate the code, persist the files, and render the result here.</p>
    </div>
  </body>
</html>`;
}

export default router;

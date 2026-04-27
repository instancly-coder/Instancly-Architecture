// Translates the project_files rows that the AI generated (or the user
// uploaded) into the inlined file payload Vercel expects.
//
// Three project shapes are handled, in order:
//
// 1. **CDN-style React project** (the default AI output). The AI emits
//    `index.html` + one or more `.jsx` files using React + ReactDOM +
//    Babel-standalone from unpkg. This is great for the dev preview
//    iframe (no build, instant feedback) but produces a slow,
//    unminified, ~500KB-Babel-on-every-load production site if shipped
//    as-is. So at publish time we transparently wrap it in a real Vite
//    project: synthesise `package.json` / `vite.config.ts` / a
//    Vite-compatible `index.html`, and a `src/main.jsx` shim that
//    polyfills `window.React` / `window.ReactDOM` so the user's CDN-style
//    code keeps working unchanged inside the bundle. Vercel runs
//    `vite build` and the user gets a properly-bundled, minified,
//    code-split production site.
//
// 2. **Pre-built static site** (e.g. uploaded HTML/CSS only). Shipped
//    as-is with a `vercel.json` that disables the build step.
//
// 3. **Real Vite project** (the user brought their own `package.json`).
//    Shipped as-is — Vercel auto-detects Vite and builds it.

import type { VercelInlinedFile } from "./vercel";

// Rows we accept from the publish pipeline. `encoding` mirrors the new
// project_files column: "utf8" means `content` is the raw source string,
// "base64" means `content` is already base64-encoded bytes (binary
// uploads — images, fonts, etc.).
export type ProjectFileLite = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64" | null;
};

const DEFAULT_PACKAGE_JSON = {
  name: "deploybro-app",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview",
  },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    // Mirror the dev-preview CDNs (see lib/components-catalog.ts):
    // every AI build is taught to read icons from `window.LucideReact`
    // and charts from `window.Recharts`, so the published bundle has
    // to ship the matching npm packages so those names resolve at
    // build time. If you change one, change the other in lockstep.
    "lucide-react": "^0.460.0",
    // Pin the minor to match the dev-preview CDN URL in
    // routes/files.ts → hotPatchVisualCdns. Bump in lockstep.
    recharts: "^2.15.4",
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.3.4",
    vite: "^5.4.10",
    // Tailwind v4 with the first-party Vite plugin replaces the
    // dev-preview's Play CDN (which is fine for prototyping but compiles
    // CSS at runtime in the browser, prints a "do not use in production"
    // banner, and ships ~300KB of unused JS). The plugin auto-scans the
    // bundle's HTML/JS/JSX for class names so no tailwind.config.js is
    // needed — `@import "tailwindcss";` in styles.css is the whole
    // setup. Visual parity with the dev preview is very close: nearly
    // every v3 utility class works identically in v4.
    tailwindcss: "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
  },
};

// Vite's default build target (chrome87/firefox78/safari14/etc) does not
// allow top-level await, but our auto-generated `src/main.jsx` uses one
// to load the user bundle AFTER the window.React polyfill is in place.
// Bumping to `esnext` keeps the syntax legal — fine for an AI-generated
// SPA that's only ever served to modern evergreen browsers.
const DEFAULT_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: "esnext" },
});
`;

// One-line Tailwind v4 entry. The plugin handles content detection
// automatically, so we don't ship a tailwind.config.js — bundle scan
// is the v4 default. Imported by src/main.jsx so Vite emits it as a
// real CSS asset (link tag in the head) instead of inlining at runtime.
const DEFAULT_TAILWIND_CSS = `@import "tailwindcss";\n`;

const DEFAULT_VERCEL_JSON = {
  rewrites: [{ source: "/(.*)", destination: "/index.html" }],
};

// Hard cap on the total size of the inlined payload we'll send to Vercel.
// Vercel itself rejects requests well above 100MB; we leave a safety margin
// so the user gets our friendly message instead of an opaque 413 / network
// error mid-pipeline. Counted as the sum of the raw (decoded) file
// contents — base64 inflates by ~4/3 but headers, JSON envelope, and other
// fields take additional space so 90MB raw is comfortably under the limit.
export const PAYLOAD_SIZE_LIMIT_BYTES = 90 * 1024 * 1024;

// Thrown when the total raw size of project files exceeds our safe limit.
export class PayloadTooLargeError extends Error {
  readonly totalBytes: number;
  readonly limitBytes: number;
  constructor(totalBytes: number, limitBytes: number) {
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const limitMb = Math.floor(limitBytes / (1024 * 1024));
    super(
      `Project is too large to publish (${totalMb}MB; limit is ${limitMb}MB). Remove large files and try again.`,
    );
    this.name = "PayloadTooLargeError";
    this.totalBytes = totalBytes;
    this.limitBytes = limitBytes;
  }
}

function toBase64FromUtf8(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

// Returns the base64-encoded payload Vercel expects, plus the raw
// (decoded) byte length for size accounting. Branches on `encoding` so
// binary uploads — already base64 in the DB — pass through unchanged
// instead of being re-encoded as UTF-8 (which would corrupt them).
function encodeForVercel(file: ProjectFileLite): {
  data: string;
  rawBytes: number;
} {
  if (file.encoding === "base64") {
    // Re-decode just to get the raw byte length for the size budget.
    // This is a small price to pay for an honest size check, and
    // base64 decoding is fast.
    const rawBytes = Buffer.from(file.content, "base64").length;
    return { data: file.content, rawBytes };
  }
  const rawBytes = Buffer.byteLength(file.content, "utf8");
  return { data: toBase64FromUtf8(file.content), rawBytes };
}

// True for AI-generated CDN-style projects: an `index.html` + at least
// one `.jsx`/`.tsx` file, with no `package.json`. These are emitted by
// the AI builder and need to be wrapped in a Vite project before
// shipping to Vercel for a proper bundle.
function isCdnReactProject(files: ProjectFileLite[]): boolean {
  const hasIndexHtml = files.some((f) => f.path === "index.html");
  const hasPackage = files.some((f) => f.path === "package.json");
  const hasJsx = files.some((f) => /\.(jsx|tsx)$/.test(f.path));
  return hasIndexHtml && !hasPackage && hasJsx;
}

// True for pure static sites — HTML/CSS/JS only, no JSX, no package.json.
// Shipped as-is with the build step disabled.
function isStaticOnly(files: ProjectFileLite[]): boolean {
  const hasIndexHtml = files.some((f) => f.path === "index.html");
  const hasPackage = files.some((f) => f.path === "package.json");
  const hasJsx = files.some((f) => /\.(jsx|tsx)$/.test(f.path));
  return hasIndexHtml && !hasPackage && !hasJsx;
}

// Pick the order in which user .jsx files should be concatenated for
// the build. The AI's CDN-style code shares globals across files (a
// `function TaskList() {}` in `components/TaskList.jsx` becomes a
// global the way classic `<script>` tags work), so when we merge them
// into one bundle, dependents must come AFTER their dependencies. The
// AI's typical entry file is `app.jsx` / `main.jsx` / `index.jsx` and
// it's responsible for actually mounting React, so we always put those
// last. Everything else is sorted alphabetically as a stable, easy-to-
// reason-about default. Multi-file projects with non-trivial inter-
// dependencies might still need the AI to be more explicit, but this
// covers the >90% case of "components folder + app.jsx".
function orderJsxFilesForConcat(jsxPaths: string[]): string[] {
  const isEntry = (p: string) =>
    /(^|\/)(app|main|index)\.(jsx|tsx)$/i.test(p);
  const others = jsxPaths.filter((p) => !isEntry(p)).sort();
  const entries = jsxPaths.filter(isEntry).sort();
  return [...others, ...entries];
}

// Strip CDN script tags that would conflict with the bundled output and
// inject the Vite module entry. The transform is regex-based on
// purpose: it has to handle whatever (mostly well-formed) HTML the AI
// generated without dragging a full HTML parser into the API server,
// and the AI's CDN snippet is highly stereotyped so the regexes are
// reliable for the templates the system prompt teaches it to emit.
function transformIndexHtmlForVite(html: string): string {
  let out = html;

  // React UMD CDN (production or development variants on unpkg / esm.sh /
  // jsdelivr). We strip these because the bundle re-imports React/ReactDOM
  // through `react`/`react-dom` and we don't want a second copy loaded.
  const REACT_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\b(?:unpkg\.com|esm\.sh|cdn\.jsdelivr\.net\/npm)\/react(?:-dom)?@?\d?[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(REACT_CDN_RE, "");

  // React Router UMD CDNs — same reasoning. The bundle imports
  // `react-router-dom` from npm so we don't want the UMD copies fighting
  // for the `ReactRouterDOM` global. v6's UMD ships in three pieces
  // (@remix-run/router, react-router, react-router-dom) so we strip all
  // three.
  const RRD_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\b(?:unpkg\.com|esm\.sh|cdn\.jsdelivr\.net\/npm)\/react-router(?:-dom)?@?\d?[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(RRD_CDN_RE, "");
  const REMIX_ROUTER_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\b(?:unpkg\.com|esm\.sh|cdn\.jsdelivr\.net\/npm)\/@remix-run\/router@?\d?[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(REMIX_ROUTER_CDN_RE, "");

  // Babel-standalone — only needed in the dev preview's no-build setup.
  // Bundled JSX is transformed at build time so this script just adds
  // ~500KB of dead weight in production.
  const BABEL_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*@babel\/standalone[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(BABEL_CDN_RE, "");

  // Lucide + Recharts UMD CDNs (and recharts' prop-types peer dep) —
  // the bundle imports them from npm via the user-bundle preamble, so
  // we strip the CDN tags to avoid loading duplicate copies that fight
  // for the `LucideReact` / `Recharts` / `PropTypes` globals.
  const LUCIDE_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\b(?:unpkg\.com|esm\.sh|cdn\.jsdelivr\.net\/npm)\/lucide-react@?[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(LUCIDE_CDN_RE, "");
  const RECHARTS_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\b(?:unpkg\.com|esm\.sh|cdn\.jsdelivr\.net\/npm)\/recharts@?[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(RECHARTS_CDN_RE, "");
  const PROPTYPES_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\b(?:unpkg\.com|esm\.sh|cdn\.jsdelivr\.net\/npm)\/prop-types@?[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(PROPTYPES_CDN_RE, "");

  // The dev-preview hot-patch (and the AI's canonical example) inject
  // a `<script>window.react=window.React;</script>` shim before the
  // lucide-react CDN tag — see routes/files.ts → hotPatchVisualCdns.
  // It's harmless in production (the bundle defines window.React in
  // main.jsx anyway) but pointless dead weight, so strip it too.
  const LUCIDE_SHIM_RE =
    /<script\b[^>]*\bdata-deploybro-lucide-shim\b[^>]*>[\s\S]*?<\/script>\s*/gi;
  out = out.replace(LUCIDE_SHIM_RE, "");
  // Also strip the bare un-marked variant that comes straight out of
  // the AI's canonical example (no data attribute, just the one-line
  // assignment).
  const BARE_LUCIDE_SHIM_RE =
    /<script>\s*window\.react\s*=\s*window\.React\s*;?\s*<\/script>\s*/gi;
  out = out.replace(BARE_LUCIDE_SHIM_RE, "");

  // Tailwind Play CDN — the dev preview injects this so the AI's
  // Tailwind classes work without a build step. In the published
  // bundle we ship a real Tailwind v4 build (see DEFAULT_TAILWIND_CSS
  // / DEFAULT_VITE_CONFIG), so the runtime compiler isn't just
  // unnecessary, it's actively harmful: it prints a "do not use in
  // production" console warning, doubles the painted CSS, and races
  // the bundled stylesheet on first paint. Strip it.
  const TAILWIND_CDN_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\bcdn\.tailwindcss\.com[^"']*["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(TAILWIND_CDN_RE, "");

  // `<script type="text/babel" src="…">` references the user's .jsx
  // files, which are now part of the bundle entry instead. Strip both
  // the src form and any inline `<script type="text/babel">…</script>`
  // blocks that would otherwise need babel-standalone to execute.
  const BABEL_SCRIPT_RE =
    /<script\b[^>]*\btype=["']text\/babel["'][^>]*>[\s\S]*?<\/script>\s*/gi;
  out = out.replace(BABEL_SCRIPT_RE, "");

  // Drop any explicit reference to `app.jsx` / `main.jsx` / `index.jsx`
  // as a regular `<script>` (some AI variants emit
  // `<script src="app.jsx">` without `type="text/babel"`). The bundle
  // entry handles those files instead.
  const STRAY_JSX_SCRIPT_RE =
    /<script\b[^>]*\bsrc=["'][^"']*\.(?:jsx|tsx)["'][^>]*>\s*<\/script>\s*/gi;
  out = out.replace(STRAY_JSX_SCRIPT_RE, "");

  // Inject the Vite entry just before `</body>`. If there's no body tag
  // (very small pages might omit it), append at the end as a fallback.
  const VITE_ENTRY = `<script type="module" src="/src/main.jsx"></script>\n`;
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `  ${VITE_ENTRY}</body>`);
  } else {
    out += `\n${VITE_ENTRY}`;
  }

  return out;
}

// Produce the bundle entry that polyfills the CDN-style globals
// (`window.React`, `window.ReactDOM`, `window.ReactDOM.createRoot`) and
// then dynamically imports the merged user code. We use a dynamic
// `await import("./user-bundle.jsx")` so the polyfills are guaranteed
// to be in place BEFORE any user code runs — a static `import` would be
// hoisted to the top of the bundle and execute before our `window.X = …`
// assignments, breaking files that read `React.useState` at module scope.
const VITE_MAIN_JSX = `// Auto-generated by deploybro at publish time. Do not commit.
// Bridges the CDN-style globals (window.React, window.ReactDOM) that
// the AI's app code relies on, then loads the merged user bundle.
//
// styles.css is imported FIRST so Vite emits the compiled Tailwind
// stylesheet as a regular <link> in the document head — that way the
// page paints with styles already applied, instead of flashing
// unstyled content while React boots.
import "./styles.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";

if (typeof window !== "undefined") {
  // Spread react-dom (legacy ReactDOM.render) and react-dom/client
  // (React 18 createRoot) so both code styles work.
  window.React = React;
  window.ReactDOM = Object.assign({}, ReactDOM, ReactDOMClient);
}

await import("./user-bundle.jsx");
`;

// Strip top-level declarations from user .jsx files that would
// collide with the names our preamble injects (`React`, `ReactDOM`,
// `useState`, …). The CDN-style code the AI emits commonly contains
// `const { useState, useEffect } = React;` at the top of each file —
// harmless under `<script type="text/babel">` but a syntax error after
// concatenation when the preamble already declares the same names at
// module scope. We also strip stray `import … from "react"` /
// `react-dom` lines that some AI variants emit "just in case" — those
// would clash with the preamble's namespace import of the same module.
//
// The regex is intentionally conservative: it only matches **whole-line**
// patterns, anchored to the start of a line (allowing leading
// whitespace), so destructures used inside functions or nested blocks
// are left untouched. Stripped lines are commented out (not deleted)
// so build-error stack traces still map to original source lines.
function sanitizeForPreamble(code: string): string {
  const STRIP_PATTERNS: RegExp[] = [
    // `import * as X from "react"`, `import X from "react"`,
    // `import { useState } from "react"`, with or without trailing `;`.
    // Covers react, react-dom, react-dom/client, and react-router-dom.
    /^[ \t]*import\s+[^;\n]*?\s+from\s+["'](?:react|react-dom|react-dom\/client|react-router-dom|react-router)["'];?[ \t]*$/gm,
    // Bare side-effect import: `import "react";` (rare but legal).
    /^[ \t]*import\s+["'](?:react|react-dom|react-dom\/client|react-router-dom|react-router)["'];?[ \t]*$/gm,
    // `const|let|var { useState, useEffect, … } = React;`
    // (also matches `window.React`, `ReactDOM`, `ReactRouterDOM`,
    // and the corresponding `window.X` forms).
    /^[ \t]*(?:const|let|var)\s*\{[^}]*\}\s*=\s*(?:window\.)?(?:React|ReactDOM|ReactRouterDOM)\s*;?[ \t]*$/gm,
  ];
  let out = code;
  for (const re of STRIP_PATTERNS) {
    out = out.replace(re, (m) => `// [deploybro] stripped: ${m.trim()}`);
  }
  return out;
}

// Wrap the original CDN-style project in a Vite project and replace
// `index.html` with a build-friendly version. Returns the rewritten
// file list. Caller still runs the size budget + base64 encode pass.
function transformCdnReactToVite(
  files: ProjectFileLite[],
): ProjectFileLite[] {
  const out: ProjectFileLite[] = [];
  const jsxBodies: Array<{ path: string; content: string }> = [];
  let originalIndexHtml = "";

  for (const f of files) {
    if (f.path === "index.html") {
      // The dev preview iframe reads the original index.html, so we
      // never overwrite it in the database. We replace it ONLY in the
      // publish payload below.
      originalIndexHtml = f.encoding === "base64"
        ? Buffer.from(f.content, "base64").toString("utf8")
        : f.content;
      continue;
    }
    if (/\.(jsx|tsx)$/.test(f.path) && f.encoding !== "base64") {
      // Collect for concatenation; don't ship the standalone file (the
      // bundle includes it).
      jsxBodies.push({ path: f.path, content: f.content });
      continue;
    }
    // Everything else (CSS, images, fonts, plain JS, .json, .svg, .md)
    // ships as-is so the bundle and the rest of the page can reference
    // them via relative URLs the same way the dev preview does.
    out.push(f);
  }

  // Rebuild index.html with CDN React/Babel scripts stripped and the
  // Vite module entry injected.
  out.push({
    path: "index.html",
    content: transformIndexHtmlForVite(originalIndexHtml),
    encoding: "utf8",
  });

  // Concatenate all user .jsx files in dependency-friendly order. Each
  // file gets a header comment so build errors can be traced back to
  // the original source.
  //
  // Critical: the CDN-style code the AI generates relies on `React`,
  // `ReactDOM`, and the React hooks (`useState`, `useEffect`, …) being
  // available as bare globals — that's how `<script src="react.umd.js">`
  // works in the dev preview. In a Vite-bundled ES module those names
  // are **undefined identifiers** at build time, so Rollup fails with
  // "React is not defined" / "useState is not defined" before the
  // `window.React = React` line in main.jsx can even run.
  //
  // We fix this by prepending real ES-module imports to the merged
  // bundle, then destructuring every hook + helper the AI is taught to
  // emit (see `lib/components-catalog.ts` system prompt). This keeps
  // the user code completely unchanged while making it resolvable at
  // build time *and* runtime.
  const USER_BUNDLE_PREAMBLE = `// Auto-injected at publish time. Brings the CDN-style globals
// (React, ReactDOM, ReactRouterDOM, useState, BrowserRouter, …) into
// module scope so the user's unmodified code resolves at build time
// AND runtime.
//
// CRITICAL: \`ReactDOM\` MUST be the *merged* namespace of "react-dom"
// (legacy: render, createPortal, flushSync) and "react-dom/client"
// (React 18: createRoot, hydrateRoot). The AI's canonical app.jsx
// ends with \`ReactDOM.createRoot(...).render(<App/>)\` — if our
// module-scope \`ReactDOM\` binding only points at "react-dom",
// \`ReactDOM.createRoot\` is undefined, the call throws, and the whole
// app fails to mount → blank Vercel deployment with no error
// surface. Aliasing the raw imports and re-binding \`ReactDOM\` to the
// merged object below is what keeps the canonical pattern working.
import * as React from "react";
import * as _ReactDOMLegacy from "react-dom";
import * as _ReactDOMClient from "react-dom/client";
import * as ReactRouterDOM from "react-router-dom";
// LucideReact (icons) + Recharts (charts) mirror the CDN globals the
// AI is taught to use — see lib/components-catalog.ts. Bringing them
// into module scope here means \`<LucideReact.Heart />\` and
// \`<Recharts.LineChart />\` in the user bundle resolve cleanly at
// build time without the AI having to write any imports.
import * as LucideReact from "lucide-react";
import * as Recharts from "recharts";

const ReactDOM = Object.assign({}, _ReactDOMLegacy, _ReactDOMClient);

const {
  Fragment,
  StrictMode,
  Suspense,
  Children,
  Component,
  PureComponent,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} = React;

// Bare-name aliases for code that calls e.g. \`createRoot()\` directly
// instead of going through \`ReactDOM.createRoot()\`.
const { createRoot, hydrateRoot, render, hydrate, unmountComponentAtNode, createPortal, flushSync } = ReactDOM;

// React Router 6 — destructure the surface the AI is taught to use.
const {
  BrowserRouter,
  HashRouter,
  MemoryRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
  useMatch,
  useRoutes,
  useOutlet,
  useOutletContext,
  useResolvedPath,
  useHref,
  useInRouterContext,
  useNavigationType,
  createBrowserRouter,
  createHashRouter,
  createMemoryRouter,
  RouterProvider,
} = ReactRouterDOM;

`;
  const ordered = orderJsxFilesForConcat(jsxBodies.map((b) => b.path));
  const byPath = new Map(jsxBodies.map((b) => [b.path, b.content] as const));
  const userCode = ordered
    .map((p) => `// === ${p} ===\n${sanitizeForPreamble(byPath.get(p) ?? "")}\n`)
    .join("\n");
  out.push({
    path: "src/user-bundle.jsx",
    content: USER_BUNDLE_PREAMBLE + userCode,
    encoding: "utf8",
  });

  // Build entry — polyfills globals then loads the merged user code.
  out.push({
    path: "src/main.jsx",
    content: VITE_MAIN_JSX,
    encoding: "utf8",
  });

  // Tailwind v4 entry stylesheet, imported by main.jsx above.
  out.push({
    path: "src/styles.css",
    content: DEFAULT_TAILWIND_CSS,
    encoding: "utf8",
  });

  // Vite + React plugin + minimal package.json. We always synthesize
  // these here (we know the user didn't bring their own — that case is
  // routed to the "real Vite project" path below).
  out.push({
    path: "package.json",
    content: JSON.stringify(DEFAULT_PACKAGE_JSON, null, 2),
    encoding: "utf8",
  });
  out.push({
    path: "vite.config.js",
    content: DEFAULT_VITE_CONFIG,
    encoding: "utf8",
  });

  // SPA rewrites so client-side routing in the bundled app works.
  out.push({
    path: "vercel.json",
    content: JSON.stringify(DEFAULT_VERCEL_JSON, null, 2),
    encoding: "utf8",
  });

  return out;
}

export function buildVercelPayload(
  files: ProjectFileLite[],
): VercelInlinedFile[] {
  // Rewrite CDN-style React projects into a real Vite project FIRST so
  // the size budget below counts against the actual payload Vercel
  // sees, not the original source.
  const effectiveFiles = isCdnReactProject(files)
    ? transformCdnReactToVite(files)
    : files;

  // ---------- Encode every file & enforce the size cap ----------
  // We do this in a single pass so the size accounting is honest
  // (binary file size is the *decoded* byte length, not the inflated
  // base64 length) and so an oversized project bails out before we
  // synthesise any defaults below.
  const encoded: VercelInlinedFile[] = [];
  let totalBytes = 0;
  for (const f of effectiveFiles) {
    const { data, rawBytes } = encodeForVercel(f);
    totalBytes += rawBytes;
    if (totalBytes > PAYLOAD_SIZE_LIMIT_BYTES) {
      throw new PayloadTooLargeError(totalBytes, PAYLOAD_SIZE_LIMIT_BYTES);
    }
    encoded.push({ file: f.path, data, encoding: "base64" });
  }

  const present = new Set(effectiveFiles.map((f) => f.path));

  if (isStaticOnly(effectiveFiles)) {
    // Pure static site — ship as-is plus a vercel.json that disables
    // the build step. Vercel will serve files from the project root.
    if (!present.has("vercel.json")) {
      encoded.push({
        file: "vercel.json",
        data: toBase64FromUtf8(JSON.stringify({
          buildCommand: null,
          outputDirectory: ".",
          rewrites: DEFAULT_VERCEL_JSON.rewrites,
        }, null, 2)),
        encoding: "base64",
      });
    }
    return encoded;
  }

  // Real Vite project — synthesize package.json / vite.config /
  // vercel.json only when the user didn't bring their own. (For the
  // CDN-style path above, all three were already added by
  // transformCdnReactToVite, so these `if` checks are no-ops there.)
  if (!present.has("package.json")) {
    encoded.push({
      file: "package.json",
      data: toBase64FromUtf8(JSON.stringify(DEFAULT_PACKAGE_JSON, null, 2)),
      encoding: "base64",
    });
  }
  if (!present.has("vite.config.js") && !present.has("vite.config.ts")) {
    encoded.push({
      file: "vite.config.js",
      data: toBase64FromUtf8(DEFAULT_VITE_CONFIG),
      encoding: "base64",
    });
  }
  if (!present.has("vercel.json")) {
    encoded.push({
      file: "vercel.json",
      data: toBase64FromUtf8(JSON.stringify(DEFAULT_VERCEL_JSON, null, 2)),
      encoding: "base64",
    });
  }

  return encoded;
}

# CLAUDE.md — Best practices for AI coding assistants in this repo

This file is the project-wide playbook for any AI assistant (Claude, etc.)
making changes here. Read this **before** writing or editing code.
For the project's high-level architecture and module map, see `replit.md` —
this file is about the **how**, not the **what**.

---

## 1. Repo shape (one-line orientation)

- pnpm monorepo. Three artifacts under `artifacts/`:
  - `api-server` — Express 5 + Drizzle, mounted at `/api`.
  - `deploybro` — Vite + React 18 + wouter + Tailwind v4, the user-facing SPA.
  - `mockup-sandbox` — isolated Vite preview server for canvas component variants.
- Shared libraries under `lib/`: `db` (Drizzle schema), `api-zod`, `api-spec` (OpenAPI + Orval codegen).
- Node 24, TypeScript 5.9, ESM.

## 2. Golden rules

1. **Never touch the database integration in `lib/db.ts` / per-project DB
   provisioning unless the task is explicitly about the DB.** That subsystem
   is load-bearing for publish + per-project Postgres branches.
2. **Never change the type of a primary key column** (e.g. `serial` ↔
   `varchar`). It breaks every existing row and silently fails to push.
3. **Never write raw SQL migrations.** Use `pnpm --filter @workspace/db run
   push --force` to sync schema. After schema changes, run `npx tsc -b` in
   `lib/db/` and `lib/api-zod/` so api-server typecheck can resolve the
   regenerated `.d.ts`.
4. **Never log or echo secret values.** Available secrets are exposed by
   name only — use them via `process.env.X`, never `console.log` them.
5. **Never bypass auth in production code paths.** The `tryAuth`
   middleware's demo-user fallback only fires when `NODE_ENV !== "production"`
   AND `AUTH_JWKS_URL` is unset. Don't add new bypasses.
6. **Never edit `artifact.toml` or `.replit` by hand.** Use the artifact
   skill scripts so workflow + preview-path config stays in sync.
7. **Prefer editing existing files.** Don't create new files unless the
   task genuinely requires a new module/route/component.

## 3. Before you change anything

1. **Read `replit.md`** — it's the architecture map. Section headings tell
   you which subsystem owns what.
2. **Skim the file you're editing top-to-bottom**, plus its direct
   imports. Don't pattern-match on a single function — the surrounding
   module almost always has invariants you'll otherwise break.
3. **For any AI-generated-code surface (`lib/components-catalog.ts`,
   `lib/file-blocks.ts`, `lib/deploy-payload.ts`)**, also check the other
   two — they share file-shape assumptions (entry detection, load order,
   preview vs deploy ordering). A change to one usually needs a parallel
   change in the others.

## 4. Type & build discipline

- **Always run `pnpm --filter @workspace/api-server run typecheck` after
  api-server changes.** Express 5 strict typing catches real bugs (e.g.
  `string | null` slipping into `captureScreenshot(string)`).
- For schema-touching work, run `pnpm typecheck` at the workspace root —
  the composite project graph resolves cross-package types.
- Don't suppress TS errors with `@ts-ignore`. If a type is genuinely
  wrong, fix the type. If it's a third-party `.d.ts` issue, narrow with
  `as` + a comment explaining why.
- Express 5 handlers are `(req, res): Promise<void>` and use **explicit
  `return;` after `res.json()` / `res.status()`** — no `return res.json(...)`.

## 5. Frontend conventions (`artifacts/deploybro`)

- **Routing:** wouter (not React Router). Use `<Link href>` and
  `useLocation()`. Programmatic nav: `const [, navigate] = useLocation();
  navigate("/somewhere")`.
- **Data fetching:** all backend calls go through `src/lib/api.ts` hooks
  (react-query). Don't `fetch()` from components directly.
- **Styling:** Tailwind v4 utilities + CSS variables defined in
  `src/index.css`. Reusable visual effects live in `index.css` as named
  classes (`.glass-pill`, `.prompt-glow`, `.perspective-grid`) — keep
  decorative CSS there, not inline-styled per page.
- **Theme:** dark-first. Always check both modes — light tweaks live
  under `:root:not(.dark) .your-class`.
- **Auth gate:** every gated route uses `<AuthGate>`. Don't hand-roll
  redirect logic.
- **Marketing pages:** `landing.tsx`, `pricing.tsx`, `templates.tsx` —
  these wrap content in `<MarketingNav />` + `<MarketingFooter />`.
- **Reduced motion:** any `@keyframes` animation must have a
  `@media (prefers-reduced-motion: reduce)` opt-out.

## 6. Backend conventions (`artifacts/api-server`)

- **All routes live under `src/routes/<feature>.ts`** and are wired in
  `src/routes/index.ts`. One feature per file.
- **Validation:** request bodies and responses are validated with
  `zod/v4` schemas exported from `lib/api-zod`. Don't shadow them with
  inline zod schemas in route handlers.
- **DB access:** `db` from `@workspace/db` for the platform DB. For
  per-project Postgres (user databases) open a **transient `pg.Client`
  per request** with 10s timeouts — never pool, never reuse.
- **Errors:** use `userFacingError(err)` to sanitize before persisting
  or surfacing. Log the full error at `warn`/`error` with context
  (`projectId`, `deploymentId`, etc.).
- **Background work:** the publish pipeline runs in-process — fire-and-
  forget with a top-level try/catch that marks the deployment `failed`
  on any unhandled error. There is **no external job queue.**

## 7. AI-generated code (`lib/components-catalog.ts` system prompt)

- The AI generates a **CDN React + Babel** app with a **Next.js-style
  folder layout**: `app/layout.jsx` (mounts React, defines RootLayout
  with `<Outlet/>`), `app/page.jsx` (home), `app/<route>/page.jsx`,
  plus `components/` and `lib/`.
- Legacy `app.jsx` + `pages/X.jsx` projects still work — preview and
  deploy detect both shapes.
- **Load order in the preview iframe:** hooks → lib → components →
  `app/<route>/page` → `app/layout` (mount entry, LAST).
- The deploy pipeline wraps the CDN-style app in a real Vite project,
  concatenates all `.jsx` into `src/user-bundle.jsx`, prepends an
  auto-generated import preamble, and ships to Vercel. See `replit.md`
  → "Publish to Vercel + Neon" for the full pipeline.

## 8. Workflows & restarts

- Three workflows: `artifacts/api-server: API Server`,
  `artifacts/deploybro: web`, `artifacts/mockup-sandbox: Component
  Preview Server`. They're auto-managed.
- After api-server source changes, restart the API workflow to pick
  them up. After CSS/React changes in deploybro, Vite HMR handles it —
  no restart needed unless you touched `vite.config.*` or env vars.

## 9. Secrets

- Use `process.env.X` only. Never log values.
- Currently in use: `ANTHROPIC_API_KEY`, `AUTH_ISSUER_URL`,
  `AUTH_JWKS_URL`, `DATABASE_URL_ENC_KEY`, `NEON_API_KEY`,
  `NEON_DATABASE_URL`, `NEON_PARENT_PROJECT_ID`, `VERCEL_API_TOKEN`,
  `VITE_NEON_AUTH_BASE_URL`.
- Obsolete (do not reference): `VITE_STACK_PROJECT_ID`,
  `VITE_STACK_PUBLISHABLE_CLIENT_KEY`.
- Optional: `VERCEL_TEAM_ID`, `SCREENSHOT_API_URL`,
  `SCREENSHOT_API_KEY`, `MICROLINK_API_KEY`, `APP_ORIGIN`.

## 10. Testing

- There is **no automated test suite** in this repo. Verify changes by:
  1. Running `pnpm typecheck` (workspace root).
  2. Restarting affected workflows.
  3. Visually checking the affected surface in the preview pane (or
     curling the API endpoint).
- Don't introduce a test framework without explicit user request.

## 11. Scope discipline

- **Stay inside the user's request.** Don't refactor adjacent code,
  don't "clean up" formatting, don't swap libraries unprompted.
- A focused 5-line diff that solves the user's problem is always
  better than a 500-line diff that solves it AND restyles three
  unrelated files.
- If you spot a bug outside the requested scope, mention it in your
  reply — don't silently fix it. The reviewer can't tell signal from
  noise in a sprawling diff.

## 12. Communication

- **Reply to the user in plain language**, no jargon, no tool/skill
  names. They are non-technical unless they prove otherwise.
- Brief is good. Bullet what you changed; don't narrate the journey.
- If you're blocked on a real ambiguity (not a preference), ask a
  short, specific question.

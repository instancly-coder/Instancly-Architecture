# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- `artifacts/deploybro` — Vite + React frontend (DeployBro app, Vercel→Replit migration). Pages use react-query hooks from `src/lib/api.ts` against the API server.
- `artifacts/api-server` — Express 5 API mounted at `/api`. Routes: `me`, `users`, `projects`, `explore`, `db`, `health`. Handlers are typed `(req, res): Promise<void>` and use explicit `return;` after `res.json/status` (Express 5 strict typing).
- `artifacts/mockup-sandbox` — Canvas component previews.

## Database (Neon Postgres via `@workspace/db`)

Drizzle schema in `lib/db/src/schema/`:
- `users` (username, displayName, email, bio, plan, balance, status)
- `projects` (userId FK, name, slug, description, framework, status, isPublic, clones, lastBuiltAt, **vercelProjectId, vercelDeploymentId, neonProjectId, neonBranchId, neonRoleName, databaseUrl, liveUrl, lastPublishedAt, publishStatus**)
- `builds` (projectId FK, number, prompt, aiMessage, model, cost, durationSec, filesChanged, tokens)
- `deployments` (projectId FK, status `queued|provisioning_db|creating_project|deploying|polling|live|failed`, vercelDeploymentId, vercelInspectorUrl, liveUrl, errorMessage, createdAt, finishedAt)
- `transactions` (userId FK, kind, amount, description)
- `project_files` (projectId FK, path, content, **encoding `utf8|base64`**, **content_type**, size) — `encoding=base64` for user-uploaded binary assets (images, fonts, favicons); content holds the base64 string and is decoded by the preview route + publish payload builder

Workflow:
- `pnpm --filter @workspace/db run push --force` — sync schema to Neon (uses `NEON_DATABASE_URL` secret, auto-SSL on neon.tech).
- Seed: `node node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs lib/db/src/seed.ts` from `lib/db/`.
- `lib/db` and `lib/api-zod` are TS composite projects — run `npx tsc -b` in those dirs after schema changes so api-server typecheck can resolve `.d.ts`.

## Builder AI

The in-builder code-generation flow (`POST /api/ai/build/:username/:slug`, SSE) calls Anthropic's Claude API **directly** (`api.anthropic.com`), not via the Replit AI integrations proxy.

Required secret:
- `ANTHROPIC_API_KEY` — Anthropic console API key. Without it `/ai/build` responds with an SSE `error` event and the builder shows "AI is not configured". Models used: `claude-haiku-4-5` (Free), `claude-sonnet-4-6` (default for Pro), `claude-opus-4-5` (Pro opt-in).

The SSE stream emits granular `status` events ("Fetching reference URLs", "Connecting to Claude", "Saving generated files", "Recording build") in addition to `start`/`delta`/`usage`/`done`/`error`. The builder renders each `status` as a row in a per-prompt action checklist under the in-flight assistant bubble (spinner → check on completion, X on error) so the user can see exactly which phase is running.

### Dev preview error overlay + AI auto-fix

Every HTML response served from `/api/preview/...` (see `artifacts/api-server/src/routes/files.ts → injectErrorOverlay`) gets a script injected at the top of `<head>` that:

1. Renames `<script type="text/babel">` to `application/x-deploybro-babel` (immediately + via MutationObserver) so Babel-standalone's auto-runner ignores them.
2. After Babel loads, runs each tag itself via `Babel.transform(..., { filename })` + `//# sourceURL=` pragma + indirect `eval` so JSX runtime errors carry **real** file/line/column info instead of the cross-origin opaque `Script error.`
3. Catches `error`, `unhandledrejection`, and wraps `console.error` (Babel logs syntax errors there instead of throwing). First error wins so the overlay stays readable in error loops.
4. Renders an in-iframe overlay with the message, location, stack, and a **"Fix this with AI"** button.

Clicking the button posts a `{ type: "deploybro:preview-error", message, where, stack, autofix: true }` message to the parent window. The builder shell (`artifacts/deploybro/src/pages/builder.tsx`) authenticates the message by checking `event.source === previewIframeRef.current.contentWindow` (defends against spoofed autofix triggers from third-party scripts), then either auto-submits a fix prompt to Claude (if the chat is idle and the input is empty) or pre-fills the input for the user to review (if streaming or if the user is mid-prompt). Dedupe is keyed on `message|location` and resets on slug change or when a new build starts so legitimate retries aren't blocked.

## Homepage prompt → builder flow

A prompt typed on the landing page carries straight through to the builder, including through login if needed.

- `landing.tsx` stashes the prompt + composer settings (model, plan mode, reference URLs, base64 images) in `sessionStorage` (`deploybro:initial-prompt`, `deploybro:initial-settings`), then either navigates to `/build/new` (if logged in) or sets `deploybro:after-login = "/build/new"` and navigates to `/login`.
- `login.tsx`'s dev-bypass paths consume `deploybro:after-login` and redirect there. For real Stack OAuth, `AuthGate` consumes the key on the next gated mount and redirects.
- `/build/new` (`pages/build-new.tsx`, gated) creates a project named from the prompt's first words, then redirects to `/<username>/<slug>/build?prompt=…`.
- `builder.tsx`'s existing autostart effect picks up `?prompt=` + the stashed settings, hydrates the composer, and fires `handleSend` once.

## Per-project database (opt-in)

Each project has its own dedicated Neon Postgres branch, provisioned **on demand** from the builder's Database tab — never automatically. The builder's Database tab shows an empty state with a **Create database** button until the user opts in; once provisioned, the tab reads from the project's own Postgres (not the platform's central control DB).

- `GET  /api/projects/:username/:slug/db/info` — `{ provisioned: false }` until the user creates one; otherwise `{ provisioned: true, provider: "neon", host, database, size, version, connectionString }`. Owner-only (404 to non-owners).
- `GET  /api/projects/:username/:slug/db/tables` — table list with row counts/sizes/last-change. Owner-only.
- `POST /api/projects/:username/:slug/db/provision` — creates a Neon branch + dedicated role + database, encrypts the connection URI with `DATABASE_URL_ENC_KEY`, stores on the project row. Idempotent (returns `alreadyProvisioned: true` if called twice).

Implementation (`artifacts/api-server/src/routes/projects.ts`):
- Opens a transient `pg.Client` per request to the project's own DB (no pooling — each project's connection lifecycle is too short-lived to justify a per-project pool registry). `statement_timeout` / `query_timeout` / `connectionTimeoutMillis` all capped at 10s.
- The publish flow (`routes/deployments.ts`) **no longer auto-provisions** — if the project has no `databaseUrl`, it skips DB provisioning AND skips the Vercel `DATABASE_URL` env-var upsert. Re-publishes still reuse a pre-existing branch (the existing decrypt branch), so once you provision once, every subsequent publish picks it up automatically.

Frontend hooks (`artifacts/deploybro/src/lib/api.ts`): `useProjectDbInfo`, `useProjectDbTables`, `useProvisionProjectDb`.

## Per-project env vars + AI directives

Per-project environment variables live in `project_env_vars` (`lib/db/src/schema/project-env-vars.ts`): `id` (uuid), `projectId` FK cascade, `key` (UPPER_SNAKE_CASE, validated `^[A-Z][A-Z0-9_]{0,127}$`), `valueEncrypted` (encrypted via `lib/secret-cipher.ts`, 5KB plaintext cap), `isSecret` (controls masking in list responses), `description`, unique `(projectId,key)`. `DATABASE_URL` is a reserved key — the API rejects it (it's owned by the Database tab) and the publish flow always pushes the project's own `databaseUrl` for it before iterating env-var rows.

Endpoints (`artifacts/api-server/src/routes/env-vars.ts`):
- `GET /api/projects/:username/:slug/env-vars` — list (secret values masked).
- `PUT /api/projects/:username/:slug/env-vars/:key` — upsert.
- `DELETE /api/projects/:username/:slug/env-vars/:key` — remove.
- `POST /api/projects/:username/:slug/env-vars/:key/reveal` — one-shot decrypt for the owner.

`routes/deployments.ts` decrypts and `upsertEnvVar`s every project env-var row to Vercel on each publish (errors logged, non-fatal). Builder UI: new "env" tab with `EnvVarsView` (add form + list with reveal/hide/delete).

Two control directives the AI can emit in its replies are parsed and stripped server-side (`lib/file-blocks.ts`) before the transcript is persisted, then surfaced on the SSE `done` event:
- `<deploybro:open-tab name="…" />` — last valid name wins; client validates against `TAB_META` and switches the user to that tab.
- `<deploybro:request-secret name="…" label="…" description="…" />` — up to 8 per reply, deduped by name; client renders an inline masked-input bubble under the AI message that PUTs to the env-vars endpoint on submit. The AI never sees the raw value (only that the named key exists in the env-var listing on its next turn).

System prompt docs for both directives live in `lib/components-catalog.ts` next to the existing `<deploybro:provision-db />` docs.

## Random project names

New projects get a friendly two-word name like "Swift Otter" (slugified to `swift-otter` by the API server's existing slug-collision suffixing). Generated by `artifacts/deploybro/src/lib/random-name.ts` (~80 adjectives × ~80 nouns = ~6.4k combinations). Used by the dashboard's "New project" button and by `/build/new` when the user lands without a typed prompt — replaces the prior "Untitled project N" auto-numbering.

## Templates marketplace + referrals (Phase 1)

Per-project public listing fields (`description`, `features text[]`, `coverImageUrl`) are owner-editable from the builder Settings pane via `PATCH /api/projects/:username/:slug`. Public projects with `isFeaturedTemplate=true` (admin-only toggle) appear on the curated `/templates` page; admin curation lives at `/admin/templates`. Schema groundwork for Phase 2 referral attribution + commission payouts is in place: `users.referredByUserId`/`referredViaProjectId`/`referralCommissionPct` (default 15%) and the new `referral_earnings` table — none of these are wired into a flow yet.

Three official starter templates are seeded under the reserved `deploybro` user: `bro-cloud-saas` (dark indigo SaaS landing), `studio-bro-agency` (cream/serif creative agency), and `bro-folio-portfolio` (minimal monochrome dev portfolio). Each is a 7-file React Router app (index.html + app.jsx + 4 pages + 2 components). The idempotent seed script lives at `artifacts/api-server/scripts/seed-templates.mjs` — re-running it updates copy in place and replaces the file set inside a single transaction.

## Project screenshots

After a project publishes successfully, the server calls Microlink's public API to capture an above-the-fold screenshot of the live Vercel URL and stores the resulting CDN image URL as `screenshotUrl` on the project row. The Explore page and landing page template cards prefer `screenshotUrl` over the manually-set `coverImageUrl` when both are present.

- `lib/screenshot.ts` — `captureScreenshot(liveUrl)` helper. Calls `https://api.microlink.io?url=<url>&screenshot=true&meta=false`. Returns a hosted image URL or `null` (non-fatal; never blocks the deployment). Optional `MICROLINK_API_KEY` env var unlocks Pro rate limits.
- Triggered automatically at the end of `runPublishPipeline` in `routes/deployments.ts` (after READY state is confirmed).
- `POST /api/projects/:username/:slug/screenshot` — owner-only endpoint to manually retrigger a screenshot capture (e.g. after design changes). Returns `{ screenshotUrl }`.
- Frontend hook: `useRetriggerScreenshot(username, slug)` in `api.ts`.
- Explore page (`explore.tsx`) and landing page template cards (`landing.tsx`) use `screenshotUrl ?? coverImageUrl` with `object-top` cropping to show above-the-fold content.

## Publish to Vercel + Neon

The Publish flow in the builder deploys to Vercel and (when the user has provisioned a per-project DB via the Database tab) wires `DATABASE_URL` into the deployed app. Pro-plan-gated. Pipeline runs in-process (no external job queue).

Required secrets:
- `VERCEL_API_TOKEN` — personal/team token with project + deployment write scope.
- `NEON_API_KEY` — account API key.
- `NEON_PARENT_PROJECT_ID` — the shared Neon project under which a per-app branch is created.
- `DATABASE_URL_ENC_KEY` — 32-byte AES-256-GCM key (hex / base64 / passphrase) used to encrypt each project's `databaseUrl` at rest. The pipeline refuses to publish without it.

Optional:
- `VERCEL_TEAM_ID` — appended as `?teamId=` to all Vercel calls when deploying under a team.

Endpoints (in `artifacts/api-server/src/routes/deployments.ts`):
- `POST /api/projects/:username/:slug/publish` — auth + owner + Pro gate (402 `requiresUpgrade`); returns `{ deploymentId }`. 503 if any required secret is missing.
- `GET  /api/projects/:username/:slug/deployments` — latest first.
- `GET  /api/projects/:username/:slug/deployments/:id` — single deployment.
- `GET  /api/projects/:username/:slug/publish-status` — current `publishStatus` + `liveUrl`.

Internals:
- `lib/vercel.ts` — `getOrCreateProject`, `upsertEnvVar`, `createDeployment`, `getDeployment`, plus `deleteProject` and `cancelDeployment` for failure cleanup (30s timeout, structured `VercelApiError`).
- `lib/neon.ts` — `provisionAppDatabase` (branch + role + database, returns `postgresql://…?sslmode=require`) and `deleteBranch` for failure cleanup.
- `lib/secret-cipher.ts` — AES-256-GCM `encryptSecret` / `decryptSecret`, `enc:v1:` versioned ciphertext. The stored `databaseUrl` is encrypted with `DATABASE_URL_ENC_KEY`; plaintext is only ever held in memory and pushed to Vercel's encrypted env store.
- `lib/deploy-payload.ts` — base64-inlines project files for Vercel and routes them through one of three paths based on what the project contains:
  1. **CDN-style React + React Router project** (AI default: `index.html` + multi-file `.jsx` structure under `pages/`, `components/`, `hooks/`, plus a top-level `app.jsx` that wires the router; uses React/ReactDOM/ReactRouterDOM/Babel from unpkg, no `package.json`. React Router v6's UMD bundle is split across THREE scripts that must load in order — `@remix-run/router`, then `react-router`, then `react-router-dom` — because `react-router-dom`'s UMD reads `window.ReactRouter` and `window.RemixRouter` at parse time and crashes with "undefined is not an object (evaluating 'r.Routes')" if either is missing. The dev-preview HTML serve path includes a `fixUpReactRouterCdn()` patch that auto-injects the missing two scripts immediately before the `react-router-dom` tag, so projects generated before this rule existed still preview correctly without re-running the AI.) → wrapped in a real Vite project at publish time. The original `index.html` is rewritten to strip the React/ReactDOM/all-three-RR/Babel CDN scripts and all `<script type="text/babel">` tags, and a `<script type="module" src="/src/main.jsx">` is injected before `</body>`. All user `.jsx` files are concatenated into `src/user-bundle.jsx` (alphabetical, with `app.jsx`/`main.jsx`/`index.jsx` last so dependents come after their definitions). The merged bundle is prefixed with an auto-injected preamble that does `import * as React from "react"` / `react-dom` / `react-dom/client` / `react-router-dom` and destructures every common hook + helper (`useState`, `useEffect`, `createRoot`, `render`, `Fragment`, `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `useNavigate`, `useParams`, …) into module scope — without this, Rollup fails the build with "React is not defined" / "BrowserRouter is not defined" because the user's CDN-style code references those names as bare globals that only exist on `window` at runtime, not as module-scope identifiers at build time. A `sanitizeForPreamble()` pass also strips the user's own top-level `const { useState, useEffect } = React;` / `const { Link, NavLink } = ReactRouterDOM;` / `import … from "react"` / `import … from "react-router-dom"` lines (commenting them out so error stack traces still map to the right line numbers) — these would otherwise cause "Identifier already declared" Rollup errors on concatenation. A synthesised `src/main.jsx` ALSO sets `window.React` / `window.ReactDOM` for any user code that reads them off the global, then `await import("./user-bundle.jsx")` — the dynamic import is required so the polyfills are in place before the user code reads `React.useState` etc. Synthesises `package.json` (with `react`, `react-dom`, `react-router-dom@^6` deps), `vite.config.js`, and `vercel.json` (SPA rewrites so client-side routing works on hard refresh). The dev preview iframe is unaffected because the source files in the database are never modified — the transform only touches the publish payload.
  2. **Pure static site** (`index.html`, no JSX, no `package.json`) → shipped as-is with `vercel.json` setting `buildCommand: null`.
  3. **Bring-your-own Vite project** (has `package.json`) → shipped as-is, with `package.json`/`vite.config.js`/`vercel.json` synthesised only if missing.
- Pipeline polls Vercel every 3s for up to 10 minutes; failures sanitise error messages before persisting and run best-effort cleanup of any cloud resources that were created during this attempt (cancel in-flight Vercel deployment → delete net-new Vercel project → delete net-new Neon branch). Cleanup errors are logged but never mask the original failure.

## Auth (Better Auth via Neon's hosted instance)

Sign-in is powered by Neon's hosted Better Auth project. The browser talks
directly to Neon's auth server for OAuth (Google, GitHub) and session
management; the API server only ever sees a JWT.

Sign-in goes through Neon's official `@neondatabase/neon-js` SDK (the SDK
wraps Better Auth and provides drop-in React UI components). The SDK's
`AuthView` is the rendered login page and `AuthCallback` handles the
OAuth-return restore-then-redirect dance.

Frontend (`artifacts/deploybro`):
- `src/auth.ts` — `createAuthClient(VITE_NEON_AUTH_BASE_URL, { adapter: BetterAuthReactAdapter({ fetchOptions: { credentials: "include" } }) })`. Exports `authClient`, `authConfigured`, `authBaseURL`, and `fetchAuthJwt()` (GETs `<baseURL>/token` for a fresh signed JWT). Includes a normaliser that strips a trailing `/.well-known/jwks.json` if someone set `VITE_NEON_AUTH_BASE_URL` to the JWKS URL by mistake.
- `App.tsx` — wraps all routes in `<NeonAuthUIProvider>` with `social: ["google","github","apple"]`, `redirectTo: "/dashboard"`, `credentials: false` (no email/password tab — social only), `signUp: false`, `defaultTheme: "dark"`. Bridges wouter `navigate`/`replace`/`Link` into the provider. Imports `@neondatabase/neon-js/ui/css`.
- `pages/login.tsx` — renders the SDK's `<AuthView>` for the social-login UI. `authClient.signIn.social({ provider, callbackURL: <origin>/handler })` is still the underlying API.
- `pages/handler.tsx` — post-OAuth landing page. Renders `<AuthCallback redirectTo={target} />`; `target` is read **once** from `sessionStorage["deploybro:after-login"]` into a `useRef` on first render so re-renders can't flip the destination back to `/dashboard`. In parallel, fetches a fresh JWT and POSTs it to `/api/auth/session` so the cookie is in place by the time the destination route's first API call fires.
- `components/auth-gate.tsx` — wraps every gated route; `useSession()`-based redirect to `/login` when signed out.
- `components/session-sync.tsx` — globally mounted; whenever `useSession()` resolves to a user, fetches a JWT from Neon and POSTs it to `/api/auth/session` so the API cookie is set / refreshed (every ~10 min while the tab is open).

Backend (`artifacts/api-server`):
- `middlewares/auth.ts` — `tryAuth` verifies the JWT against `AUTH_JWKS_URL` (cached `createRemoteJWKSet`), optionally enforces `AUTH_ISSUER_URL`, and lazily upserts the local user from the standard claims (`sub`, `email`, `name`, `picture`). The "demo user" dev bypass only fires when **both** `NODE_ENV !== "production"` **and** `AUTH_JWKS_URL` is unset — once real auth is configured (even in dev) requests with no/invalid token are treated as anonymous, never as `demo`. This prevents a cookie-sync race right after OAuth callback from silently resolving `/api/me` to the wrong user. Issuer validation is **origin-tolerant** (`isAcceptableIssuer`): JWTs are accepted if the `iss` claim's `protocol + host` matches `AUTH_ISSUER_URL` even if the path differs — this works around Neon Auth issuing JWTs with a bare-host `iss` while `AUTH_ISSUER_URL` is commonly set to the path-suffixed Better Auth base URL. Empty/missing `sub` is rejected to prevent ghost-user provisioning. JWT verification failures log at `warn` level with `errMessage` / `expectedIssuer` / `tokenIssuer` for self-diagnosing 401s.
- `routes/auth.ts` — `GET /auth/config`, `GET /auth/whoami`, `POST /auth/session` (sets the `auth_token` cookie — `httpOnly: true`, `secure` in prod, `sameSite: lax`, 30-day max-age), `POST /auth/sign-out`. Both POST endpoints are CSRF-gated by an `Origin`/`Referer` allow-list (`deploybro.com`, `www.deploybro.com`, `APP_ORIGIN` if set; in dev: `*.replit.dev`/`*.replit.app`/`localhost`/`127.0.0.1`). Cross-origin requests get 403.

Required env vars / secrets:
- `VITE_NEON_AUTH_BASE_URL` — base URL of Neon's hosted Better Auth instance (e.g. `https://ep-…neonauth.…neon.tech/<db>/auth`). The JWKS lives at `<base>/.well-known/jwks.json` and the JWT issuance endpoint at `<base>/token`.
- `AUTH_JWKS_URL` — full JWKS URL (typically `<VITE_NEON_AUTH_BASE_URL>/.well-known/jwks.json`).
- `AUTH_ISSUER_URL` — should match Better Auth's `iss` claim, which defaults to its baseURL (= `VITE_NEON_AUTH_BASE_URL`). Leave unset to skip strict issuer validation.
- `APP_ORIGIN` (optional) — extra trusted origin for the `/api/auth/session` CSRF gate. The canonical `deploybro.com` and `www.deploybro.com` are always trusted; set this if you serve the SPA from another host.

Obsolete (safe to delete from secrets): `VITE_STACK_PROJECT_ID`, `VITE_STACK_PUBLISHABLE_CLIENT_KEY`.

`@neondatabase/neon-js` packaging-bug workaround:
- `@neondatabase/neon-js@0.2.0-beta.1` ships pre-bundled chunks (under
  `@neondatabase/auth/dist/`) that import `tailwind-merge`, `clsx`,
  `class-variance-authority`, `next-themes`, `sonner`, `lucide-react`,
  `react-hook-form`, `input-otp`, `vaul`, `zod`, `ua-parser-js`,
  `react-qr-code`, `react-google-recaptcha`, plus several
  `@radix-ui/*`, `@hookform/*`, `@captchafox/*`, `@hcaptcha/*`,
  `@marsidev/*`, and `@wojtekmaj/*` packages — but does **not** declare
  any of them as deps of `@neondatabase/auth` itself. They're declared
  on `@neondatabase/auth-ui` (a transitive dep), which under pnpm's
  strict isolation makes them invisible to the `@neondatabase/auth`
  chunks that actually do the importing.
- Workaround: `.npmrc` adds `public-hoist-pattern[]=` lines for all of
  these packages so they get hoisted to the workspace-root
  `node_modules` and become resolvable. **Remove these lines once Neon
  publishes a fixed SDK version that declares its own deps correctly.**

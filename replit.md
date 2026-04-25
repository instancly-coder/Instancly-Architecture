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

## Homepage prompt → builder flow

A prompt typed on the landing page carries straight through to the builder, including through login if needed.

- `landing.tsx` stashes the prompt + composer settings (model, plan mode, reference URLs, base64 images) in `sessionStorage` (`deploybro:initial-prompt`, `deploybro:initial-settings`), then either navigates to `/build/new` (if logged in) or sets `deploybro:after-login = "/build/new"` and navigates to `/login`.
- `login.tsx`'s dev-bypass paths consume `deploybro:after-login` and redirect there. For real Stack OAuth, `AuthGate` consumes the key on the next gated mount and redirects.
- `/build/new` (`pages/build-new.tsx`, gated) creates a project named from the prompt's first words, then redirects to `/<username>/<slug>/build?prompt=…`.
- `builder.tsx`'s existing autostart effect picks up `?prompt=` + the stashed settings, hydrates the composer, and fires `handleSend` once.

## Publish to Vercel + Neon

The Publish flow in the builder provisions a per-app Neon Postgres branch and deploys to Vercel. Pro-plan-gated. Pipeline runs in-process (no external job queue).

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
- `lib/deploy-payload.ts` — base64-inlines project files, synthesises `package.json`/`vite.config.ts`/`vercel.json` when missing, switches to a static-only build when no `package.json` and no JSX is detected.
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
- `middlewares/auth.ts` — `tryAuth` verifies the JWT against `AUTH_JWKS_URL` (cached `createRemoteJWKSet`), optionally enforces `AUTH_ISSUER_URL`, and lazily upserts the local user from the standard claims (`sub`, `email`, `name`, `picture`). The "demo user" dev bypass only fires when **both** `NODE_ENV !== "production"` **and** `AUTH_JWKS_URL` is unset — once real auth is configured (even in dev) requests with no/invalid token are treated as anonymous, never as `demo`. This prevents a cookie-sync race right after OAuth callback from silently resolving `/api/me` to the wrong user.
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

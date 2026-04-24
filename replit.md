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

Workflow:
- `pnpm --filter @workspace/db run push --force` — sync schema to Neon (uses `NEON_DATABASE_URL` secret, auto-SSL on neon.tech).
- Seed: `node node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs lib/db/src/seed.ts` from `lib/db/`.
- `lib/db` and `lib/api-zod` are TS composite projects — run `npx tsc -b` in those dirs after schema changes so api-server typecheck can resolve `.d.ts`.

## Publish to Vercel + Neon

The Publish flow in the builder provisions a per-app Neon Postgres branch and deploys to Vercel. Pro-plan-gated. Pipeline runs in-process (no external job queue).

Required secrets:
- `VERCEL_API_TOKEN` — personal/team token with project + deployment write scope.
- `NEON_API_KEY` — account API key.
- `NEON_PARENT_PROJECT_ID` — the shared Neon project under which a per-app branch is created.

Optional:
- `VERCEL_TEAM_ID` — appended as `?teamId=` to all Vercel calls when deploying under a team.

Endpoints (in `artifacts/api-server/src/routes/deployments.ts`):
- `POST /api/projects/:username/:slug/publish` — auth + owner + Pro gate (402 `requiresUpgrade`); returns `{ deploymentId }`. 503 if any required secret is missing.
- `GET  /api/projects/:username/:slug/deployments` — latest first.
- `GET  /api/projects/:username/:slug/deployments/:id` — single deployment.
- `GET  /api/projects/:username/:slug/publish-status` — current `publishStatus` + `liveUrl`.

Internals:
- `lib/vercel.ts` — `getOrCreateProject`, `upsertEnvVar`, `createDeployment`, `getDeployment` (30s timeout, structured `VercelApiError`).
- `lib/neon.ts` — `provisionAppDatabase` (branch + role + database, returns `postgresql://…?sslmode=require`).
- `lib/deploy-payload.ts` — base64-inlines project files, synthesises `package.json`/`vite.config.ts`/`vercel.json` when missing, switches to a static-only build when no `package.json` and no JSX is detected.
- Pipeline polls Vercel every 3s for up to 10 minutes; failures sanitise error messages before persisting.

## Auth (none yet)

API uses a hardcoded `ME = "johndoe"` constant in `routes/me.ts`. Replace with real auth before publishing.

---
name: Auth
description: Authentication and authorization patterns for React + Vite apps. Use when implementing login, signup, password reset, sessions, protected routes, RLS, or role-based access control.
---

When this skill is active, build production-grade auth:

- Provide full flows: sign-up, log-in, log-out, password reset, email verification, and account deletion.
- Wrap the app in an `AuthProvider`; expose `useAuth()` returning `{ user, session, loading, signIn, signOut, ... }`.
- Use a `<ProtectedRoute>` (or route gate) that redirects unauthenticated users to `/login` with a `?next=` return URL.
- Persist sessions with HTTP-only cookies (server-managed) — never localStorage tokens.
- Enforce server-side authorization on every API route, never trust the client. Add Row-Level-Security policies if using Postgres/Supabase.
- Add a `profiles` table that auto-creates on signup (DB trigger) so the app always has a user row.
- Show clear inline form errors and rate-limit login attempts.

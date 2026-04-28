/**
 * Single source of truth for "is this caller one of our own frontends?"
 *
 * Used by:
 *   - The CORS layer (decides whether to send Access-Control-Allow-Origin
 *     and credentials headers).
 *   - The CSRF same-origin guard (decides whether to allow a state-changing
 *     request that arrives with cookies attached).
 *   - The /api/auth/session and /api/auth/sign-out routes which keep a local
 *     copy of the same check as defense-in-depth.
 *
 * Two layers of allow-listing:
 *
 *   1. Always allowed (production-safe):
 *      - APP_ORIGIN env var (the canonical production origin, overridable
 *        per-deployment).
 *      - deploybro.com / www.deploybro.com (hard-coded production fallback
 *        so a missing APP_ORIGIN env doesn't lock everyone out).
 *
 *   2. Dev-only allowed (NODE_ENV !== 'production'):
 *      - *.replit.dev / *.replit.app / *.replit.co preview hosts so the
 *        Replit workspace iframe and the published-but-not-yet-domained
 *        previews work end-to-end.
 *      - localhost / 127.0.0.1 with optional port for local development.
 *
 * In production we deliberately do NOT trust *.replit.dev — a published
 * production deploy should only accept its own canonical origin so an
 * arbitrary preview URL on someone else's account can't make credentialed
 * calls to it.
 */

const PRODUCTION_HOSTS: ReadonlySet<string> = new Set([
  "deploybro.com",
  "www.deploybro.com",
]);

function hostFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const host = hostFromOrigin(origin);
  if (!host) return false;

  const explicit = (process.env.APP_ORIGIN ?? "").trim();
  if (explicit) {
    const explicitHost = hostFromOrigin(explicit);
    if (explicitHost && explicitHost === host) return true;
  }

  if (PRODUCTION_HOSTS.has(host)) return true;

  if (process.env.NODE_ENV !== "production") {
    if (host.endsWith(".replit.dev")) return true;
    if (host.endsWith(".replit.app")) return true;
    if (host.endsWith(".replit.co")) return true;
    if (host === "localhost" || host.startsWith("localhost:")) return true;
    if (host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return true;
  }

  return false;
}

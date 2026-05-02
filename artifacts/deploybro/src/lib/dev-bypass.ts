// Shared helpers for the developer-mode bypass. The bypass has two
// pieces of client state that MUST stay in lock-step:
//
//   1. `localStorage["deploybro:dev-bypass"] = "1"` — read by the
//      `AuthGate` component to short-circuit the OAuth check on
//      protected routes.
//   2. `dev_bypass=1` cookie — read by the API server's `tryAuth`
//      middleware to attach the seeded demo user to /api/* calls.
//
// Drift between these two (e.g. cookie expired but localStorage flag
// still present) used to manifest as "I'm on /dashboard but every
// network call 401s". Funneling all enable/disable/check operations
// through this module keeps both pieces in sync and gives the rest of
// the codebase a single import to find.
//
// Production safety: every mutation is gated on `import.meta.env.DEV`,
// which Vite constant-folds to `false` in built bundles. Vite then
// tree-shakes the dead branch, so the cookie and localStorage flag
// can never be set from a deployed build. The matching server-side
// gate (`NODE_ENV !== "production"`) provides defence in depth.

const STORAGE_KEY = "deploybro:dev-bypass";
const COOKIE_NAME = "dev_bypass";
// 7-day cookie — long enough to survive a normal dev session and an
// overnight pause, short enough that a long-forgotten dev session
// eventually expires on its own.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function readStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStorage(on: boolean): void {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may be disabled (private mode, storage quota,
    // etc.) — silently no-op. The cookie still functions on its own
    // for the API call path; the AuthGate short-circuit just won't
    // engage and the dev sees /login briefly.
  }
}

function readCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${COOKIE_NAME}=1`);
}

function writeCookie(on: boolean): void {
  if (typeof document === "undefined") return;
  if (on) {
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  } else {
    // max-age=0 + matching path is the only reliable way to delete a
    // cookie from JS; the browser drops it on the next request.
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * Turn the developer-mode bypass on. Sets both the localStorage flag
 * and the matching cookie atomically so the AuthGate and the API
 * server see the same thing on the very next render / request.
 *
 * No-op outside dev builds.
 */
export function enableDevBypass(): void {
  if (!import.meta.env.DEV) return;
  writeStorage(true);
  writeCookie(true);
}

/**
 * Turn the developer-mode bypass off. Always runs (even in production)
 * so a stale flag from a prior dev session can be wiped after a
 * deployed build is loaded — belt-and-braces alongside the
 * NODE_ENV-gated server check.
 *
 * Called from sign-out handlers so "Sign out" really means "log out
 * of everything", not "sign out of OAuth but quietly stay signed in
 * as the demo user".
 */
export function clearDevBypass(): void {
  writeStorage(false);
  writeCookie(false);
}

/**
 * True iff the dev bypass is currently considered active. We require
 * BOTH the localStorage flag AND the cookie: if only one is present
 * (e.g. the 7-day cookie expired while the localStorage flag stayed
 * set), the bypass is treated as inactive and any stale half-state is
 * cleared as a side effect. That self-heals the most common drift case
 * — an expired cookie leaving the AuthGate short-circuited but every
 * API call 401-ing — without needing an explicit boot-time
 * reconciliation step.
 *
 * Returns false in production builds.
 */
export function isDevBypassActive(): boolean {
  if (!import.meta.env.DEV) return false;
  const hasStorage = readStorage();
  const hasCookie = readCookie();
  if (hasStorage && hasCookie) return true;
  // Half-state — clear whichever piece is set so we converge on a
  // clean "off" state. Cheap, idempotent, and safe to call on every
  // render of AuthGate.
  if (hasStorage || hasCookie) clearDevBypass();
  return false;
}

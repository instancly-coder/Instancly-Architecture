// Shared helpers for the developer-mode bypass. The bypass communicates
// "I am the seeded demo user" to the API server via TWO redundant
// signals on every /api request:
//
//   1. `dev_bypass=1` cookie — sent automatically by the browser when
//      it can be set. Convenient because it just works for tools like
//      curl too.
//   2. `X-Dev-Bypass: 1` header — injected by a fetch wrapper installed
//      below. This is the bulletproof path: cookies set from inside
//      the Replit workspace's third-party iframe are silently dropped
//      by Chrome's third-party-cookie restrictions (the iframe is
//      cross-site relative to the parent window), so the cookie write
//      can fail with no error and `document.cookie` reads back empty.
//      The header bypasses that entirely.
//
// Either signal alone is sufficient server-side (see `tryAuth` in
// `artifacts/api-server/src/middlewares/auth.ts`). The client treats
// the localStorage flag as the SINGLE source of truth for "is bypass
// active right now" — the cookie is best-effort, never authoritative.
//
// Production safety: every mutation is gated on `import.meta.env.DEV`,
// which Vite constant-folds to `false` in built bundles. Vite then
// tree-shakes the dead branch, so neither the cookie, the localStorage
// flag, nor the fetch wrapper can ever be installed from a deployed
// build. The matching server-side gate (`NODE_ENV !== "production"`)
// provides defence in depth.

const STORAGE_KEY = "deploybro:dev-bypass";
const COOKIE_NAME = "dev_bypass";
const HEADER_NAME = "X-Dev-Bypass";
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
 * True iff the dev bypass is currently considered active.
 *
 * Authoritative source: the localStorage flag. The cookie is a
 * best-effort secondary signal — it may have failed to write (Chrome
 * blocks `document.cookie` writes from third-party iframes such as
 * the Replit workspace preview), so requiring it would lock devs out
 * of their own bypass in the most common workflow. The fetch wrapper
 * installed by `installDevBypassFetch()` ensures the server still
 * gets a usable signal via the `X-Dev-Bypass` header even when the
 * cookie is missing.
 *
 * Returns false in production builds.
 */
export function isDevBypassActive(): boolean {
  if (!import.meta.env.DEV) return false;
  return readStorage();
}

let fetchWrapperInstalled = false;

/**
 * Wrap `window.fetch` once on app boot so every same-origin /api
 * request carries an `X-Dev-Bypass: 1` header while the bypass is
 * active. The check runs at call-time (not install-time) so toggling
 * the bypass on/off from the UI takes effect on the very next fetch
 * without a reload.
 *
 * Why a header and not just the cookie: Chromium-based browsers drop
 * `document.cookie` writes from cross-site iframes (CHIPS / 3p-cookie
 * blocking). The Replit workspace preview is exactly such an iframe,
 * so the cookie write silently no-ops there. The header path doesn't
 * touch cookie storage at all and works identically inside and
 * outside the workspace iframe.
 *
 * No-op outside dev builds, and idempotent — safe to call from
 * `main.tsx` on every module load.
 */
export function installDevBypassFetch(): void {
  if (!import.meta.env.DEV) return;
  if (fetchWrapperInstalled) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;
  fetchWrapperInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    if (!readStorage()) return originalFetch(input, init);

    // Resolve the request URL across all three accepted input shapes
    // so we can decide whether it's a same-origin /api call.
    let url: string;
    if (typeof input === "string") url = input;
    else if (input instanceof URL) url = input.toString();
    else url = input.url;

    const isApi =
      url.startsWith("/api/") ||
      url.startsWith(`${window.location.origin}/api/`);
    if (!isApi) return originalFetch(input, init);

    // Merge any caller-supplied headers with our injected one.
    // Precedence: caller > us, so an explicit `X-Dev-Bypass: 0` from
    // a test could still opt out.
    const baseHeaders =
      init?.headers ??
      (typeof input !== "string" && !(input instanceof URL)
        ? input.headers
        : undefined);
    const headers = new Headers(baseHeaders);
    if (!headers.has(HEADER_NAME)) headers.set(HEADER_NAME, "1");

    return originalFetch(input, { ...init, headers });
  };
}

import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "../lib/origin-allowlist";

const STATE_CHANGING_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
]);

/**
 * Same-origin guard used to defeat CSRF against cookie-authed routes.
 *
 * The frontend authenticates with an httpOnly `auth_token` cookie that
 * the browser attaches automatically on cross-origin requests. Without
 * this guard, any third-party site the user visits while logged in
 * could trigger state changes on their behalf (rename projects, run
 * paid AI builds, delete data, etc.) — the cookie travels with the
 * request and the server can't tell it apart from a legitimate one.
 *
 * Behavior:
 *   - GET / HEAD / OPTIONS: skipped. These should not mutate state,
 *     and the CORS layer already prevents the attacker from reading
 *     credentialed cross-origin responses.
 *   - Authorization: Bearer <token> requests: skipped. Bearer tokens
 *     have to be programmatically attached by JavaScript that has read
 *     access to the token, which a third-party site can't do (CORS
 *     and httpOnly cookies block both vectors). So Bearer-authed
 *     requests are inherently CSRF-immune.
 *   - Otherwise: require the Origin (or Referer as fallback) header
 *     to match the allow-list. Missing headers fail closed.
 *
 * The `/api/stripe/webhook` route is mounted on a separate router
 * BEFORE the main `/api` router, so this middleware is never installed
 * in front of it. Stripe webhook authenticity is verified by HMAC
 * signature inside the handler, which is the correct boundary for
 * server-to-server callbacks.
 */
export function csrfGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    next();
    return;
  }

  const auth = req.headers.authorization ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    next();
    return;
  }

  const origin =
    (req.headers.origin as string | undefined) ??
    (req.headers.referer as string | undefined) ??
    null;

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ status: "error", message: "forbidden origin" });
    return;
  }

  next();
}

/**
 * Explicit per-route same-origin check. Identical policy to `csrfGuard`
 * but ALWAYS runs (no Bearer-token bypass). Use on the cookie-issuing
 * endpoints `/api/auth/session` and `/api/auth/sign-out` so an attacker
 * can't pass their own JWT in the body and force the victim's browser
 * to adopt the attacker's session — this is the "session fixation"
 * variant of CSRF and bypassing it on Bearer would defeat the whole
 * purpose of the cookie-set endpoint.
 *
 * Returns true if the origin is allowed (handler should continue);
 * false if a 403 has already been written (handler should return).
 */
export function requireSameOrigin(req: Request, res: Response): boolean {
  const origin =
    (req.headers.origin as string | undefined) ??
    (req.headers.referer as string | undefined) ??
    null;
  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ status: "error", message: "forbidden origin" });
    return false;
  }
  return true;
}

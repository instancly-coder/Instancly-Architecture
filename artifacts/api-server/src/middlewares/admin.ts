import type { NextFunction, Request, Response } from "express";
import { authConfigured, getAuthedUser } from "./auth";

/**
 * Centralized admin gate. Extracted from `routes/admin.ts` so other
 * routers can use it (e.g. `/api/db/*` debug endpoints).
 *
 * Admin membership is configured by the `ADMIN_USERNAMES` env var,
 * a comma-separated list of usernames matched case-insensitively.
 *
 * Dev fallback: when no upstream auth is configured at all
 * (`AUTH_JWKS_URL` missing) AND we're not in production, the demo
 * user is treated as an admin so the workspace is exercisable
 * without provisioning OAuth or admin lists. The production guard
 * in `middlewares/auth.ts` refuses to boot a production server
 * without JWKS, so this dev fallback can never apply in prod.
 */
export const ADMIN_USERNAMES: readonly string[] = (
  process.env.ADMIN_USERNAMES ?? ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const DEV_ADMIN_ALLOWED =
  process.env.NODE_ENV !== "production" && !authConfigured;

export function isAdminUser(username: string | undefined | null): boolean {
  if (!username) return false;
  if (ADMIN_USERNAMES.length === 0) return false;
  return ADMIN_USERNAMES.includes(username.toLowerCase());
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (DEV_ADMIN_ALLOWED) {
    next();
    return;
  }
  const user = getAuthedUser(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  if (!isAdminUser(user.username)) {
    res.status(403).json({ status: "error", message: "Forbidden" });
    return;
  }
  next();
}

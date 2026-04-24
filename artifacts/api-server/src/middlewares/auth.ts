import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const JWKS_URL = process.env.AUTH_JWKS_URL;
const ISSUER = process.env.AUTH_ISSUER_URL;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

if (JWKS_URL) {
  try {
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  } catch (err) {
    logger.error({ err }, "Invalid AUTH_JWKS_URL");
  }
}

export type AuthedUser = {
  id: string;
  sub: string;
  email: string;
  username: string;
  displayName: string;
};

export type AuthedRequest = Request & {
  auth?: {
    payload: JWTPayload;
    user: AuthedUser;
  };
};

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  // Allow cookie fallback for browser flows
  const cookieToken = (req as Request & { cookies?: Record<string, string> })
    .cookies?.["auth_token"];
  return cookieToken ?? null;
}

async function ensureUser(payload: JWTPayload): Promise<AuthedUser> {
  const sub = String(payload.sub ?? "");
  const email =
    String(payload.email ?? payload.preferred_username ?? `${sub}@unknown`);
  const displayName = String(
    payload.name ?? payload.preferred_username ?? email.split("@")[0],
  );
  const username = String(
    payload.preferred_username ??
      payload.username ??
      email.split("@")[0] ??
      sub.slice(0, 8),
  )
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40) || sub.slice(0, 8);

  // Try by email first (stable across sessions)
  const existing = (
    await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1)
  )[0];

  if (existing) {
    return {
      id: existing.id,
      sub,
      email: existing.email,
      username: existing.username,
      displayName: existing.displayName,
    };
  }

  // Make sure username is unique
  let finalUsername = username;
  let n = 2;
  while (
    (
      await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.username, finalUsername))
        .limit(1)
    ).length > 0
  ) {
    finalUsername = `${username}-${n++}`;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      email,
      username: finalUsername,
      displayName,
      avatarUrl: (payload.picture as string | undefined) ?? null,
    })
    .returning();

  return {
    id: created.id,
    sub,
    email: created.email,
    username: created.username,
    displayName: created.displayName,
  };
}

/**
 * In development, when no real auth token is present we fall back to a
 * stable "demo" user so the product is fully usable without a configured
 * Stack Auth (Google/Apple/GitHub). Real tokens still take precedence and
 * production never hits this path.
 */
const DEV_BYPASS_ENABLED = process.env.NODE_ENV !== "production";
const DEV_BYPASS_EMAIL = "demo@instancly.local";

let devUserCache: AuthedUser | null = null;
let devUserPromise: Promise<AuthedUser> | null = null;

async function provisionDevUser(): Promise<AuthedUser> {
  // Race-safe: try insert, ignore unique-violations, then re-select the
  // canonical row by email. This handles concurrent first-requests after a
  // cold start without producing duplicate users *or* spurious 401s.
  await db
    .insert(usersTable)
    .values({
      email: DEV_BYPASS_EMAIL,
      username: "demo",
      displayName: "Demo User",
      avatarUrl: null,
    })
    .onConflictDoNothing({ target: usersTable.email });

  const row = (
    await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, DEV_BYPASS_EMAIL))
      .limit(1)
  )[0];

  if (!row) {
    throw new Error("dev bypass user could not be provisioned");
  }
  return {
    id: row.id,
    sub: `dev:${row.id}`,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
  };
}

async function getOrCreateDevUser(): Promise<AuthedUser> {
  if (devUserCache) return devUserCache;
  // Coalesce concurrent callers onto a single in-flight provisioning promise.
  if (!devUserPromise) {
    devUserPromise = provisionDevUser()
      .then((u) => {
        devUserCache = u;
        return u;
      })
      .finally(() => {
        devUserPromise = null;
      });
  }
  return devUserPromise;
}

/**
 * Verifies the bearer token if present, attaches `req.auth`. Does NOT reject
 * the request when missing/invalid — use `requireAuth` for that.
 *
 * In development with no token present, attaches a stable demo user so the
 * app can be exercised end-to-end without a configured OAuth provider.
 */
export async function tryAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = jwks ? extractToken(req) : null;
  if (jwks && token) {
    try {
      const verifyOpts: Parameters<typeof jwtVerify>[2] = {};
      if (ISSUER) verifyOpts.issuer = ISSUER;
      const { payload } = await jwtVerify(token, jwks, verifyOpts);
      const user = await ensureUser(payload);
      (req as AuthedRequest).auth = { payload, user };
      return next();
    } catch (err) {
      logger.debug({ err }, "JWT verification failed");
    }
  }

  if (DEV_BYPASS_ENABLED) {
    try {
      const user = await getOrCreateDevUser();
      (req as AuthedRequest).auth = { payload: { sub: user.sub }, user };
    } catch (err) {
      logger.error({ err }, "Failed to provision dev bypass user");
    }
  }

  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = (req as AuthedRequest).auth;
  if (!auth) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  next();
}

export function getAuthedUser(req: Request): AuthedUser | null {
  return (req as AuthedRequest).auth?.user ?? null;
}

export const authConfigured = Boolean(jwks);

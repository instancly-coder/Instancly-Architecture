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
 * Verifies the bearer token if present, attaches `req.auth`. Does NOT reject
 * the request when missing/invalid — use `requireAuth` for that.
 */
export async function tryAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!jwks) return next();
  const token = extractToken(req);
  if (!token) return next();
  try {
    const verifyOpts: Parameters<typeof jwtVerify>[2] = {};
    if (ISSUER) verifyOpts.issuer = ISSUER;
    const { payload } = await jwtVerify(token, jwks, verifyOpts);
    const user = await ensureUser(payload);
    (req as AuthedRequest).auth = { payload, user };
  } catch (err) {
    logger.debug({ err }, "JWT verification failed");
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

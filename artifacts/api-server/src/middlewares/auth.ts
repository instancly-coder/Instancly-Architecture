import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  clearReferralCookie,
  readReferralAttribution,
} from "../lib/referral-attribution";

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

/**
 * Decide whether a JWT's `iss` claim is one we accept.
 *
 *  - If `AUTH_ISSUER_URL` isn't configured, accept anything (signature
 *    verification via JWKS is the actual security check).
 *  - Accept exact string equality with `AUTH_ISSUER_URL`.
 *  - Accept any URL whose origin (`protocol + host`) matches the
 *    configured one. This tolerates the common Neon Auth case where
 *    the JWT's `iss` is the bare host but `AUTH_ISSUER_URL` has the
 *    Better Auth path appended (or vice versa).
 *
 * Origin equality is deliberately stricter than host-only — we still
 * require the same scheme so an http impersonator can't pass for an
 * https issuer.
 */
function isAcceptableIssuer(claimedIss: unknown): boolean {
  if (!ISSUER) return true;
  if (typeof claimedIss !== "string" || !claimedIss) return false;
  if (claimedIss === ISSUER) return true;
  try {
    const expected = new URL(ISSUER);
    const actual = new URL(claimedIss);
    return (
      expected.protocol === actual.protocol && expected.host === actual.host
    );
  } catch {
    return false;
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

async function ensureUser(
  payload: JWTPayload,
  req: Request,
  res: Response,
): Promise<AuthedUser> {
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

  // Read the referral attribution cookie BEFORE inserting so we can stamp
  // the new row with `referredByUserId` / `referredViaProjectId` in a
  // single insert. We also clear the cookie afterwards (regardless of
  // whether we found one) so a shared device doesn't re-attribute the
  // next person who signs up on it to the same creator.
  //
  // We pass `null` for selfUserId because the user doesn't exist yet —
  // there is no "self" to compare against until after the insert.
  const attribution = readReferralAttribution(req, null);

  const [created] = await db
    .insert(usersTable)
    .values({
      email,
      username: finalUsername,
      displayName,
      avatarUrl: (payload.picture as string | undefined) ?? null,
      referredByUserId: attribution?.referrerUserId ?? null,
      referredViaProjectId: attribution?.referredViaProjectId ?? null,
    })
    .returning();

  // Always clear the cookie post-signup, even when no usable
  // attribution was found, so a malformed/expired cookie can't linger
  // on a shared device and re-attribute the next person who signs up.
  clearReferralCookie(res);

  return {
    id: created.id,
    sub,
    email: created.email,
    username: created.username,
    displayName: created.displayName,
  };
}

/**
 * Dev-only "demo" user fallback so the product is exercisable when no
 * upstream auth provider is wired up at all. The bypass is gated on
 * BOTH conditions:
 *   1. We're not in production.
 *   2. JWKS is unconfigured (i.e. `AUTH_JWKS_URL` was not set on boot).
 *
 * The moment real auth is configured — even in development — we MUST
 * stop silently signing requests in as the demo user, otherwise a
 * transient cookie-sync race (e.g. right after a Google OAuth callback)
 * would resolve `/api/me` to "demo" instead of the real account, and
 * the homepage prompt would create the user's project under the wrong
 * owner.
 */
const DEV_BYPASS_ENABLED =
  process.env.NODE_ENV !== "production" && !jwks;
const DEV_BYPASS_EMAIL = "demo@deploybro.local";

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
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = jwks ? extractToken(req) : null;
  if (jwks && token) {
    try {
      // Don't pass `issuer` to jose's verifier. We do the iss check
      // ourselves below with `isAcceptableIssuer` so we can tolerate
      // the common Neon Auth case where the JWT's `iss` is the bare
      // host (`https://<id>.neonauth.<region>.aws.neon.tech`) but the
      // `AUTH_ISSUER_URL` env var was set to the same URL with the
      // `/<db>/auth` Better Auth path appended (a natural mistake
      // because the JWKS URL DOES include that path). Signature
      // verification via JWKS is unaffected — that's the actual
      // security boundary.
      const { payload } = await jwtVerify(token, jwks, {});
      if (!isAcceptableIssuer(payload.iss)) {
        throw new Error(
          `unexpected "iss" claim value: ${JSON.stringify(payload.iss)}`,
        );
      }
      // Reject tokens with no subject — `ensureUser` would otherwise
      // synthesize an `@unknown` email and provision a ghost row.
      if (typeof payload.sub !== "string" || !payload.sub.trim()) {
        throw new Error("token is missing a non-empty 'sub' claim");
      }
      const user = await ensureUser(payload, req, res);
      (req as AuthedRequest).auth = { payload, user };
      return next();
    } catch (err) {
      // Promoted from `debug` to `warn` because silent JWT verification
      // failures are the #1 cause of "I'm logged in but every API call
      // 401s" reports. Emits issuer/audience hints and decoded `iss`
      // when available so misconfigured `AUTH_ISSUER_URL` env vars are
      // self-diagnosing in the logs. Token contents themselves are
      // intentionally never logged.
      let decodedIss: string | undefined;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payloadJson = JSON.parse(
            Buffer.from(parts[1], "base64url").toString("utf8"),
          ) as { iss?: unknown };
          if (typeof payloadJson.iss === "string") {
            decodedIss = payloadJson.iss;
          }
        }
      } catch {
        // ignore — we'll just log without the iss hint
      }
      logger.warn(
        {
          errMessage: err instanceof Error ? err.message : String(err),
          expectedIssuer: ISSUER ?? null,
          tokenIssuer: decodedIss ?? null,
          tokenLength: token.length,
        },
        "JWT verification failed — request will be treated as unauthenticated",
      );
    }
  } else if (jwks && !token) {
    logger.debug(
      { hasCookie: Boolean((req as Request & { cookies?: Record<string, string> }).cookies?.["auth_token"]), hasAuthHeader: Boolean(req.headers.authorization) },
      "No bearer token on request",
    );
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

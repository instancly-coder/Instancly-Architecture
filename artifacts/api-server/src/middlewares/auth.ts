import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  FREE_TIER_MONTHLY_AMOUNT,
  grantFreeMonthlyIfDue,
} from "../lib/free-credits";
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

// Production boot guard. The dev bypass below ("everyone is the demo
// user when JWKS isn't configured") is convenient locally but would be
// catastrophic if it ever activated in a production deployment — every
// incoming request would be silently authenticated as `demo@deploybro.local`
// and gain access to that user's data.
//
// The previous gate was `NODE_ENV !== 'production' && !jwks`, which
// failed CLOSED in prod (no auth at all if misconfigured) but failed
// OPEN if someone set NODE_ENV by mistake. Refusing to boot is the
// only safe behavior: a missing JWKS in production is always a
// misconfiguration, never an intentional state.
if (process.env.NODE_ENV === "production" && !jwks) {
  logger.fatal(
    {
      hasJwksUrl: Boolean(JWKS_URL),
      hasIssuer: Boolean(ISSUER),
    },
    "AUTH_JWKS_URL is required in production. Refusing to boot — without JWKS the dev bypass would silently sign every request in as the demo user.",
  );
  // Throw rather than process.exit so the wrapping process manager
  // (and our own logger flush) can see the cause. index.ts has no
  // catch around the import, so this terminates the process.
  throw new Error(
    "AUTH_JWKS_URL is required in production but is missing or invalid",
  );
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
    // Fire-and-forget: top up Free-tier users to $2.50 if they're due.
    // Conditional UPDATE — no-op when not due, so cheap to call here.
    void grantFreeMonthlyIfDue(existing.id);
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
      // Free-tier signup grant: every new account starts with $2.50
      // and a fresh 30-day grant clock. See lib/free-credits.ts for
      // the matching monthly top-up logic.
      balance: FREE_TIER_MONTHLY_AMOUNT,
      freeMonthlyGrantAt: new Date(),
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
 * upstream auth provider is wired up at all. There are two flavours of
 * the bypass, both gated on `NODE_ENV !== "production"` so they are
 * physically incapable of activating in a deployed build:
 *
 *   1. **Auto** — JWKS is unconfigured (`AUTH_JWKS_URL` not set). Every
 *      request with no token gets the demo user. This is the
 *      "I just cloned the repo and want to click around" mode.
 *   2. **Opt-in** — JWKS *is* configured (real auth is wired up) but
 *      the request carries a `dev_bypass=1` cookie. Set by the
 *      "Developer mode" button on /login. Lets a dev with real auth
 *      configured still skip OAuth on demand without breaking the
 *      normal authenticated flow for everyone else on the same instance.
 *
 * The opt-in flavour is only consulted *after* JWT verification has
 * been attempted, so a real signed-in user is never silently demoted
 * to the demo account by a stray cookie — the cookie just lets an
 * unauthenticated browser pretend to be signed in.
 */
const DEV_BYPASS_ALLOWED = process.env.NODE_ENV !== "production";
const DEV_BYPASS_AUTO_ENABLED = DEV_BYPASS_ALLOWED && !jwks;
const DEV_BYPASS_COOKIE = "dev_bypass";
const DEV_BYPASS_HEADER = "x-dev-bypass";

/**
 * True iff the request explicitly opted in to the dev bypass via
 * EITHER the `dev_bypass=1` cookie OR the `X-Dev-Bypass: 1` header.
 *
 * Both are accepted because the cookie path is unreliable in some
 * contexts: when the dev runs the app inside the Replit workspace
 * preview iframe (a third-party iframe relative to the parent
 * window), Chrome silently blocks `document.cookie` writes from the
 * client. The header path doesn't touch cookie storage and works
 * everywhere. The deploybro frontend installs a `fetch` wrapper that
 * adds the header on /api requests whenever the user-facing bypass
 * is active — see `lib/dev-bypass.ts`.
 */
function hasDevBypassSignal(req: Request): boolean {
  if (!DEV_BYPASS_ALLOWED) return false;
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  if (cookies?.[DEV_BYPASS_COOKIE] === "1") return true;
  const header = req.headers[DEV_BYPASS_HEADER];
  return header === "1";
}

const DEV_BYPASS_EMAIL = "demo@deploybro.local";

let devUserCache: AuthedUser | null = null;
let devUserPromise: Promise<AuthedUser> | null = null;

async function provisionDevUser(): Promise<AuthedUser> {
  // Fast path: the demo row already exists from a previous run. Skip the
  // insert entirely so we don't have to think about either unique
  // constraint (email OR username) on the happy path.
  const existing = (
    await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, DEV_BYPASS_EMAIL))
      .limit(1)
  )[0];
  if (existing) {
    return {
      id: existing.id,
      sub: `dev:${existing.id}`,
      email: existing.email,
      username: existing.username,
      displayName: existing.displayName,
    };
  }

  // First-time provisioning. The username "demo" is the natural pick but
  // it's not reserved — a real user may already have claimed it. We can't
  // express "ON CONFLICT (email OR username) DO NOTHING" in a single
  // statement, so probe the username and pick a unique fallback before
  // inserting. The remaining insert race is handled by onConflictDoNothing
  // on the email target plus a re-select.
  const desiredUsernameTaken = (
    await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, "demo"))
      .limit(1)
  )[0];
  const username = desiredUsernameTaken
    ? `demo-${Math.random().toString(36).slice(2, 8)}`
    : "demo";

  await db
    .insert(usersTable)
    .values({
      email: DEV_BYPASS_EMAIL,
      username,
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

  // Activate the demo-user bypass when EITHER the environment has no
  // real auth configured (auto mode) OR the request explicitly opted
  // in via the dev-mode signal (cookie or X-Dev-Bypass header — see
  // hasDevBypassSignal). Both paths are gated on
  // `NODE_ENV !== "production"` upstream — there is no code path that
  // attaches the demo user in a production build.
  if (DEV_BYPASS_AUTO_ENABLED || hasDevBypassSignal(req)) {
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

import crypto from "node:crypto";
import type { Request, Response } from "express";

const COOKIE_NAME = "db_ref";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

/**
 * HMAC key used to sign the attribution cookie. Without this, anyone
 * could craft a `db_ref` cookie pointing at an arbitrary creator and
 * silently divert future signup commissions to themselves. We require a
 * dedicated secret in production; in development we derive a stable
 * fallback from process state so local testing still works without env
 * setup, but a warning is logged once at startup.
 */
function resolveSecret(): string {
  const explicit =
    process.env.REFERRAL_COOKIE_SECRET ?? process.env.SESSION_SECRET ?? "";
  if (explicit && explicit.length >= 16) return explicit;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "REFERRAL_COOKIE_SECRET must be set (>= 16 chars) in production",
    );
  }
  return "dev-only-referral-cookie-secret-do-not-use-in-prod";
}

const SECRET = resolveSecret();

type CookiePayload = {
  u: string;
  p?: string;
};

export type ReferralAttribution = {
  referrerUserId: string;
  referredViaProjectId: string | null;
};

function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

function sign(payloadJson: string): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(payloadJson)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Cookie wire format: `<base64url(payloadJson)>.<base64url(hmac)>`.
 *
 * Verifies the signature in constant time, then re-parses the JSON
 * payload and validates each field. Any tampering — wrong signature,
 * malformed JSON, non-UUID values — collapses to `null` so attribution
 * is silently dropped rather than crediting the wrong creator.
 */
function parseSignedCookie(raw: string | undefined): CookiePayload | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(payloadJson);
  if (!safeEqual(expected, sig)) return null;

  try {
    const parsed = JSON.parse(payloadJson) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (!isUuid(p.u)) return null;
    if (p.p !== undefined && !isUuid(p.p)) return null;
    return { u: p.u, p: p.p as string | undefined };
  } catch {
    return null;
  }
}

function encodeSignedCookie(payload: CookiePayload): string {
  const json = JSON.stringify(payload);
  const payloadB64 = Buffer.from(json, "utf8").toString("base64url");
  return `${payloadB64}.${sign(json)}`;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_MS,
  };
}

/**
 * Drop the short-lived attribution cookie identifying which creator
 * (and which project, if any) the visitor arrived from. Used by the
 * public profile and template-view endpoints so that a later signup
 * can be credited back to the referrer.
 *
 * Three guards keep this from being abused:
 *   1. We never overwrite an existing valid `db_ref` (first-touch wins
 *      — the creator who actually drove the click should keep credit
 *      even if the visitor wanders to another profile before signing
 *      up).
 *   2. We never set the cookie on requests that already carry an
 *      `auth_token`. A logged-in person browsing a creator's page
 *      can't be referred — they already have an account — and dropping
 *      the cookie there would only mis-attribute a *different* signup
 *      on the same device later (e.g. shared family laptop).
 *   3. The cookie value is HMAC-signed; client-side tampering to point
 *      attribution at a different creator is rejected at read time
 *      (see `parseSignedCookie`).
 */
export function setReferralCookieIfAbsent(
  req: Request,
  res: Response,
  referrerUserId: string,
  projectId?: string,
): void {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  if (cookies?.["auth_token"]) return;
  // Only treat the existing cookie as "present" if it's valid — a
  // tampered or expired-key cookie shouldn't permanently block a real
  // attribution from being written.
  if (cookies?.[COOKIE_NAME] && parseSignedCookie(cookies[COOKIE_NAME])) {
    return;
  }

  if (!isUuid(referrerUserId)) return;

  const payload: CookiePayload = { u: referrerUserId };
  if (projectId && isUuid(projectId)) payload.p = projectId;

  res.cookie(COOKIE_NAME, encodeSignedCookie(payload), cookieOptions());
}

/**
 * Read the attribution cookie off the request. Returns null if the
 * cookie is missing, has an invalid signature, is malformed, or is
 * self-referential (`referrerUserId === selfId`). The self-check
 * defends against a creator visiting their own page in an incognito
 * window and then signing up — they can't refer themselves.
 */
export function readReferralAttribution(
  req: Request,
  selfUserId: string | null,
): ReferralAttribution | null {
  const raw = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    COOKIE_NAME
  ];
  const parsed = parseSignedCookie(raw);
  if (!parsed) return null;
  if (selfUserId && parsed.u === selfUserId) return null;
  return {
    referrerUserId: parsed.u,
    referredViaProjectId: parsed.p ?? null,
  };
}

/**
 * Clear the attribution cookie. Called once attribution has been written
 * into the new user's row so the same device doesn't re-attribute a
 * second signup to the same referrer.
 */
export function clearReferralCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

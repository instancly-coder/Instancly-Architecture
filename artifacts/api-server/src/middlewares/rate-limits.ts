import { rateLimit, ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request } from "express";
import { getAuthedUser } from "./auth";

/**
 * Rate limiters for the API.
 *
 * All limiters use the in-memory store, which is fine for a single-
 * process Node deployment (the api-server runs as one process behind
 * the Replit proxy). If we ever scale horizontally we'll need to swap
 * in a shared store (Redis), but the limiter API is unchanged.
 *
 * `trust proxy` MUST be set on the Express app (we set it to `1` in
 * app.ts) for `req.ip` to reflect the real client IP from
 * X-Forwarded-For instead of the Replit proxy's loopback. Without
 * that, every request would key against the same IP and the limiter
 * would either let everyone through together or block everyone
 * together.
 */

function jsonError(message: string): Pick<Options, "handler"> {
  return {
    handler: (_req, res, _next, options) => {
      res
        .status(options.statusCode)
        .setHeader("Retry-After", String(Math.ceil(options.windowMs / 1000)))
        .json({ status: "error", message });
    },
  };
}

/**
 * Coarse per-IP throttle on the entire /api surface. Sized generously
 * so a busy real user (lots of tab switches, dashboard polling) is
 * never affected; the goal is to swat away abusive bots and runaway
 * scripts before they hit the more expensive per-route limiters.
 */
export const globalLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...jsonError("Too many requests, slow down."),
});

/**
 * Tight per-IP throttle on cookie-issuing auth endpoints so login
 * brute force / session fixation attempts can't be amplified.
 * 30/minute is plenty for any real user's tab-restore avalanche
 * but stops a script dead.
 */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...jsonError("Too many auth attempts, slow down."),
});

/**
 * Per-user (or per-IP if unauthed) throttle on the AI builder
 * endpoints. Each AI build is a real Anthropic spend (Sonnet/Opus
 * are not cheap) so this is the most cost-sensitive surface in the
 * app. We key on the authed user id where possible — that way a
 * single user can't dodge the limit by rotating IP via mobile
 * tethering, and a NAT'd office full of legitimate users isn't
 * collectively rate-limited under one IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request, res) => {
    const user = getAuthedUser(req);
    if (user) return `u:${user.id}`;
    // ipKeyGenerator handles IPv6 normalization (collapses /64 prefix)
    // so v6 clients can't trivially evade by rotating the suffix.
    return ipKeyGenerator(req.ip ?? "0.0.0.0");
  },
  ...jsonError("AI rate limit reached, please wait a minute."),
});

/**
 * Heavier throttle on the public/unauthenticated read endpoints
 * (/api/templates, /api/explore) which are the most attractive
 * targets for scraping. Real users browse these gently; a scraper
 * pulling every page hits the limit immediately.
 */
export const publicReadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...jsonError("Too many requests, please slow down."),
});

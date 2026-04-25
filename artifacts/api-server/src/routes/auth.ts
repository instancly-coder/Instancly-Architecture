import { Router, type IRouter, type Request, type Response } from "express";
import { authConfigured, getAuthedUser } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * Allow-list of origins permitted to call /api/auth/session and
 * /api/auth/sign-out. Anything else is rejected with 403 to defeat
 * CSRF / login-fixation attacks against the cookie-set endpoint.
 *
 * In dev we allow Replit's preview proxy + localhost; in prod we trust
 * only the canonical app origin (overridable via APP_ORIGIN).
 */
function isAllowedAuthOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const explicit = (process.env.APP_ORIGIN ?? "").trim();
  if (explicit) {
    try {
      if (new URL(explicit).host === host) return true;
    } catch {}
  }
  if (host === "deploybro.com" || host === "www.deploybro.com") return true;
  if (process.env.NODE_ENV !== "production") {
    if (host.endsWith(".replit.dev")) return true;
    if (host.endsWith(".replit.app")) return true;
    if (host === "localhost" || host.startsWith("localhost:")) return true;
    if (host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return true;
  }
  return false;
}

function requireSameOrigin(req: Request, res: Response): boolean {
  const origin =
    (req.headers.origin as string | undefined) ??
    (req.headers.referer as string | undefined);
  if (!isAllowedAuthOrigin(origin)) {
    res.status(403).json({ status: "error", message: "forbidden origin" });
    return false;
  }
  return true;
}

router.get("/auth/config", (_req: Request, res: Response) => {
  res.json({
    configured: authConfigured,
    issuer: process.env.AUTH_ISSUER_URL ?? null,
    jwksUrl: process.env.AUTH_JWKS_URL ?? null,
    signInUrl: process.env.AUTH_SIGN_IN_URL ?? null,
  });
});

router.get("/auth/whoami", (req: Request, res: Response) => {
  const user = getAuthedUser(req);
  if (!user) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return;
  }
  res.json(user);
});

router.post("/auth/session", (req: Request, res: Response) => {
  if (!requireSameOrigin(req, res)) return;
  const { token } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    res.status(400).json({ status: "error", message: "token required" });
    return;
  }
  res.cookie("auth_token", token, {
    // The frontend never reads this cookie — it just calls /api/auth/session
    // with a fresh JWT and lets the server store it. Keeping it httpOnly
    // means an XSS in the SPA can't exfiltrate the bearer token.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
  res.json({ ok: true });
});

router.post("/auth/sign-out", (req: Request, res: Response) => {
  if (!requireSameOrigin(req, res)) return;
  res.clearCookie("auth_token", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ ok: true });
});

export default router;

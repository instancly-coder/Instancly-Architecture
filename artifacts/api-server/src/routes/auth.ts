import { Router, type IRouter, type Request, type Response } from "express";
import { authConfigured, getAuthedUser } from "../middlewares/auth";

const router: IRouter = Router();

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

router.post("/auth/sign-out", (_req: Request, res: Response) => {
  res.clearCookie("auth_token", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ ok: true });
});

export default router;

import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import stripeWebhookRouter from "./routes/stripe-webhook";
import { logger } from "./lib/logger";
import { tryAuth } from "./middlewares/auth";
import { csrfGuard } from "./middlewares/csrf";
import { globalLimiter } from "./middlewares/rate-limits";
import { isAllowedOrigin } from "./lib/origin-allowlist";

const app: Express = express();

// We sit behind exactly one reverse proxy hop (the Replit shared proxy
// in dev, the platform load balancer in production). Trusting one hop
// makes `req.ip` reflect the real client from X-Forwarded-For instead
// of the proxy's loopback address — without this every rate-limit key
// would collapse to a single IP. Setting the value too high (e.g.
// `true`) would let a client spoof their IP by injecting their own
// X-Forwarded-For header, so we cap it at 1.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS allow-list. We previously echoed every Origin (`origin: true`),
// which combined with `credentials: true` meant any third-party page
// the user visited could read authenticated cross-origin responses.
// The function below consults the shared allow-list in
// `lib/origin-allowlist.ts` so we have a single source of truth across
// CORS, the CSRF guard, and the auth route's local check.
//
// Requests with no Origin header (curl, server-to-server, same-origin
// navigations) are passed through with no CORS headers attached — the
// CSRF guard handles those separately for state-changing methods.
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, false);
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  }),
);
app.use(cookieParser());

// Stripe webhook MUST be mounted before the global JSON parser. Stripe
// signs the raw byte stream, so re-parsing into a JS object and back into
// JSON would change the bytes (key ordering, whitespace) and the HMAC
// would never match. The webhook router has its own `express.raw()` body
// parser scoped to its single POST handler.
//
// It's also intentionally mounted before the global rate limiter and
// CSRF guard: webhook authenticity is verified by HMAC signature inside
// the handler, and we don't want a noisy retry storm from Stripe to
// trip our IP-based throttle and start failing legitimate webhooks.
app.use("/api", stripeWebhookRouter);

// Coarse per-IP throttle on every other /api request. Mounted before
// JSON parsing so a flood of 30MB bodies can be rejected without the
// CPU cost of parsing them.
app.use("/api", globalLimiter);

// Image attachments for AI builds arrive as base64 inside the JSON body —
// up to 5 images of ~5MB each, plus headroom for the prompt and URL list.
// 30MB is comfortably above that ceiling without inviting abuse. Per-route
// tighter caps (e.g. 1MB on /auth/session, which only carries a token
// string) live inside their respective routers.
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(tryAuth);

// Serve static public assets (e.g. shadcn-ui.js CDN bundle for previews).
// __dirname is shimmed by the esbuild banner to point to the dist/ directory,
// so this resolves to dist/public/ at runtime after the build copy step.
app.use("/api/assets", express.static(path.join(__dirname, "public")));

// CSRF same-origin gate for POST/PATCH/PUT/DELETE under /api. Mounted
// AFTER tryAuth so authed-by-bearer-header requests can be detected and
// exempted (Bearer auth is CSRF-immune by construction). See csrf.ts.
app.use("/api", csrfGuard);

app.use("/api", router);

export default app;

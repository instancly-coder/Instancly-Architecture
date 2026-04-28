import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import stripeWebhookRouter from "./routes/stripe-webhook";
import { logger } from "./lib/logger";
import { tryAuth } from "./middlewares/auth";

const app: Express = express();

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
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

// Stripe webhook MUST be mounted before the global JSON parser. Stripe
// signs the raw byte stream, so re-parsing into a JS object and back into
// JSON would change the bytes (key ordering, whitespace) and the HMAC
// would never match. The webhook router has its own `express.raw()` body
// parser scoped to its single POST handler.
app.use("/api", stripeWebhookRouter);

// Image attachments for AI builds arrive as base64 inside the JSON body —
// up to 5 images of ~5MB each, plus headroom for the prompt and URL list.
// 30MB is comfortably above that ceiling without inviting abuse.
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(tryAuth);

// Serve static public assets (e.g. shadcn-ui.js CDN bundle for previews).
// __dirname is shimmed by the esbuild banner to point to the dist/ directory,
// so this resolves to dist/public/ at runtime after the build copy step.
app.use("/api/assets", express.static(path.join(__dirname, "public")));

app.use("/api", router);

export default app;

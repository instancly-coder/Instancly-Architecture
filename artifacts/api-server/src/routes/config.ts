import { Router, type IRouter, type Request, type Response } from "express";
import { AppConfigResponse } from "@workspace/api-zod";
import { PAYLOAD_SIZE_LIMIT_BYTES } from "../lib/deploy-payload";
import { MAX_UPLOAD_BYTES } from "./files";

const router: IRouter = Router();

// Public, unauthenticated config endpoint. The frontend fetches this once
// on mount so the Files panel size gauge and the per-file upload guard
// always reflect the *server's* limits — preventing the kind of drift
// where the gauge says "75 / 90 MB OK" while the server actually rejects
// at 60MB. The server is the single source of truth for these caps.
router.get("/config", (_req: Request, res: Response) => {
  const data = AppConfigResponse.parse({
    publishSizeLimitBytes: PAYLOAD_SIZE_LIMIT_BYTES,
    perFileUploadLimitBytes: MAX_UPLOAD_BYTES,
  });
  res.json(data);
});

export default router;

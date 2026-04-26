import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
  FinalizeUploadBody,
  FinalizeUploadResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import {
  ObjectPermission,
  getObjectAclPolicy,
} from "../lib/objectAcl";
import { requireAuth, getAuthedUser } from "../middlewares/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Mint a presigned PUT URL for direct-to-GCS upload. Auth-only —
 * issuing presigned URLs to anonymous callers would let anyone fill
 * our bucket and burn through our quota.
 *
 * The client sends JSON metadata (name, size, contentType) only — never
 * the file bytes. The file is then PUT directly to the returned
 * uploadURL, and the client must call /storage/uploads/finalize to make
 * the object readable through /storage/objects/*.
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  },
);

/**
 * POST /storage/uploads/finalize
 *
 * Stamp ACL metadata on a freshly-uploaded object: who owns it (the
 * caller) and whether it is publicly readable. Required because
 * /storage/objects/* deny-lists any object that has no policy attached
 * — we deliberately do NOT want presigned-URL uploads to be implicitly
 * world-readable.
 *
 * Re-finalizing an object only works for the original owner; that
 * prevents one user from claiming another user's upload and flipping
 * its visibility.
 */
router.post(
  "/storage/uploads/finalize",
  requireAuth,
  async (req: Request, res: Response) => {
    const auth = getAuthedUser(req);
    if (!auth) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    const parsed = FinalizeUploadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required fields" });
      return;
    }
    const { objectPath, visibility } = parsed.data;

    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        objectPath,
      );

      const existingPolicy = await getObjectAclPolicy(objectFile);
      if (existingPolicy && existingPolicy.owner !== auth.id) {
        // Use 404 — admitting "wrong owner" leaks the existence of an
        // object the caller has no business knowing about.
        res.status(404).json({ error: "Object not found" });
        return;
      }

      const normalizedPath =
        await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: auth.id,
          visibility,
        });

      res.json(
        FinalizeUploadResponse.parse({
          objectPath: normalizedPath,
          visibility,
        }),
      );
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
      req.log.error({ err: error }, "Error finalizing upload");
      res.status(500).json({ error: "Failed to finalize upload" });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve unconditionally-public assets out of PUBLIC_OBJECT_SEARCH_PATHS.
 * These are app-owned files (Object Storage tool pane uploads), not
 * user uploads — they are intentionally world-readable.
 */
router.get(
  "/storage/public-objects/*filePath",
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve user-uploaded objects out of PRIVATE_OBJECT_DIR. Access is
 * gated by the ACL policy on each object: public objects are readable
 * by anyone, private objects only by their owner. Objects with no
 * policy (uploaded but never finalized) return 404 — the URLs are
 * unguessable but we still don't want them to be implicitly public.
 *
 * `tryAuth` runs globally before this handler, so `getAuthedUser` is
 * populated when a session is present without forcing every request
 * here to be authenticated.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(
      objectPath,
    );

    const auth = getAuthedUser(req);
    const canAccess = await objectStorageService.canAccessObjectEntity({
      userId: auth?.id,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      // 404 instead of 403 keeps unguessable URLs unguessable.
      res.status(404).json({ error: "Object not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;

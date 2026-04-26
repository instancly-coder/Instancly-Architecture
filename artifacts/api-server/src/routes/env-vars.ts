import { Router, type IRouter, type Request, type Response } from "express";
import { db, projectsTable, usersTable, projectEnvVarsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, getAuthedUser } from "../middlewares/auth";
import { encryptSecret, decryptSecret } from "../lib/secret-cipher";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Keys we manage automatically as part of other features (publish flow,
// database tab, etc.). Allowing the user to set these from the env-vars
// UI would silently fight whatever is computing them server-side, so we
// reject those writes outright. The list intentionally errs on the side
// of small — only keys we DO populate ourselves go here.
const RESERVED_KEYS = new Set<string>([
  "DATABASE_URL", // injected from projects.databaseUrl on every publish
]);

// Conventional Linux/Vercel env var key shape: uppercase letters, digits,
// underscores; cannot start with a digit. We're a touch stricter than the
// spec to keep the UI predictable.
const KEY_RE = /^[A-Z][A-Z0-9_]{0,127}$/;

// Vercel docs cap individual env values at 5 KB. Reject anything wildly
// over that early so we don't fail the publish later.
const MAX_VALUE_BYTES = 5 * 1024;

type Owned = { project: typeof projectsTable.$inferSelect };

async function loadOwned(req: Request, res: Response): Promise<Owned | null> {
  const auth = getAuthedUser(req);
  if (!auth) {
    res.status(401).json({ status: "error", message: "Unauthenticated" });
    return null;
  }
  const username = String(req.params.username);
  const slug = String(req.params.slug);
  const [row] = await db
    .select({ project: projectsTable, user: usersTable })
    .from(projectsTable)
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
    .limit(1);
  if (!row) {
    res.status(404).json({ status: "error", message: "Project not found" });
    return null;
  }
  if (row.user.id !== auth.id) {
    // Don't disclose existence to non-owners.
    res.status(404).json({ status: "error", message: "Project not found" });
    return null;
  }
  return { project: row.project };
}

function validateKey(key: string): string | null {
  if (!KEY_RE.test(key)) {
    return "Key must be UPPER_SNAKE_CASE (letters, digits, underscores; starts with a letter; max 128 chars)";
  }
  if (RESERVED_KEYS.has(key)) {
    return `'${key}' is managed automatically — set it from the relevant tab instead.`;
  }
  return null;
}

// Listing always masks secret values. The masked form is short enough to
// hint at "yes something is set here" without leaking length information
// that could narrow down a brute-force guess. Non-secret values come
// through verbatim so the user can see flag names like "true"/"false".
function maskSecretValue(): string {
  return "••••••••";
}

router.get(
  "/projects/:username/:slug/env-vars",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwned(req, res);
    if (!owned) return;
    const rows = await db
      .select()
      .from(projectEnvVarsTable)
      .where(eq(projectEnvVarsTable.projectId, owned.project.id))
      .orderBy(projectEnvVarsTable.key);
    res.json(
      rows.map((r) => {
        let display: string;
        if (r.isSecret) {
          display = maskSecretValue();
        } else {
          try {
            display = decryptSecret(r.valueEncrypted);
          } catch {
            // Corrupt blob (key rotated etc.) — surface that to the
            // user without bringing the whole listing down.
            display = "(stored value cannot be read — please re-enter)";
          }
        }
        return {
          id: r.id,
          key: r.key,
          value: display,
          isSecret: r.isSecret,
          description: r.description,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
    );
  },
);

// Single-shot reveal of a specific secret variable's plaintext value.
// Owner-only. Used by a "Show" button in the UI when the user needs to
// copy a secret out (and can't fetch it via the masked listing).
router.post(
  "/projects/:username/:slug/env-vars/:key/reveal",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwned(req, res);
    if (!owned) return;
    const key = String(req.params.key);
    const [row] = await db
      .select()
      .from(projectEnvVarsTable)
      .where(
        and(
          eq(projectEnvVarsTable.projectId, owned.project.id),
          eq(projectEnvVarsTable.key, key),
        ),
      )
      .limit(1);
    if (!row) {
      res.status(404).json({ status: "error", message: "Variable not found" });
      return;
    }
    try {
      const value = decryptSecret(row.valueEncrypted);
      res.json({ key: row.key, value });
    } catch (err) {
      logger.warn(
        { err, projectId: owned.project.id, key },
        "Env var value cannot be decrypted",
      );
      res.status(409).json({
        status: "error",
        message: "Stored value is corrupt — please re-enter it.",
      });
    }
  },
);

router.put(
  "/projects/:username/:slug/env-vars/:key",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwned(req, res);
    if (!owned) return;
    const key = String(req.params.key);
    const reason = validateKey(key);
    if (reason) {
      res.status(400).json({ status: "error", message: reason });
      return;
    }
    const body = req.body as {
      value?: unknown;
      isSecret?: unknown;
      description?: unknown;
    };
    if (typeof body.value !== "string" || body.value.length === 0) {
      res
        .status(400)
        .json({ status: "error", message: "Value must be a non-empty string" });
      return;
    }
    if (Buffer.byteLength(body.value, "utf8") > MAX_VALUE_BYTES) {
      res.status(413).json({
        status: "error",
        message: `Value exceeds ${MAX_VALUE_BYTES} byte limit`,
      });
      return;
    }
    const isSecret = body.isSecret === false ? false : true;
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.slice(0, 280)
        : null;

    const valueEncrypted = encryptSecret(body.value);
    const now = new Date();
    const [upserted] = await db
      .insert(projectEnvVarsTable)
      .values({
        projectId: owned.project.id,
        key,
        valueEncrypted,
        isSecret,
        description,
      })
      .onConflictDoUpdate({
        target: [projectEnvVarsTable.projectId, projectEnvVarsTable.key],
        set: {
          valueEncrypted,
          isSecret,
          // Only overwrite description when caller actually supplied one;
          // a re-upsert from the AI for an existing key shouldn't wipe
          // a manual description the user added later.
          ...(description !== null ? { description } : {}),
          updatedAt: now,
        },
      })
      .returning();
    res.json({
      id: upserted.id,
      key: upserted.key,
      isSecret: upserted.isSecret,
      description: upserted.description,
      updatedAt: upserted.updatedAt,
    });
  },
);

router.delete(
  "/projects/:username/:slug/env-vars/:key",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const owned = await loadOwned(req, res);
    if (!owned) return;
    const key = String(req.params.key);
    await db
      .delete(projectEnvVarsTable)
      .where(
        and(
          eq(projectEnvVarsTable.projectId, owned.project.id),
          eq(projectEnvVarsTable.key, key),
        ),
      );
    res.status(204).end();
  },
);

export default router;

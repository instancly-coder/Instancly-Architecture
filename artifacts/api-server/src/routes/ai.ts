import { Router, type IRouter, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import {
  db,
  projectsTable,
  usersTable,
  buildsTable,
  projectFilesTable,
} from "@workspace/db";
import { and, asc, desc, eq, max, sql } from "drizzle-orm";
import {
  buildFilesContext,
  buildSystemPrompt,
} from "../lib/components-catalog";
import { parseFileBlocks, stripFileBlocks } from "../lib/file-blocks";

const router: IRouter = Router();

const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const aiConfigured = Boolean(baseURL && apiKey);

const anthropic = aiConfigured
  ? new Anthropic({ baseURL, apiKey })
  : null;

const MODEL = "claude-sonnet-4-6";
const MODEL_DISPLAY = "Claude Sonnet 4.5";

router.post(
  "/ai/build/:username/:slug",
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const prompt = String(req.body?.prompt ?? "").trim();

    // Track client disconnects from the very top of the handler so we don't
    // miss a "close" event during the project lookup or stream initialisation.
    let clientGone = false;
    req.on("close", () => {
      clientGone = true;
    });

    if (!prompt) {
      res.status(400).json({ status: "error", message: "prompt required" });
      return;
    }

    const rows = await db
      .select({ project: projectsTable })
      .from(projectsTable)
      .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
      .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
      .limit(1);

    const project = rows[0]?.project;
    if (!project) {
      if (!clientGone) {
        res.status(404).json({ status: "error", message: "Project not found" });
      }
      return;
    }
    if (clientGone) {
      // Client disconnected before we even started the AI stream — nothing to bill or persist.
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (!anthropic) {
      send("error", {
        message:
          "AI is not configured. AI_INTEGRATIONS_ANTHROPIC_* env vars are missing on the server.",
      });
      send("done", { ok: false });
      res.end();
      return;
    }

    const startedAt = Date.now();
    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let aborted = clientGone;
    let stream: ReturnType<typeof anthropic.messages.stream> | null = null;

    // Pull existing project files so the model can reason about prior code.
    const existingFiles = await db
      .select({
        path: projectFilesTable.path,
        content: projectFilesTable.content,
      })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id))
      .orderBy(asc(projectFilesTable.path));

    // Now that the stream variable exists, upgrade the "close" handler to also
    // abort the upstream Claude request so we stop billing immediately.
    req.on("close", () => {
      if (!res.writableEnded) {
        aborted = true;
        try {
          stream?.controller.abort();
        } catch {
          /* noop */
        }
      }
    });

    // Parse out any complete file blocks from the streamed text and write
    // them to the database. All writes for a single build are wrapped in
    // a transaction so partial failures don't leave the project half-updated.
    const persistFiles = async (): Promise<string[]> => {
      const parsed = parseFileBlocks(fullText);
      if (parsed.length === 0) return [];
      await db.transaction(async (tx) => {
        for (const f of parsed) {
          await tx
            .insert(projectFilesTable)
            .values({
              projectId: project.id,
              path: f.path,
              content: f.content,
              size: f.content.length,
            })
            .onConflictDoUpdate({
              target: [projectFilesTable.projectId, projectFilesTable.path],
              set: {
                content: f.content,
                size: f.content.length,
                updatedAt: sql`now()`,
              },
            });
        }
      });
      return parsed.map((f) => f.path);
    };

    // Persist a build row for any terminal outcome so history/audit is complete.
    const persistBuild = async (
      status: "success" | "failed" | "aborted",
      filesChanged: number,
      errorMessage?: string,
    ) => {
      const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      // Sonnet pricing: $3 in / $15 out per 1M tokens; ~£0.78 / £3.94 per 1M GBP.
      // Store full precision (4dp) — only round for display.
      const costNum =
        (inputTokens / 1_000_000) * 0.78 + (outputTokens / 1_000_000) * 3.94;
      const cost = Math.max(0, costNum).toFixed(4);

      const [{ maxNumber }] = await db
        .select({ maxNumber: max(buildsTable.number) })
        .from(buildsTable)
        .where(eq(buildsTable.projectId, project.id));
      const nextNumber = (maxNumber ?? 0) + 1;

      // Store the human-readable transcript with file payloads stripped so
      // the build history stays compact and readable.
      const visible = stripFileBlocks(fullText);
      const aiMessage = errorMessage
        ? `${visible}\n\n[${status}] ${errorMessage}`.slice(0, 4000)
        : visible.slice(0, 4000);

      const [created] = await db
        .insert(buildsTable)
        .values({
          projectId: project.id,
          number: nextNumber,
          prompt,
          aiMessage,
          durationSec,
          cost,
          filesChanged,
          tokensIn: inputTokens,
          tokensOut: outputTokens,
          model: MODEL_DISPLAY,
          status,
        })
        .returning();

      if (status === "success") {
        await db
          .update(projectsTable)
          .set({ lastBuiltAt: new Date() })
          .where(eq(projectsTable.id, project.id));
      }
      return created;
    };

    try {
      const filesContext = buildFilesContext(existingFiles);
      stream = anthropic.messages.stream({
        model: MODEL,
        max_tokens: 16_384,
        system: buildSystemPrompt(project.name, project.framework),
        messages: [
          {
            role: "user",
            content: `${filesContext}\n\n---\n\nUser request:\n${prompt}`,
          },
        ],
      });

      send("start", { model: MODEL_DISPLAY });

      for await (const event of stream) {
        if (aborted) break;
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          fullText += event.delta.text;
          send("delta", { text: event.delta.text });
        } else if (event.type === "message_delta" && event.usage) {
          outputTokens = event.usage.output_tokens ?? outputTokens;
        } else if (event.type === "message_start" && event.message?.usage) {
          inputTokens = event.message.usage.input_tokens ?? 0;
        }
      }

      if (aborted) {
        // Even an aborted stream may have produced complete file blocks worth
        // saving — persist whatever parsed cleanly.
        const written = await persistFiles().catch(() => [] as string[]);
        await persistBuild(
          "aborted",
          written.length,
          "Client disconnected before completion",
        );
        return;
      }

      const written = await persistFiles();
      const created = await persistBuild("success", written.length);
      send("done", {
        ok: true,
        build: {
          id: created.id,
          number: created.number,
          cost: Number(created.cost),
          durationSec: created.durationSec,
          tokensIn: created.tokensIn,
          tokensOut: created.tokensOut,
          filesChanged: written.length,
          files: written,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI request failed";
      try {
        const written = await persistFiles().catch(() => [] as string[]);
        await persistBuild(
          aborted ? "aborted" : "failed",
          written.length,
          message,
        );
      } catch {
        /* swallow secondary error so we still close the response */
      }
      if (!res.writableEnded) {
        send("error", { message });
        send("done", { ok: false });
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  },
);

router.get("/ai/last-builds/:username/:slug", async (req: Request, res: Response): Promise<void> => {
  const username = String(req.params.username);
  const slug = String(req.params.slug);
  const rows = await db
    .select({ build: buildsTable })
    .from(buildsTable)
    .innerJoin(projectsTable, eq(projectsTable.id, buildsTable.projectId))
    .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
    .orderBy(desc(buildsTable.createdAt))
    .limit(20);
  res.json(rows.map((r) => r.build));
});

export default router;

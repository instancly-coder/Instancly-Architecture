import { Router, type IRouter, type Request, type Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  db,
  projectsTable,
  usersTable,
  buildsTable,
  projectFilesTable,
  transactionsTable,
} from "@workspace/db";
import { and, asc, desc, eq, max, sql } from "drizzle-orm";
import {
  buildFilesContext,
  buildSystemPrompt,
} from "../lib/components-catalog";
import { parseFileBlocks, stripFileBlocks } from "../lib/file-blocks";
import { requireAuth, getAuthedUser } from "../middlewares/auth";

const router: IRouter = Router();

// Direct Anthropic external API. We hit api.anthropic.com using the
// customer's own ANTHROPIC_API_KEY rather than going through the Replit
// AI integrations proxy.
const apiKey = process.env.ANTHROPIC_API_KEY;
const aiConfigured = Boolean(apiKey);

const anthropic = aiConfigured ? new Anthropic({ apiKey }) : null;

// Per-million-token pricing in USD. These are the marked-up rates the user
// pays — model cost + platform margin baked in. Update one place to reprice.
type ModelKey = "haiku" | "sonnet" | "opus";
const MODELS: Record<
  ModelKey,
  { id: string; display: string; rates: { input: number; output: number } }
> = {
  haiku:  { id: "claude-haiku-4-5",  display: "Claude Haiku 4.5",  rates: { input: 5,  output: 25 } },
  sonnet: { id: "claude-sonnet-4-6", display: "Claude Sonnet 4.5", rates: { input: 12, output: 60 } },
  opus:   { id: "claude-opus-4-5",   display: "Claude Opus",       rates: { input: 20, output: 100 } },
};
const DEFAULT_MODEL: ModelKey = "sonnet";

// Free plan is locked to Haiku regardless of what the client requests.
function pickModel(requested: unknown, plan: string | null | undefined): ModelKey {
  const k =
    typeof requested === "string" && requested in MODELS
      ? (requested as ModelKey)
      : DEFAULT_MODEL;
  if ((plan ?? "Free").toLowerCase() === "free") return "haiku";
  return k;
}

// ---------- SSRF-safe URL fetching ----------
// Used for the "redesign this URL" feature. Does DNS lookup + IP CIDR
// validation, manual redirect following with re-validation per hop, and a
// strict timeout/size cap so a malicious URL can't pivot into the server's
// internal network or stall/exhaust resources.

// True if the literal IP (already validated as an IP) belongs to a range
// that an attacker should never be able to reach via our fetch helper:
// loopback, private, link-local, multicast, broadcast, ULA, unique-local,
// IPv4-mapped IPv6 of those, etc.
function isPrivateOrReservedIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map((n) => Number(n));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 10) return true;                     // 10.0.0.0/8
    if (a === 127) return true;                    // loopback
    if (a === 0) return true;                      // 0.0.0.0/8
    if (a === 169 && b === 254) return true;       // 169.254.0.0/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;       // 192.168.0.0/16
    if (a === 192 && b === 0) return true;         // 192.0.0.0/24 IETF
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true;                     // multicast + reserved
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;       // unspecified, loopback
    if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;        // ULA fc00::/7
    if (lower.startsWith("ff")) return true;                  // multicast
    // IPv4-mapped (::ffff:1.2.3.4) — extract embedded v4 and recheck.
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    // IPv4-compatible (deprecated but still resolvable via ::a.b.c.d)
    const compat = lower.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
    if (compat) return isPrivateOrReservedIp(compat[1]);
    return false;
  }
  // Not a valid IP literal — fail closed.
  return true;
}

// Resolve hostname → IP and reject if any resolved IP is internal. Also
// rejects names that obviously target internal services (cloud metadata
// hostnames, *.local mDNS, etc) before doing the lookup.
async function validateUrlForFetch(url: URL): Promise<{ ok: true } | { ok: false; error: string }> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http(s) URLs allowed" };
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "metadata"
  ) {
    return { ok: false, error: "Host not allowed" };
  }
  // Strip IPv6 brackets that URL keeps in `hostname`, then strip any
  // IPv6 zone ID (`%eth0`, `%25eth0`) since those mark link-local scopes
  // and could otherwise sneak past the `fe80:` prefix check.
  let bare = host.startsWith("[") && host.endsWith("]")
    ? host.slice(1, -1)
    : host;
  const pct = bare.indexOf("%");
  if (pct >= 0) {
    // A zone ID on a non-link-local address is almost always an attack
    // vector or malformed input — fail closed regardless of what's left.
    return { ok: false, error: "Zone-scoped IPs not allowed" };
  }
  // URL credentials are allowed by spec but we never want them on a
  // server-side fetch for an untrusted URL — strip them off.
  if (url.username || url.password) {
    url.username = "";
    url.password = "";
  }
  // If the hostname is already an IP literal, validate directly.
  if (isIP(bare)) {
    if (isPrivateOrReservedIp(bare)) return { ok: false, error: "Internal IP not allowed" };
    return { ok: true };
  }
  // Otherwise resolve all addresses and reject if any one is internal —
  // this prevents both naïve "myhost → 10.0.0.1" attacks and partial
  // resolution where one record is public and another is internal.
  try {
    const addrs = await dnsLookup(bare, { all: true });
    if (addrs.length === 0) return { ok: false, error: "DNS returned no addresses" };
    for (const a of addrs) {
      if (isPrivateOrReservedIp(a.address)) {
        return { ok: false, error: "Resolves to an internal IP" };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "DNS lookup failed" };
  }
}

async function fetchUrlForRedesign(rawUrl: string): Promise<{
  url: string;
  ok: boolean;
  title?: string;
  text?: string;
  error?: string;
}> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    return { url: rawUrl, ok: false, error: "Invalid URL" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    // Manual redirect handling so each hop is re-validated against the SSRF
    // rules. Without this, a public URL could 302 to an internal address.
    // Note: `Response` is imported from express at the top of the file, so we
    // use the globalThis fetch Response type here to avoid the name clash.
    let resp: globalThis.Response | null = null;
    const MAX_HOPS = 5;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const v = await validateUrlForFetch(current);
      if (!v.ok) return { url: rawUrl, ok: false, error: v.error };

      resp = await fetch(current.toString(), {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; DeployBroBot/1.0; +https://deploybro.com)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get("location");
        if (!loc) break;
        try {
          current = new URL(loc, current);
        } catch {
          return { url: rawUrl, ok: false, error: "Invalid redirect target" };
        }
        // Drain and continue to next hop.
        try { await resp.body?.cancel(); } catch { /* noop */ }
        continue;
      }
      break;
    }
    if (!resp) return { url: rawUrl, ok: false, error: "No response" };
    if (!resp.ok) {
      return { url: rawUrl, ok: false, error: `HTTP ${resp.status}` };
    }
    const ctype = resp.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/.test(ctype)) {
      return { url: rawUrl, ok: false, error: "Not an HTML page" };
    }
    // Hard-cap the response body to ~500KB while streaming so a giant page
    // can't exhaust memory. Buffer.concat is the cheap path here.
    const reader = resp.body?.getReader();
    if (!reader) return { url: rawUrl, ok: false, error: "Empty body" };
    const chunks: Buffer[] = [];
    let total = 0;
    const MAX = 500 * 1024;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX) {
          try { await reader.cancel(); } catch { /* noop */ }
          break;
        }
        chunks.push(Buffer.from(value));
      }
    }
    const html = Buffer.concat(chunks).toString("utf8");
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim().slice(0, 200);
    // Strip script/style noise, then collapse tags into spaces. The AI
    // doesn't need pixel-perfect markup — it needs the visible content,
    // headings, and link/anchor text to reason about a redesign.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12_000);
    return { url: rawUrl, ok: true, title, text };
  } catch (e) {
    return {
      url: rawUrl,
      ok: false,
      error: e instanceof Error ? e.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

router.post(
  "/ai/build/:username/:slug",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const prompt = String(req.body?.prompt ?? "").trim();
    const planMode = Boolean(req.body?.planMode);
    const urls: string[] = Array.isArray(req.body?.urls)
      ? (req.body.urls as unknown[])
          .filter((u): u is string => typeof u === "string" && u.trim() !== "")
          .slice(0, 5)
      : [];
    // Images arrive as { name, mediaType, base64 } where base64 is raw
    // base64 (no data: prefix). Cap at 5 images, ~5MB each, only standard
    // web image MIME types to keep request size and cost in check.
    type IncomingImage = { name?: string; mediaType: string; base64: string };
    const ALLOWED_IMAGE_TYPES = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ]);
    const images: IncomingImage[] = Array.isArray(req.body?.images)
      ? (req.body.images as unknown[])
          .filter((it): it is IncomingImage => {
            if (!it || typeof it !== "object") return false;
            const o = it as Record<string, unknown>;
            return (
              typeof o.mediaType === "string" &&
              typeof o.base64 === "string" &&
              ALLOWED_IMAGE_TYPES.has(o.mediaType) &&
              // base64 length ~= bytes * 4/3; cap raw bytes at 5MB.
              o.base64.length < 5 * 1024 * 1024 * 1.4
            );
          })
          .slice(0, 5)
      : [];

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
      .select({
        project: projectsTable,
        ownerId: usersTable.id,
        ownerPlan: usersTable.plan,
      })
      .from(projectsTable)
      .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
      .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
      .limit(1);

    const project = rows[0]?.project;
    const ownerId = rows[0]?.ownerId;
    const ownerPlan = rows[0]?.ownerPlan;
    if (!project) {
      if (!clientGone) {
        res.status(404).json({ status: "error", message: "Project not found" });
      }
      return;
    }

    // Only the project owner can run a build against their project — without
    // this check, anyone who knows /:username/:slug could drain another
    // user's balance via the cost-deduction logic below.
    const authedUser = getAuthedUser(req);
    if (!authedUser || authedUser.id !== ownerId) {
      if (!clientGone) {
        res.status(403).json({ status: "error", message: "Forbidden" });
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
          "AI is not configured. ANTHROPIC_API_KEY is missing on the server.",
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

    // Resolve which Claude model to run. Free plan is forced to Haiku; paid
    // tiers honour the client's choice. The chosen model also determines the
    // per-token rates used to bill the user's balance after the build.
    const modelKey = pickModel(req.body?.model, ownerPlan);
    const modelInfo = MODELS[modelKey];

    // Pull existing project files so the model can reason about prior code.
    const existingFiles = await db
      .select({
        path: projectFilesTable.path,
        content: projectFilesTable.content,
        // buildFilesContext substitutes a metadata stub for binary
        // assets — sending megabytes of base64 to Claude wastes
        // tokens and confuses the model. The path still goes into
        // the prompt so generated HTML can `src="logo.png"`.
        encoding: projectFilesTable.encoding,
        contentType: projectFilesTable.contentType,
        size: projectFilesTable.size,
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
          // UTF-8 byte length, not JS string char count — multibyte
          // characters (emoji, non-ASCII) otherwise under-report
          // size and would drift from how the publish-payload size
          // budget actually counts the file on the wire.
          const byteSize = Buffer.byteLength(f.content, "utf8");
          await tx
            .insert(projectFilesTable)
            .values({
              projectId: project.id,
              path: f.path,
              content: f.content,
              // Source code from the AI is always UTF-8 text. Stated
              // explicitly so an upload that previously stored this
              // path as base64 (e.g. user dropped logo.png, then asked
              // the AI to "regenerate logo.png") gets cleanly
              // overwritten back to text.
              encoding: "utf8",
              contentType: null,
              size: byteSize,
            })
            .onConflictDoUpdate({
              target: [projectFilesTable.projectId, projectFilesTable.path],
              set: {
                content: f.content,
                encoding: "utf8",
                contentType: null,
                size: byteSize,
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
      // Bill at the chosen model's marked-up rates (USD per 1M tokens).
      // Round to whole cents so the build row, the transaction ledger, and
      // the deduction from the user's balance all show the same number —
      // otherwise builds.cost (4dp) and balance/transactions (2dp) drift.
      const rawCost = Math.max(
        0,
        (inputTokens / 1_000_000) * modelInfo.rates.input +
          (outputTokens / 1_000_000) * modelInfo.rates.output,
      );
      const cost = (Math.round(rawCost * 100) / 100).toFixed(2);

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
          model: modelInfo.display,
          status,
        })
        .returning();

      if (status === "success") {
        await db
          .update(projectsTable)
          .set({ lastBuiltAt: new Date() })
          .where(eq(projectsTable.id, project.id));
      }

      // Deduct from the project owner's balance for any tokens consumed —
      // even on aborted/failed builds, the upstream API still charged us.
      // Skipped when there's no owner row or no measurable cost.
      // Wrapped in a DB transaction so balance and ledger never diverge.
      let postBalance: number | null = null;
      if (ownerId && Number(cost) > 0) {
        postBalance = await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(usersTable)
            .set({ balance: sql`${usersTable.balance} - ${cost}` })
            .where(eq(usersTable.id, ownerId))
            .returning({ balance: usersTable.balance });

          await tx.insert(transactionsTable).values({
            userId: ownerId,
            amount: `-${cost}`,
            method: `${modelInfo.display} generation`,
            status: "Success",
          });

          return updated ? Number(updated.balance) : null;
        });
      }

      return { build: created, postBalance };
    };

    try {
      const filesContext = buildFilesContext(existingFiles);

      // Resolve any user-supplied "redesign this" URLs in parallel before
      // streaming. We tell the client we're fetching so the UI can show a
      // status hint instead of an apparent stall.
      let urlContext = "";
      if (urls.length > 0) {
        send("status", {
          message: `Fetching ${urls.length} reference URL${urls.length === 1 ? "" : "s"}…`,
        });
        const fetched = await Promise.all(urls.map(fetchUrlForRedesign));
        urlContext = fetched
          .map((r) => {
            if (!r.ok) return `\n[Reference URL: ${r.url}]\n(could not fetch — ${r.error})`;
            return `\n[Reference URL: ${r.url}]${r.title ? `\nTitle: ${r.title}` : ""}\nContent (cleaned, truncated):\n${r.text ?? ""}`;
          })
          .join("\n\n");
        urlContext = `\n\n---\n\nReference website(s) the user wants to redesign or draw inspiration from. Use these as the visual/structural starting point — copy the information architecture and content where helpful, but apply your own modern design judgement:\n${urlContext}`;
      }

      // PLAN MODE: AI plans first, then implements in the same response. The
      // user sees a clear plan before code blocks scroll past — useful for
      // bigger changes where you want to know what's about to happen.
      const systemPrompt =
        buildSystemPrompt(project.name, project.framework) +
        (planMode
          ? "\n\nPLAN MODE IS ON: Begin your response with a numbered plan (3 to 7 short bullet points) describing exactly which files you will create or change and why. After the plan, write a line containing only '---' and then proceed with the implementation as normal."
          : "");

      // Compose the user message. If images were attached we send a
      // multi-part content array (text + image blocks) which Claude's
      // vision models accept natively. Otherwise we keep it as a string
      // for backward compatibility.
      const textPart = `${filesContext}${urlContext}\n\n---\n\nUser request:\n${prompt}`;
      const userContent =
        images.length > 0
          ? [
              { type: "text" as const, text: textPart },
              ...images.map((img) => ({
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: img.mediaType as
                    | "image/png"
                    | "image/jpeg"
                    | "image/webp"
                    | "image/gif",
                  data: img.base64,
                },
              })),
            ]
          : textPart;

      send("status", { message: "Connecting to Claude…" });
      stream = anthropic.messages.stream({
        model: modelInfo.id,
        max_tokens: 16_384,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      send("start", {
        model: modelInfo.display,
        planMode,
        attachments: { images: images.length, urls: urls.length },
      });

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

      send("status", { message: "Saving generated files…" });
      const written = await persistFiles();
      send("status", { message: "Recording build…" });
      const { build: created, postBalance } = await persistBuild(
        "success",
        written.length,
      );
      // Tell the client what this generation cost and what's left in the
      // balance so the chat can show "Used $X · Remaining: $Y" inline.
      send("usage", {
        cost: Number(created.cost),
        balance: postBalance,
        model: modelInfo.display,
      });
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
      // Detect upstream conditions that mean the AI provider is effectively
      // offline for everyone (operator's API credits exhausted, key revoked,
      // provider outage). We still log/persist the raw upstream message for
      // operator debugging, but the user-facing event gets a friendly
      // "server is offline" payload so they don't see scary billing text.
      const anyErr = err as { status?: number; error?: { error?: { type?: string; message?: string } } };
      const upstreamStatus = typeof anyErr?.status === "number" ? anyErr.status : 0;
      const upstreamErrType = anyErr?.error?.error?.type;
      const upstreamErrMessage = anyErr?.error?.error?.message ?? "";
      const looksLikeCreditError =
        /credit balance|insufficient[_ ]?(?:funds|quota|credits?)|billing/i.test(
          upstreamErrMessage || message,
        );
      const isUpstreamUnavailable =
        // Out-of-credits / billing on the operator's API key
        (upstreamStatus === 400 && looksLikeCreditError) ||
        upstreamStatus === 402 ||
        // Bad / revoked / unconfigured API key — also not user-fixable
        upstreamStatus === 401 ||
        upstreamErrType === "authentication_error" ||
        // Provider-side outages
        upstreamStatus === 502 ||
        upstreamStatus === 503 ||
        upstreamStatus === 529 ||
        upstreamErrType === "overloaded_error";

      let failedResult: Awaited<ReturnType<typeof persistBuild>> | null = null;
      try {
        const written = await persistFiles().catch(() => [] as string[]);
        failedResult = await persistBuild(
          aborted ? "aborted" : "failed",
          written.length,
          message,
        );
      } catch {
        /* swallow secondary error so we still close the response */
      }
      if (!res.writableEnded) {
        // Even on a failed build the user got billed for tokens already
        // consumed, so surface that to the chat the same way success does.
        if (failedResult && Number(failedResult.build.cost) > 0) {
          send("usage", {
            cost: Number(failedResult.build.cost),
            balance: failedResult.postBalance,
            model: modelInfo.display,
          });
        }
        if (isUpstreamUnavailable) {
          send("error", {
            message: "Server is currently offline, come back soon.",
            code: "upstream_unavailable",
          });
        } else {
          send("error", { message });
        }
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

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
import {
  parseFileBlocks,
  stripFileBlocks,
  parseSuggestions,
  stripSuggestionsBlock,
  hasProvisionDbDirective,
  stripProvisionDbDirective,
  parseOpenTabDirective,
  stripOpenTabDirective,
  parseRequestSecretDirectives,
  stripRequestSecretDirectives,
  auditMissingScriptTargets,
} from "../lib/file-blocks";
import {
  enhancePrompt,
  shouldExpandBrief,
  expandToBrief,
  buildBriefPrompt,
} from "../lib/prompt-enhancer";
import { requireAuth, getAuthedUser } from "../middlewares/auth";
import { aiLimiter } from "../middlewares/rate-limits";
import { provisionAppDatabase, parentProjectId } from "../lib/neon";
import { encryptSecret, decryptSecret } from "../lib/secret-cipher";
import { logger } from "../lib/logger";
import { getPrompt, renderPrompt } from "../lib/prompts";

const router: IRouter = Router();

// Direct Anthropic external API. We hit api.anthropic.com using the
// customer's own ANTHROPIC_API_KEY rather than going through the Replit
// AI integrations proxy.
const apiKey = process.env.ANTHROPIC_API_KEY;
const aiConfigured = Boolean(apiKey);

const anthropic = aiConfigured ? new Anthropic({ apiKey }) : null;

// Per-million-token pricing in USD. These are the marked-up rates the user
// pays — model cost + platform margin baked in. Update one place to reprice.
// We expose three tiers under DeployBro branding:
//   - Economy Bro → Claude Haiku 4.5 (cheap, fast, default)
//   - Smart Bro   → Claude Sonnet 4.5 (balanced middle tier)
//   - Power Bro   → Claude Opus       (expensive, most capable; auto-picked in plan mode)
type ModelKey = "haiku" | "sonnet" | "opus";
const MODELS: Record<
  ModelKey,
  { id: string; display: string; rates: { input: number; output: number } }
> = {
  haiku:  { id: "claude-haiku-4-5",  display: "Economy Bro", rates: { input: 5,  output: 25 } },
  sonnet: { id: "claude-sonnet-4-6", display: "Smart Bro",   rates: { input: 12, output: 60 } },
  opus:   { id: "claude-opus-4-5",   display: "Power Bro",   rates: { input: 20, output: 100 } },
};
const DEFAULT_MODEL: ModelKey = "haiku";

// Resolve which Claude model to run for a given request.
// Rules, in priority order:
//   1. Free plan is locked to Economy Bro (Haiku) regardless of any other input.
//   2. If the user already approved a structured plan (two-stage Plan Mode
//      pipeline), build with Smart Bro (Sonnet) — the heavy reasoning was
//      already done in the planning pass, so we don't need Opus prices.
//   3. Otherwise, legacy single-pass plan mode auto-upgrades paid users to
//      Power Bro (Opus). Kept as a fallback for any client that still sends
//      `planMode:true` without an `approvedPlan`.
//   4. Honour the client's requested key, falling back to the default.
function pickModel(
  requested: unknown,
  plan: string | null | undefined,
  planMode: boolean,
  hasApprovedPlan: boolean,
): ModelKey {
  // An approved plan trumps every other gate — if the user paid the
  // Haiku planning cost AND went through the review modal, the build
  // step must run on Sonnet locked to that plan, regardless of the
  // user's billing plan. (Plan Mode itself is the gate that controls
  // whether free users can reach this branch in the first place.)
  if (hasApprovedPlan) return "sonnet";
  if ((plan ?? "Free").toLowerCase() === "free") return "haiku";
  if (planMode) return "opus";
  return typeof requested === "string" && requested in MODELS
    ? (requested as ModelKey)
    : DEFAULT_MODEL;
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

// ───────────────────────── Plan Mode (two-stage) ─────────────────────────
// Stage 1: a cheap Haiku call that returns a structured JSON plan
// (sections, colors, fonts, pages, features). The user reviews/edits
// the plan in the UI, then submits to /ai/build with `approvedPlan`
// attached, which becomes the LOCKED SPEC for the Sonnet build.

type ApprovedPlan = {
  projectName: string;
  summary: string;
  pages: string[];
  sections: { name: string; description: string; enabled: boolean }[];
  colors: { name: string; hex: string }[];
  fonts: { heading: string; body: string };
  features: string[];
  copyTone: string;
};

// Best-effort parser for an `approvedPlan` body field. Tolerates missing
// optional fields by filling defaults so a slightly-stale client schema
// can't crash the build endpoint. Returns null only if the value isn't
// even shaped like an object — in which case the caller falls back to
// the legacy single-pass plan-mode behaviour.
function parseApprovedPlan(value: unknown): ApprovedPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : "");
  const arrStr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : [];
  const sections = Array.isArray(v.sections)
    ? (v.sections as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({
          name: str(s.name),
          description: str(s.description),
          // default to enabled when the field is missing — matches what
          // the planner emits and what the UI defaults look like.
          enabled: s.enabled !== false,
        }))
        .filter((s) => s.name.length > 0)
    : [];
  // Normalise to `#RRGGBB`. The `<input type="color">` control in the
  // review modal silently ignores anything that isn't 6-char hex (it
  // shows black instead), so expand 3-char shorthand and reject any
  // exotic format the planner might emit (`#RRGGBBAA`, `rgb(...)`, …).
  const normaliseHex = (raw: string): string => {
    const m3 = /^#([0-9a-fA-F]{3})$/.exec(raw);
    if (m3) {
      const [r, g, b] = m3[1];
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const m6 = /^#([0-9a-fA-F]{6})$/.exec(raw);
    return m6 ? `#${m6[1].toLowerCase()}` : "";
  };
  const colors = Array.isArray(v.colors)
    ? (v.colors as unknown[])
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({ name: str(c.name), hex: normaliseHex(str(c.hex)) }))
        .filter((c) => c.name.length > 0 && c.hex.length > 0)
    : [];
  const fontsRaw =
    v.fonts && typeof v.fonts === "object" && !Array.isArray(v.fonts)
      ? (v.fonts as Record<string, unknown>)
      : {};
  const fonts = {
    heading: str(fontsRaw.heading) || "Inter",
    body: str(fontsRaw.body) || "Inter",
  };
  return {
    projectName: str(v.projectName),
    summary: str(v.summary),
    pages: arrStr(v.pages),
    sections,
    colors,
    fonts,
    features: arrStr(v.features),
    copyTone: str(v.copyTone),
  };
}

// Render the approved plan into the system prompt as a locked spec the
// model must conform to. Disabled sections are explicitly listed under
// "DO NOT INCLUDE" so the model never silently re-adds them.
function buildApprovedPlanInstruction(plan: ApprovedPlan): string {
  const enabled = plan.sections.filter((s) => s.enabled);
  const disabled = plan.sections.filter((s) => !s.enabled);
  const colorLines = plan.colors
    .map((c) => `  - ${c.name}: ${c.hex}`)
    .join("\n");
  const sectionLines = enabled
    .map((s) => `  - ${s.name}: ${s.description}`)
    .join("\n");
  const disabledLine =
    disabled.length > 0
      ? `\nDO NOT INCLUDE these sections (the user explicitly turned them off): ${disabled
          .map((s) => s.name)
          .join(", ")}.`
      : "";
  const pagesLine =
    plan.pages.length > 0 ? `Pages: ${plan.pages.join(", ")}.\n` : "";
  const featuresLine =
    plan.features.length > 0
      ? `\nKey features to highlight:\n${plan.features.map((f) => `  - ${f}`).join("\n")}`
      : "";
  return `

PLAN MODE — APPROVED BUILD PLAN. The user reviewed and approved this exact plan in the UI. Build to it precisely. Do NOT add extra pages, sections, or features that aren't listed. Do NOT change the colour palette, fonts, or copy tone unless the user's prompt overrides them.

Project: ${plan.projectName || "Untitled"}
Summary: ${plan.summary}
${pagesLine}
Sections (in order, only the ones listed):
${sectionLines}${disabledLine}

Colour palette (use these exact hex values for the corresponding roles):
${colorLines}

Typography:
  - Heading: ${plan.fonts.heading}
  - Body: ${plan.fonts.body}
${featuresLine}

Copy tone: ${plan.copyTone}

Implement this plan as one cohesive build. Skip any free-form planning preamble — the plan above IS the plan.`;
}

// Render a parsed plan into a friendly, conversational markdown narration
// the client can stream into a chat bubble. Server-controlled formatting
// keeps the look consistent regardless of which model variant produced
// the underlying JSON.
function renderPlanMarkdown(plan: ApprovedPlan): string {
  const lines: string[] = [];
  lines.push(`## ${plan.projectName || "Your project"}`);
  lines.push("");
  if (plan.summary) {
    lines.push(plan.summary);
    lines.push("");
  }
  if (plan.pages.length > 0) {
    lines.push("**Pages**");
    for (const p of plan.pages) lines.push(`- ${p}`);
    lines.push("");
  }
  if (plan.sections.length > 0) {
    lines.push("**Sections**");
    for (const s of plan.sections) {
      lines.push(`- **${s.name}** — ${s.description || "(no description)"}`);
    }
    lines.push("");
  }
  if (plan.colors.length > 0) {
    lines.push("**Colors**");
    for (const c of plan.colors) lines.push(`- ${c.name}: \`${c.hex}\``);
    lines.push("");
  }
  if (plan.fonts.heading || plan.fonts.body) {
    lines.push("**Fonts**");
    lines.push(`- Heading: ${plan.fonts.heading}`);
    lines.push(`- Body: ${plan.fonts.body}`);
    lines.push("");
  }
  if (plan.features.length > 0) {
    lines.push("**Key features**");
    for (const f of plan.features) lines.push(`- ${f}`);
    lines.push("");
  }
  if (plan.copyTone) {
    lines.push("**Tone of voice**");
    lines.push(plan.copyTone);
    lines.push("");
  }
  return lines.join("\n").trim();
}

// Conversational interview endpoint. Replaces the old one-shot plan
// generation with a multi-turn back-and-forth: the AI asks ONE short
// question per turn (with quick-pick chip suggestions) and only
// outputs the final structured plan once it has enough info.
//
// Each call is a single turn:
//   request:  { messages: [{role, content}], originalPrompt, urls? }
//   response: SSE stream emitting `start`, then `delta` events for the
//             question text, then a final `turn` event carrying either
//             { kind: "question", suggestions } or { kind: "plan", plan },
//             then `done`.
//
// The client stitches the turns together into the plan conversation
// shown inline in the chat. Model is Haiku — each turn is cheap.
router.post(
  "/ai/plan/:username/:slug",
  aiLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    // Accept legacy `prompt` as a fallback for `originalPrompt`. Older
    // cached client bundles (pre-conversational refactor) sent the
    // one-shot shape `{ prompt, urls? }`; without this fallback those
    // clients hard-fail with a 400 the moment they hit the new
    // endpoint, even though the server can otherwise handle the turn.
    const originalPrompt = String(
      req.body?.originalPrompt ?? req.body?.prompt ?? "",
    ).trim();
    const urls: string[] = Array.isArray(req.body?.urls)
      ? (req.body.urls as unknown[])
          .filter((u): u is string => typeof u === "string" && u.trim() !== "")
          .slice(0, 5)
      : [];
    // Conversation history so far. Each entry is one chat turn the user
    // already saw on screen. We cap at 24 entries (~12 round-trips) as
    // a hard runaway guard — the system prompt instructs the model to
    // wrap up after 5 questions, so this only triggers on misuse.
    const rawMessages: unknown = req.body?.messages;
    const messages: { role: "user" | "assistant"; content: string }[] =
      Array.isArray(rawMessages)
        ? (rawMessages as unknown[])
            .filter((m): m is { role: unknown; content: unknown } => {
              if (!m || typeof m !== "object") return false;
              const role = (m as { role?: unknown }).role;
              return role === "user" || role === "assistant";
            })
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: String(m.content ?? ""),
            }))
            .filter((m) => m.content.trim() !== "")
            .slice(-24)
        : [];

    let clientGone = false;
    req.on("close", () => {
      clientGone = true;
    });

    if (!originalPrompt) {
      res.status(400).json({
        status: "error",
        message:
          "Couldn't read your prompt — please refresh the page and try again.",
      });
      return;
    }

    const rows = await db
      .select({ project: projectsTable, ownerId: usersTable.id })
      .from(projectsTable)
      .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
      .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
      .limit(1);

    const project = rows[0]?.project;
    const ownerId = rows[0]?.ownerId;
    if (!project) {
      if (!clientGone) {
        res.status(404).json({ status: "error", message: "Project not found" });
      }
      return;
    }
    const authedUser = getAuthedUser(req);
    if (!authedUser || authedUser.id !== ownerId) {
      if (!clientGone) {
        res.status(403).json({ status: "error", message: "Forbidden" });
      }
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      if (clientGone || res.writableEnded) return;
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

    send("start", { phase: "planning", turnIndex: messages.length });

    // Project context — same lightweight signal as before. Tells the
    // model whether this is a first build or an iteration so the
    // questions / final plan stay scoped accordingly.
    const existingPaths = await db
      .select({ path: projectFilesTable.path })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id))
      .orderBy(asc(projectFilesTable.path));
    const isFirstBuild = existingPaths.length === 0;
    const refsLine =
      urls.length > 0
        ? `\nReference URLs the user wants to draw inspiration from: ${urls.join(", ")}`
        : "";

    // Count how many questions the model has already asked. Used in the
    // system prompt to nudge it toward wrapping up — without this it
    // tends to keep asking forever.
    const questionsAsked = messages.filter((m) => m.role === "assistant").length;

    // Plan-stage prompt is sourced from prompts/plan.md (see lib/prompts.ts).
    // Keeping it in markdown lets product/design tweak the interview flow
    // without redeploying compiled TS, and gives the rest of the pipeline
    // (clarify.md, build.md, verification.md) a uniform place to live.
    const questionsLeft = Math.max(0, 4 - questionsAsked);
    const planSystemPrompt = renderPrompt("plan", {
      originalPrompt,
      refsLine,
      contextLine: isFirstBuild
        ? "This is a FIRST build — you'll be planning the whole site."
        : `This is an ITERATION on an existing project (${existingPaths.length} files). Plan only what the user is asking to add or change. Existing paths: ${existingPaths.slice(0, 20).map((f) => f.path).join(", ")}.`,
      questionsAsked,
      questionsLeft,
      questionsLeftPlural: questionsLeft === 1 ? "" : "s",
    });

    // Convert the turn history to Anthropic message format. We don't
    // include the suggestions in the assistant content — only the
    // human-readable question text, since that's what the model sees
    // in the rendered chat.
    const apiMessages: { role: "user" | "assistant"; content: string }[] =
      messages.length > 0
        ? messages
        : // First turn — seed with the original brief as the first user
          // message so the model has something to react to.
          [{ role: "user", content: originalPrompt }];

    const startedAt = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let raw = "";

    try {
      const result = await anthropic.messages.create({
        model: MODELS.haiku.id,
        max_tokens: 2_500,
        system: planSystemPrompt,
        messages: apiMessages,
      });
      inputTokens = result.usage?.input_tokens ?? 0;
      outputTokens = result.usage?.output_tokens ?? 0;
      raw = result.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Plan request failed";
      req.log.error({ err }, "Plan turn failed");
      send("error", { message });
      send("done", { ok: false });
      res.end();
      return;
    }

    // Strip accidental fences and locate the JSON envelope.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    let parsed: Record<string, unknown> | null = null;
    if (startIdx >= 0 && endIdx > startIdx) {
      try {
        const obj = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
        if (obj && typeof obj === "object")
          parsed = obj as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      req.log.warn(
        { raw: cleaned.slice(0, 500) },
        "Plan turn response was not valid JSON",
      );
      send("error", {
        message:
          "I had trouble drafting that one — try rephrasing or build without Plan Mode.",
      });
      send("done", { ok: false });
      res.end();
      return;
    }

    const kind = parsed.kind === "plan" ? "plan" : "question";
    const text =
      typeof parsed.text === "string" && parsed.text.trim()
        ? parsed.text.trim()
        : kind === "plan"
          ? "Here's the plan."
          : "Got it — a quick question:";
    const suggestions: string[] =
      kind === "question" && Array.isArray(parsed.suggestions)
        ? (parsed.suggestions as unknown[])
            .filter((s): s is string => typeof s === "string" && s.trim() !== "")
            .slice(0, 6)
        : [];
    const finalPlan =
      kind === "plan" ? parseApprovedPlan(parsed.plan) : null;

    // If the model said "plan" but the plan body was malformed, we
    // can't proceed — surface a recoverable error rather than silently
    // dropping back to a question.
    if (kind === "plan" && !finalPlan) {
      req.log.warn(
        { raw: cleaned.slice(0, 500) },
        "Plan turn marked kind:plan but plan was malformed",
      );
      send("error", {
        message:
          "The plan came back malformed. Try again or build without Plan Mode.",
      });
      send("done", { ok: false });
      res.end();
      return;
    }

    // Stream the question / summary text into the chat with a short
    // pace so it reads as the assistant typing rather than appearing
    // all at once. We split on word boundaries so each chunk lands as
    // a whole word.
    const chunks = text.split(/(\s+)/).filter((c) => c.length > 0);
    for (const chunk of chunks) {
      if (clientGone) break;
      send("delta", { text: chunk });
      if (!/^\s+$/.test(chunk)) {
        await new Promise((r) => setTimeout(r, 25));
      }
    }

    if (clientGone) {
      if (!res.writableEnded) res.end();
      return;
    }

    // Bill the (tiny) Haiku token cost for this single turn. Same
    // per-million pricing as the build path.
    const rawCost = Math.max(
      0,
      (inputTokens / 1_000_000) * MODELS.haiku.rates.input +
        (outputTokens / 1_000_000) * MODELS.haiku.rates.output,
    );
    const cost = (Math.round(rawCost * 100) / 100).toFixed(2);
    if (ownerId && Number(cost) > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(usersTable)
            .set({ balance: sql`${usersTable.balance} - ${cost}` })
            .where(eq(usersTable.id, ownerId));
          await tx.insert(transactionsTable).values({
            userId: ownerId,
            amount: `-${cost}`,
            method: "Plan interview",
            status: "Success",
          });
        });
      } catch (err) {
        req.log.error({ err }, "Failed to bill for plan turn");
      }
    }

    // Final per-turn payload. The client uses this to either render
    // suggestion chips (kind:"question") or flip the bubble into
    // "ready" state and show Build this (kind:"plan").
    send("turn", {
      kind,
      text,
      suggestions,
      ...(finalPlan ? { plan: finalPlan } : {}),
    });
    send("done", {
      ok: true,
      meta: {
        durationMs: Date.now() - startedAt,
        cost: Number(cost),
        tokensIn: inputTokens,
        tokensOut: outputTokens,
        kind,
      },
    });
    res.end();
  },
);

router.post(
  "/ai/build/:username/:slug",
  // aiLimiter is keyed by user id (with IP fallback) so a logged-in
  // abuser can't dodge the cap by rotating IPs, and a NAT'd office
  // full of legitimate users isn't collectively rate-limited under
  // one shared egress IP. Each AI build is a real Anthropic spend
  // (Sonnet/Opus tokens are not cheap), so this is the most
  // cost-sensitive surface in the app.
  aiLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const prompt = String(req.body?.prompt ?? "").trim();
    const planMode = Boolean(req.body?.planMode);
    // Two-stage Plan Mode: when the client already ran /ai/plan and the
    // user approved (and possibly edited) the structured plan, it comes
    // back here as `approvedPlan`. We accept any object shape — the
    // planning endpoint produces it and we just stringify it back into
    // the system prompt as the locked spec. We coerce to null on any
    // shape mismatch so a malformed payload can never silently change
    // the build behaviour.
    const approvedPlan: ApprovedPlan | null = parseApprovedPlan(req.body?.approvedPlan);
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

    // Resolve which Claude model to run. Free plan is forced to Economy Bro;
    // plan mode auto-upgrades paid users to Power Bro; otherwise we honour
    // the client's choice. The chosen model also determines the per-token
    // rates used to bill the user's balance after the build.
    const modelKey = pickModel(
      req.body?.model,
      ownerPlan,
      planMode,
      approvedPlan !== null,
    );
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

      // ── Completeness audit ───────────────────────────────────────────
      // The system prompt instructs the AI to emit every `.jsx` it
      // references in `<script src="…">`, but bigger builds sometimes
      // slip and forget one (e.g. `components/Nav.jsx`). The preview
      // route's on-the-fly fallback handles the missing fetch, but the
      // user still sees an unpolished result and the project tree
      // doesn't reflect what's actually loading. We fix this by
      // synthesising a real persisted no-op stub for every missing
      // script src, BEFORE the transaction commits — guaranteeing the
      // saved project is structurally complete on every build.
      //
      // We pass the existing project's stored index.html so we still
      // catch missing refs when the AI didn't re-emit index.html in
      // this turn but added a new `<NewThing />` reference inside an
      // existing component. (`existingFiles` was loaded earlier from
      // the same db transaction view.)
      const existingPaths = existingFiles.map((f) => f.path);
      const existingIndexHtml =
        existingFiles.find((f) => f.path === "index.html")?.content ?? null;
      const stubs = auditMissingScriptTargets(
        parsed,
        existingPaths,
        existingIndexHtml,
      );
      if (stubs.length > 0) {
        req.log.warn(
          {
            count: stubs.length,
            paths: stubs.map((s) => s.path),
          },
          "AI referenced files in index.html that it did not emit; auto-creating no-op stubs",
        );
      }
      const allFiles = [...parsed, ...stubs];

      await db.transaction(async (tx) => {
        for (const f of allFiles) {
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

      // Store the human-readable transcript with file payloads, the
      // hidden suggestions block, and any internal control directives
      // (`<deploybro:provision-db />`, `<deploybro:open-tab … />`,
      // `<deploybro:request-secret … />`) stripped so the build history
      // stays compact, readable, and free of internal control tags.
      const visible = stripRequestSecretDirectives(
        stripOpenTabDirective(
          stripProvisionDbDirective(
            stripSuggestionsBlock(stripFileBlocks(fullText)),
          ),
        ),
      );
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

      // PLAN MODE composition.
      //
      //   • TWO-STAGE pipeline (preferred, when an `approvedPlan` is
      //     attached): the user already reviewed and approved a structured
      //     plan in the UI. We inject that plan as a LOCKED SPEC and tell
      //     the model to conform to it — no need for a free-form plan in
      //     the response.
      //
      //   • LEGACY single-pass plan mode (when only `planMode:true`,
      //     no plan attached): keeps the older "write a numbered plan
      //     before code" behaviour as a fallback for any client that
      //     hasn't been updated.
      // Final system prompt = giant inline build prompt (components-catalog)
      // + the small build.md addendum (pipeline awareness, what verifier
      // checks for) + plan-mode / approved-plan instructions.
      const systemPrompt =
        buildSystemPrompt(project.name, project.framework) +
        "\n\n" +
        getPrompt("build") +
        (approvedPlan
          ? buildApprovedPlanInstruction(approvedPlan)
          : planMode
            ? "\n\nPLAN MODE IS ON: Begin your response with a numbered plan (3 to 7 short bullet points) describing exactly which files you will create or change and why. After the plan, write a line containing only '---' and then proceed with the implementation as normal."
            : "");

      // ── Two-stage prompt enhancement ──────────────────────────────────────
      //
      // Stage 1 (AI brief): for short first-build prompts, call Haiku first to
      // generate a structured design brief (colours, fonts, sections, tone).
      // This costs ~$0.001 and ~300ms but dramatically lifts output quality.
      //
      // Stage 2 (static fallback): keyword-based vertical guidance. Used when
      // Stage 1 is unavailable or the prompt isn't eligible.
      const enhanceOpts = {
        prompt,
        hasExistingFiles: existingFiles.length > 0,
        hasReferenceUrls: urls.length > 0,
        hasImages: images.length > 0,
      };

      let finalPrompt = prompt;
      let wasEnhanced = false;

      if (anthropic && shouldExpandBrief(enhanceOpts)) {
        send("status", { message: "Designing your brief…" });
        try {
          const brief = await expandToBrief(prompt, anthropic);
          finalPrompt = buildBriefPrompt(brief, prompt, "");
          wasEnhanced = true;
          // Let the client know which brief tone was chosen (cosmetic)
          send("status", {
            message: `Brief ready (${brief.tone}) — building…`,
          });
        } catch (briefErr) {
          // Brief expansion failed — fall back to static enhancer silently.
          logger.warn({ err: briefErr }, "Brief expansion failed, falling back to static enhancer");
          const staticEnhanced = enhancePrompt(enhanceOpts);
          finalPrompt = staticEnhanced.enhanced;
          wasEnhanced = staticEnhanced.wasEnhanced;
          if (wasEnhanced) {
            const v = staticEnhanced.vertical;
            send("status", {
              message: v ? `Expanding brief (${v.replace("_", " ")})…` : "Expanding brief…",
            });
          }
        }
      } else {
        // Not eligible for brief expansion — use static enhancer (no-op for
        // iterations and long / structured prompts).
        const staticEnhanced = enhancePrompt(enhanceOpts);
        finalPrompt = staticEnhanced.enhanced;
        wasEnhanced = staticEnhanced.wasEnhanced;
        if (wasEnhanced) {
          const v = staticEnhanced.vertical;
          send("status", {
            message: v ? `Expanding brief (${v.replace("_", " ")})…` : "Expanding brief…",
          });
        }
      }

      void wasEnhanced; // suppress unused-var lint — used only for logging above

      // Compose the user message. If images were attached we send a
      // multi-part content array (text + image blocks) which Claude's
      // vision models accept natively. Otherwise we keep it as a string
      // for backward compatibility.
      const textPart = `${filesContext}${urlContext}\n\n---\n\nUser request:\n${finalPrompt}`;
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

      // If the model emitted `<deploybro:provision-db />` we provision a
      // Neon branch + role + database for this project right here, before
      // the `done` event fires. Mirrors the per-project provision route in
      // routes/projects.ts so behaviour is identical to clicking "Create
      // database" in the Database tab. Failures are non-fatal — the build
      // itself still succeeded and the user can retry from the UI later.
      //
      // We scan a directive-detection view of the response that has all
      // `<file>` payloads stripped, so a literal `<deploybro:provision-db />`
      // sitting inside a generated docs file or example XML can NEVER
      // trigger a real provision. Only directives in the model's prose
      // (the part the user actually sees) count.
      let dbProvisioned: boolean | null = null;
      if (hasProvisionDbDirective(stripFileBlocks(fullText))) {
        // Re-read the project's DB fields straight from the database
        // right before we provision. The `project` snapshot was loaded
        // before streaming started — long builds (10–60s) plus the
        // user clicking "Create database" in the Database tab in another
        // tab, OR a parallel build, could mean DB state has moved on
        // since. Re-reading keeps us idempotent under concurrency.
        const [fresh] = await db
          .select({
            databaseUrl: projectsTable.databaseUrl,
          })
          .from(projectsTable)
          .where(eq(projectsTable.id, project.id))
          .limit(1);
        const currentDatabaseUrl = fresh?.databaseUrl ?? null;

        // Idempotency mirror: if a DATABASE_URL is already stored AND it
        // decrypts cleanly, treat the request as a no-op. A corrupt blob
        // (key rotated, etc.) gets re-provisioned — same recovery path
        // the dedicated provision route uses. We remember the corrupt
        // blob so the conditional update below can specifically overwrite
        // it (and ONLY it) without trampling a parallel writer that may
        // have replaced it with a fresh good blob in the meantime.
        let alreadyProvisioned = false;
        let corruptBlobToReplace: string | null = null;
        if (currentDatabaseUrl) {
          try {
            decryptSecret(currentDatabaseUrl);
            alreadyProvisioned = true;
          } catch (err) {
            logger.warn(
              { err, projectId: project.id },
              "Stored DATABASE_URL is corrupt — re-provisioning a fresh branch (AI-triggered)",
            );
            corruptBlobToReplace = currentDatabaseUrl;
          }
        }
        if (alreadyProvisioned) {
          dbProvisioned = false;
        } else {
          send("status", { message: "Provisioning database…" });
          try {
            const provisioned = await provisionAppDatabase(
              `${String(req.params.slug)}-${String(req.params.username)}`,
            );
            // Conditional update guard: only write the new DB fields if
            // the row's `databaseUrl` is either still NULL (fresh case)
            // OR exactly the corrupt blob we just observed (recovery
            // case). If a parallel writer (Database tab click, second
            // concurrent build) won the race in either scenario, the
            // predicate fails, our update is a no-op, and we leave the
            // orphan Neon branch we just created for operator sweep —
            // same recovery story the dedicated /db/provision route
            // accepts when reconciling stale state. Crucially this
            // means corrupt-blob recovery still WORKS (we'd otherwise
            // be unable to overwrite a non-null corrupt value).
            const writeGuard = corruptBlobToReplace
              ? sql`(${projectsTable.databaseUrl} IS NULL OR ${projectsTable.databaseUrl} = ${corruptBlobToReplace})`
              : sql`${projectsTable.databaseUrl} IS NULL`;
            const updated = await db
              .update(projectsTable)
              .set({
                databaseUrl: encryptSecret(provisioned.connectionUri),
                neonBranchId: provisioned.branchId,
                neonRoleName: provisioned.roleName,
                neonProjectId: parentProjectId(),
              })
              .where(and(eq(projectsTable.id, project.id), writeGuard))
              .returning({ id: projectsTable.id });
            if (updated.length === 0) {
              logger.warn(
                { projectId: project.id, branchId: provisioned.branchId },
                "AI-triggered DB provision raced with another writer; orphan branch left for operator sweep",
              );
              dbProvisioned = false;
              send("status", { message: "Database already set up" });
            } else {
              dbProvisioned = true;
              send("status", { message: "Database ready" });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(
              { err, projectId: project.id },
              "AI-triggered DB provision failed",
            );
            dbProvisioned = false;
            send("status", {
              message: `Database provisioning failed: ${message.slice(0, 160)}`,
            });
          }
        }
      }

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
      // Pull the four (max) follow-up task suggestions the model emitted in
      // its hidden `<suggestions>` block. Sent only on success — there's
      // nothing useful to suggest after an error.
      const suggestions = parseSuggestions(fullText);
      // Parse control directives off the prose-only view (file blocks
      // stripped) so an example tag inside a generated file can never
      // trigger a tab switch or render a fake secret-input bubble.
      const directiveScan = stripFileBlocks(fullText);
      const openTab = parseOpenTabDirective(directiveScan);
      const secretRequests = parseRequestSecretDirectives(directiveScan);
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
        openTab,
        secretRequests,
        suggestions,
        // null when the AI didn't request a DB; true when we just
        // provisioned one; false when the request was a no-op (already
        // provisioned) or failed. The client uses any non-null value as
        // a hint to refetch the Database tab so a freshly-provisioned
        // DB shows up without a manual page refresh.
        databaseProvisioned: dbProvisioned,
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

// ─── Clarification gate ──────────────────────────────────────────────
// Stage 1 of the build pipeline. Called BEFORE /ai/build. A fast Haiku
// call decides whether the user's prompt has enough detail to build
// confidently, OR whether ONE specific clarifying question would
// dramatically lift quality. The shape mirrors the plan turn's
// "question" payload so the client can reuse the same suggestion-chip
// UI to render the question.
//
// Response shapes (always 200, JSON):
//   { ok: true }                                 → build can proceed as-is
//   { ok: false, question: "...", suggestions: [...] }
//
// Iterations on existing projects ALWAYS pass through — the existing
// code is the context, no clarification needed. Same for any prompt
// over ~20 words or with attached URLs.
router.post(
  "/ai/clarify/:username/:slug",
  aiLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const prompt = String(req.body?.prompt ?? "").trim();
    const hasUrls = Array.isArray(req.body?.urls) && req.body.urls.length > 0;
    const hasImages = Array.isArray(req.body?.images) && req.body.images.length > 0;

    if (!prompt) {
      res.status(400).json({
        status: "error",
        message: "Couldn't read your prompt — please try again.",
      });
      return;
    }

    const rows = await db
      .select({ project: projectsTable, ownerId: usersTable.id })
      .from(projectsTable)
      .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
      .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
      .limit(1);
    const project = rows[0]?.project;
    const ownerId = rows[0]?.ownerId;
    if (!project) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const authedUser = getAuthedUser(req);
    if (!authedUser || authedUser.id !== ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }

    // Cheap fast-path checks before paying for a Haiku call. These
    // mirror the rules in clarify.md but run client-side-fast so we
    // don't waste a roundtrip when the answer is obviously "ok".
    const fileCount = (
      await db
        .select({ id: projectFilesTable.id })
        .from(projectFilesTable)
        .where(eq(projectFilesTable.projectId, project.id))
        .limit(1)
    ).length;
    const isIteration = fileCount > 0;
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (isIteration || wordCount > 20 || hasUrls || hasImages) {
      res.json({ ok: true });
      return;
    }

    if (!anthropic) {
      // No AI available — degrade gracefully and let the build proceed.
      res.json({ ok: true });
      return;
    }

    const system = renderPrompt("clarify", {
      prompt,
      contextLine: isIteration
        ? `Iteration on a project that already has ${fileCount} files.`
        : "First build — no project files yet.",
    });

    let raw = "";
    try {
      const result = await anthropic.messages.create({
        model: MODELS.haiku.id,
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      raw = result.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    } catch (err) {
      req.log.warn({ err }, "Clarify call failed; passing through");
      // On AI failure, never block the user — let the build run.
      res.json({ ok: true });
      return;
    }

    // Parse strict-JSON envelope. On any parse failure, pass through
    // — better to skip clarification than to block on a malformed reply.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    let parsed: Record<string, unknown> | null = null;
    if (startIdx >= 0 && endIdx > startIdx) {
      try {
        const obj = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
        if (obj && typeof obj === "object") parsed = obj as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }
    if (!parsed || parsed.ok === true) {
      res.json({ ok: true });
      return;
    }

    const question =
      typeof parsed.question === "string" && parsed.question.trim()
        ? parsed.question.trim()
        : null;
    if (!question) {
      res.json({ ok: true });
      return;
    }
    const suggestions = Array.isArray(parsed.suggestions)
      ? (parsed.suggestions as unknown[])
          .filter((s): s is string => typeof s === "string" && s.trim() !== "")
          .slice(0, 4)
      : [];
    res.json({ ok: false, question, suggestions });
  },
);

// ─── Verification stage ──────────────────────────────────────────────
// Stage 4 of the build pipeline. Called by the client immediately
// after a successful build's `done` event. Loads the project's current
// file set, runs a Haiku audit against verification.md, and returns a
// fixed-shape checklist (8 entries: html_entry, script_targets_exist,
// components_defined, router_complete, no_network_calls, no_imports,
// content_quality, accessibility_basics). Each entry has a status
// (pass/warn/fail) and, on warn/fail, a self-contained `fixPrompt`
// the client can hand back to /ai/build with one click.
//
// Response shape (always 200, JSON):
//   { summary: "...", checks: [{ id, title, status, summary, files, fixPrompt }] }
//
// On any failure (no AI, malformed reply, etc.) we return a graceful
// pass-everything stub rather than blocking the user — verification is
// a quality-of-life feature, not a build gate.
router.post(
  "/ai/verify/:username/:slug",
  aiLimiter,
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const username = String(req.params.username);
    const slug = String(req.params.slug);
    const userPrompt = String(req.body?.prompt ?? "").trim();

    const rows = await db
      .select({ project: projectsTable, ownerId: usersTable.id })
      .from(projectsTable)
      .innerJoin(usersTable, eq(usersTable.id, projectsTable.userId))
      .where(and(eq(usersTable.username, username), eq(projectsTable.slug, slug)))
      .limit(1);
    const project = rows[0]?.project;
    const ownerId = rows[0]?.ownerId;
    if (!project) {
      res.status(404).json({ status: "error", message: "Project not found" });
      return;
    }
    const authedUser = getAuthedUser(req);
    if (!authedUser || authedUser.id !== ownerId) {
      res.status(403).json({ status: "error", message: "Forbidden" });
      return;
    }

    // Load current files. Cap content size per file (8KB) and total
    // file count (40) so a huge project doesn't blow Haiku's context.
    // The verifier looks at structural HTML/JSX patterns, so an 8KB
    // window is more than enough to spot bugs in the relevant areas.
    const allFiles = await db
      .select({ path: projectFilesTable.path, content: projectFilesTable.content })
      .from(projectFilesTable)
      .where(eq(projectFilesTable.projectId, project.id))
      .orderBy(asc(projectFilesTable.path));

    if (allFiles.length === 0) {
      // Nothing to verify — return pass-everything so the panel renders
      // empty rather than an error state.
      res.json({
        summary: "No files yet to verify.",
        checks: [],
      });
      return;
    }

    // Prioritise the files most likely to surface verifier-relevant
    // issues: index.html first, then layout/page files, then
    // components, then everything else. Truncated to 40 / 8KB each.
    const PRIORITY: (p: string) => number = (p) => {
      if (p === "index.html") return 0;
      if (p.endsWith("/layout.jsx") || p.endsWith("layout.jsx")) return 1;
      if (p.endsWith("/page.jsx") || p.endsWith("page.jsx")) return 2;
      if (p.startsWith("components/")) return 3;
      return 4;
    };
    const sorted = [...allFiles].sort(
      (a, b) => PRIORITY(a.path) - PRIORITY(b.path) || a.path.localeCompare(b.path),
    );
    // Char-budget instead of fixed file count: 200KB total, 8KB per
    // file. Stops once the budget is hit so a project with 41 small
    // priority-3 files still includes a critical Header.jsx that would
    // otherwise be dropped by a hard slice(0, 40). Always includes at
    // least one file so we never send an empty audit.
    const PER_FILE_CAP = 8000;
    const TOTAL_CAP = 200_000;
    const included: typeof sorted = [];
    let usedChars = 0;
    for (const f of sorted) {
      const slice = f.content.length > PER_FILE_CAP
        ? f.content.slice(0, PER_FILE_CAP)
        : f.content;
      if (included.length > 0 && usedChars + slice.length > TOTAL_CAP) break;
      included.push({ ...f, content: slice });
      usedChars += slice.length;
    }
    const filesContext = included
      .map((f) => {
        const truncated = f.content.length >= PER_FILE_CAP
          ? f.content + "\n…[truncated]"
          : f.content;
        return `--- ${f.path} ---\n${truncated}`;
      })
      .join("\n\n");

    if (!anthropic) {
      res.json({
        summary: "Verification skipped — AI is not configured on this server.",
        checks: [],
      });
      return;
    }

    const system = renderPrompt("verification", {
      prompt: userPrompt || "(not provided)",
      filesContext,
    });

    let raw = "";
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const result = await anthropic.messages.create({
        model: MODELS.haiku.id,
        max_tokens: 3_500,
        system,
        messages: [
          {
            role: "user",
            content:
              "Audit the files above against the verification checklist and return the JSON envelope.",
          },
        ],
      });
      inputTokens = result.usage?.input_tokens ?? 0;
      outputTokens = result.usage?.output_tokens ?? 0;
      raw = result.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    } catch (err) {
      req.log.warn({ err }, "Verify call failed; returning empty checklist");
      res.json({
        summary: "Couldn't run verification right now.",
        checks: [],
      });
      return;
    }

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    let parsed: Record<string, unknown> | null = null;
    if (startIdx >= 0 && endIdx > startIdx) {
      try {
        const obj = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
        if (obj && typeof obj === "object") parsed = obj as Record<string, unknown>;
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      req.log.warn(
        { raw: cleaned.slice(0, 400) },
        "Verify response was not valid JSON",
      );
      res.json({
        summary: "Verification reply was malformed — try again.",
        checks: [],
      });
      return;
    }

    const checksRaw = Array.isArray(parsed.checks) ? parsed.checks : [];
    const ALLOWED_STATUS = new Set(["pass", "warn", "fail"]);
    const checks = checksRaw
      .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
      .map((c) => {
        const status =
          typeof c.status === "string" && ALLOWED_STATUS.has(c.status)
            ? (c.status as "pass" | "warn" | "fail")
            : "pass";
        const files = Array.isArray(c.files)
          ? (c.files as unknown[])
              .filter((f): f is string => typeof f === "string")
              .slice(0, 8)
          : [];
        const fixPrompt =
          status !== "pass" &&
          typeof c.fixPrompt === "string" &&
          c.fixPrompt.trim().length > 0
            ? c.fixPrompt.trim()
            : null;
        return {
          id: typeof c.id === "string" ? c.id : "unknown",
          title: typeof c.title === "string" ? c.title : "Check",
          status,
          summary:
            typeof c.summary === "string" ? c.summary : "",
          files,
          fixPrompt,
        };
      })
      .slice(0, 12);

    // Tone the default summary to match the worst-case status so a
    // missing/blank `summary` field on the AI's reply doesn't say
    // "Build verified." over a checklist with 8 fails.
    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : failCount > 0
          ? `Found ${failCount} issue${failCount === 1 ? "" : "s"} that need attention.`
          : warnCount > 0
            ? `Build runs, but ${warnCount} thing${warnCount === 1 ? "" : "s"} could be improved.`
            : "Build verified.";

    // Bill the Haiku audit cost (typically <$0.01). Same per-million
    // pricing model as plan/build, recorded as its own transaction
    // line so users can see verification costs separately. Use 4-decimal
    // precision so sub-cent audits don't round to $0.00 — the balance
    // column is `numeric` and the transactions UI already truncates for
    // display, so we don't lose anything by storing the actual cost.
    const rawCost = Math.max(
      0,
      (inputTokens / 1_000_000) * MODELS.haiku.rates.input +
        (outputTokens / 1_000_000) * MODELS.haiku.rates.output,
    );
    const cost = (Math.round(rawCost * 10000) / 10000).toFixed(4);
    if (ownerId && Number(cost) > 0) {
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(usersTable)
            .set({ balance: sql`${usersTable.balance} - ${cost}` })
            .where(eq(usersTable.id, ownerId));
          await tx.insert(transactionsTable).values({
            userId: ownerId,
            amount: `-${cost}`,
            method: "Build verification",
            status: "Success",
          });
        });
      } catch (err) {
        req.log.error({ err }, "Failed to bill for verify call");
      }
    }

    res.json({ summary, checks });
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

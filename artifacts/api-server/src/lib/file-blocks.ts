// Parses a stream of model output looking for `<file path="...">…</file>`
// blocks. The format is intentionally simple so it survives token-by-token
// streaming and tolerates whitespace / nested angle brackets in the body
// (terminated by the literal `</file>`).
export type ParsedFile = { path: string; content: string };

const OPEN_RE = /<file\s+path="([^"]+)"\s*>/g;
const CLOSE = "</file>";

export function parseFileBlocks(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const seen = new Set<string>();
  OPEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPEN_RE.exec(text)) !== null) {
    const path = sanitizePath(match[1]);
    if (!path) continue;
    const bodyStart = OPEN_RE.lastIndex;
    const closeIdx = text.indexOf(CLOSE, bodyStart);
    if (closeIdx < 0) break;
    let content = text.slice(bodyStart, closeIdx);
    // Trim a single leading newline produced by `<file ...>\n…`.
    if (content.startsWith("\n")) content = content.slice(1);
    // Trim a single trailing newline before `</file>`.
    if (content.endsWith("\n")) content = content.slice(0, -1);
    OPEN_RE.lastIndex = closeIdx + CLOSE.length;
    // Last write wins so the model can rewrite a file mid-message.
    if (seen.has(path)) {
      const existing = files.findIndex((f) => f.path === path);
      if (existing >= 0) files[existing] = { path, content };
    } else {
      seen.add(path);
      files.push({ path, content });
    }
  }
  return files;
}

// Removes any text inside `<file ...>` blocks so the chat transcript only
// shows the model's prose explanation, not the raw file payloads.
export function stripFileBlocks(text: string): string {
  let out = "";
  let cursor = 0;
  OPEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPEN_RE.exec(text)) !== null) {
    out += text.slice(cursor, match.index);
    const closeIdx = text.indexOf(CLOSE, OPEN_RE.lastIndex);
    if (closeIdx < 0) {
      // Open tag with no close yet — drop everything from this point on
      // so the chat doesn't briefly show raw file bodies. The marker is
      // rendered by the client as an inline icon (see FileNoticeText).
      cursor = text.length;
      out += `\n[[FILE_PENDING:${match[1]}]]`;
      break;
    }
    out += `\n[[FILE_DONE:${match[1]}]]\n`;
    cursor = closeIdx + CLOSE.length;
    OPEN_RE.lastIndex = cursor;
  }
  out += text.slice(cursor);
  return out;
}

// Exported so the preview/file routes can canonicalize incoming request
// paths the *same* way the parser canonicalises stored paths. This keeps
// `index.html`, `./index.html`, and `dir//file.js` from diverging between
// what's persisted and what's fetched.
export function sanitizePath(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let p = raw.trim();
  if (!p) return null;
  // Reject Windows drive paths up front before we strip slashes.
  if (/^[a-zA-Z]:[\\/]/.test(p)) return null;
  // Normalize backslashes to forward slashes.
  p = p.replace(/\\/g, "/");
  // Strip leading slashes.
  p = p.replace(/^\/+/, "");
  // Collapse runs of slashes: "a//b" -> "a/b".
  p = p.replace(/\/{2,}/g, "/");
  // Walk segments, dropping "." and rejecting "..". Reject empty segments
  // (which means trailing slash, i.e. directory not file).
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") {
      // Trailing/internal "." segments are OK to drop, but a final empty
      // segment (trailing slash) means it's not a file path.
      continue;
    }
    if (seg === "..") return null;
    out.push(seg);
  }
  const normalized = out.join("/");
  if (!normalized) return null;
  if (normalized.length > 200) return null;
  // Disallow trailing slash and require at least one extension-bearing segment.
  if (normalized.endsWith("/")) return null;
  // Only allow a sensible subset of characters in the final path.
  if (!/^[a-zA-Z0-9_./-]+$/.test(normalized)) return null;
  return normalized;
}

// Parses the trailing `<suggestions><item>…</item>…</suggestions>` block
// from the model output. The model is instructed to emit it as the very
// last thing in the reply, so we deliberately match the LAST occurrence
// (allowing only whitespace after the closing tag) — that way prose that
// happens to mention `<suggestions>` earlier in the response can never
// be mistaken for the real chip block. The UI then renders the items as
// clickable chips above the prompt box.
//
// `lastSuggestionsMatch` walks the string looking for the final
// `<suggestions>…</suggestions>` pair whose closing tag is the last
// non-whitespace content in the message. Returns the match start, end
// (after closing tag), and inner body, or null if there is no such block.
function lastSuggestionsMatch(
  text: string,
): { start: number; end: number; inner: string } | null {
  const OPEN = "<suggestions>";
  const CLOSE = "</suggestions>";
  // Walk from the end looking for the last `<suggestions>` open tag.
  // (Using lastIndexOf for the open tag, then locating the matching
  // close tag forwards from there.) Case-insensitive matching is done
  // by lowercasing a sliding window only when needed — a full lowercase
  // copy would double the memory for very large outputs.
  const lower = text.toLowerCase();
  const openIdx = lower.lastIndexOf(OPEN);
  if (openIdx < 0) return null;
  const closeIdx = lower.indexOf(CLOSE, openIdx + OPEN.length);
  if (closeIdx < 0) return null;
  const end = closeIdx + CLOSE.length;
  // Only treat it as the trailing block if nothing but whitespace follows.
  if (text.slice(end).trim().length > 0) return null;
  return {
    start: openIdx,
    end,
    inner: text.slice(openIdx + OPEN.length, closeIdx),
  };
}

const SUGG_ITEM_RE = /<item>([\s\S]*?)<\/item>/gi;

export function parseSuggestions(text: string): string[] {
  const m = lastSuggestionsMatch(text);
  if (!m) return [];
  const out: string[] = [];
  SUGG_ITEM_RE.lastIndex = 0;
  let im: RegExpExecArray | null;
  while ((im = SUGG_ITEM_RE.exec(m.inner)) !== null) {
    const v = im[1].trim();
    if (v) out.push(v.length > 120 ? v.slice(0, 120) : v);
    if (out.length >= 4) break;
  }
  return out;
}

// Removes the trailing `<suggestions>…</suggestions>` block (if any) from
// the visible transcript so the chips don't show up as raw XML in the
// chat history. Only strips the terminal block — earlier mentions of the
// tag (e.g. quoted in prose) are left alone.
export function stripSuggestionsBlock(text: string): string {
  const m = lastSuggestionsMatch(text);
  if (!m) return text;
  const head = text.slice(0, m.start).replace(/\s+$/, "");
  return head + (head ? "\n" : "");
}

// `<deploybro:provision-db />` is a directive the AI can emit anywhere in
// its reply when the user is building a feature that benefits from a real
// database (auth, persisted submissions, multi-user data, anything that
// shouldn't live in localStorage). Seeing it triggers the same Neon
// branch+role+database provisioning the "Create database" button in the
// Database tab uses, so the project gets a `DATABASE_URL` env var ready
// for the next publish — no extra step from the user.
//
// Tolerates `<deploybro:provision-db>`, `<deploybro:provision-db/>`, and
// `<deploybro:provision-db />` (with or without inner whitespace) so a
// stray formatting choice from the model still fires.
const PROVISION_DB_RE =
  /<deploybro:provision-db\s*\/?>(?:\s*<\/deploybro:provision-db>)?/gi;

export function hasProvisionDbDirective(text: string): boolean {
  PROVISION_DB_RE.lastIndex = 0;
  return PROVISION_DB_RE.test(text);
}

// Strip every occurrence of the directive so the visible chat doesn't
// show raw XML. We also collapse the now-empty line where it sat so the
// transcript doesn't grow stray blank gaps.
export function stripProvisionDbDirective(text: string): string {
  PROVISION_DB_RE.lastIndex = 0;
  return text
    .replace(PROVISION_DB_RE, "")
    .replace(/\n[ \t]*\n[ \t]*\n/g, "\n\n");
}

// `<deploybro:open-tab name="env" />` — the AI uses this to send the
// user to a specific tab in the builder after a reply (e.g. "I've added
// the env var, opening the Env Vars tab so you can see it"). Whitelisted
// tab names are enforced server-side; an unknown name is ignored.
const OPEN_TAB_RE =
  /<deploybro:open-tab\s+name=["']([a-z0-9_-]{1,32})["']\s*\/?>(?:\s*<\/deploybro:open-tab>)?/gi;

const VALID_TAB_NAMES = new Set<string>([
  "preview",
  "files",
  "database",
  "env",
  "analytics",
  "payments",
  "integrations",
  "domains",
  "history",
  "settings",
]);

// Returns the LAST valid tab name the AI asked to open in this reply,
// or null if none were emitted. We pick the last so a model that
// (incorrectly) emits multiple directives still ends up on a single
// deterministic tab — the most recent intent wins.
export function parseOpenTabDirective(text: string): string | null {
  OPEN_TAB_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let last: string | null = null;
  while ((match = OPEN_TAB_RE.exec(text)) !== null) {
    const name = match[1].toLowerCase();
    if (VALID_TAB_NAMES.has(name)) last = name;
  }
  return last;
}

export function stripOpenTabDirective(text: string): string {
  OPEN_TAB_RE.lastIndex = 0;
  return text.replace(OPEN_TAB_RE, "").replace(/\n[ \t]*\n[ \t]*\n/g, "\n\n");
}

// `<deploybro:request-secret name="STRIPE_SECRET_KEY" label="Stripe
// secret key" description="From dashboard.stripe.com/apikeys" />` —
// the AI uses this when a feature it just built (or is about to build)
// needs a secret value that ONLY the user can supply. The chat UI
// renders a masked input bubble for each request right beneath the AI
// message; submitting it PUTs the value to /env-vars and the AI never
// sees it. We deliberately do NOT support inline values — the AI must
// only request secrets, never set them itself.
//
// Attribute order is flexible (name|label|description in any order),
// values can be single or double quoted, and the tag may be self-closing
// or paired. `name` is required; the rest fall back to humanised
// defaults if missing.
const REQUEST_SECRET_RE =
  /<deploybro:request-secret\b([^>]*)\/?>(?:\s*<\/deploybro:request-secret>)?/gi;

export type RequestedSecret = {
  name: string;
  label: string;
  description: string | null;
};

function attr(haystack: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const m = haystack.match(re);
  if (!m) return null;
  const v = (m[1] ?? m[2] ?? "").trim();
  return v.length > 0 ? v : null;
}

const SECRET_NAME_RE = /^[A-Z][A-Z0-9_]{0,127}$/;

export function parseRequestSecretDirectives(text: string): RequestedSecret[] {
  REQUEST_SECRET_RE.lastIndex = 0;
  const out: RequestedSecret[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = REQUEST_SECRET_RE.exec(text)) !== null) {
    const attrs = match[1] ?? "";
    const rawName = attr(attrs, "name");
    if (!rawName) continue;
    const name = rawName.trim().toUpperCase();
    if (!SECRET_NAME_RE.test(name)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    const label = attr(attrs, "label") ?? name;
    const description = attr(attrs, "description");
    out.push({ name, label, description });
    // Cap at 8 per reply — anything more is almost certainly a model
    // loop and would overwhelm the chat UI.
    if (out.length >= 8) break;
  }
  return out;
}

export function stripRequestSecretDirectives(text: string): string {
  REQUEST_SECRET_RE.lastIndex = 0;
  return text
    .replace(REQUEST_SECRET_RE, "")
    .replace(/\n[ \t]*\n[ \t]*\n/g, "\n\n");
}

// Defends the dev preview against the most common second-build regression:
// the AI introduces a NEW `.jsx` file (a component or page) but forgets to
// re-emit `index.html` with a matching `<script type="text/babel" src="…">`
// tag. The previously-stored index.html then loads, the new file is never
// fetched, references like `<NewThing />` resolve to `undefined`, and React
// throws "Element type is invalid" from inside the AI-generated `App`
// component — leaving the user with a blank red overlay on a flow that
// worked fine on the first build.
//
// We scan the served HTML for existing `<script type="text/babel" src="…">`
// tags, then for any `.jsx` files in the project that aren't already
// referenced we inject auto-discovered tags in canonical load order
// (`hooks/*` first, then `components/*`, then `pages/*`, with anything
// uncategorised in the middle), placed immediately BEFORE the existing
// `app.jsx` script tag (or before `</body>` if no app.jsx tag exists).
//
// Three things this deliberately does NOT do:
//   1. Touch projects that don't already use `<script type="text/babel">`
//      anywhere — those are static HTML / vanilla JS sites and injecting
//      babel script tags would break them.
//   2. Auto-inject `app.jsx` itself. If app.jsx is missing, the AI broke
//      something more fundamental and the error overlay should surface it.
//   3. Affect the published Vercel build — this is purely a dev-preview
//      mutation. The publish payload builder reads source files unchanged.
export function injectOrphanScripts(
  html: string,
  allJsxPaths: string[],
): string {
  // Find every `<script type="text/babel" src="…">` tag currently in the
  // HTML. Both `type` and `src` may appear in either order; the regex
  // tolerates that plus single/double quotes and stray whitespace.
  const SCRIPT_RE =
    /<script\b[^>]*\btype\s*=\s*["']text\/babel["'][^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  const SCRIPT_RE_REVERSE =
    /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*\btype\s*=\s*["']text\/babel["'][^>]*>\s*<\/script>/gi;
  const referenced = new Set<string>();
  const collect = (re: RegExp): void => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      // Strip leading "./" or "/" so the comparison matches the canonical
      // stored path (the parser sanitises these on the way in).
      referenced.add(m[1].trim().replace(/^\.?\/+/, ""));
    }
  };
  collect(SCRIPT_RE);
  collect(SCRIPT_RE_REVERSE);

  // No babel script tags at all → static HTML / non-React project. Bail.
  if (referenced.size === 0) return html;

  // Bucket orphans by canonical load order. `app.jsx` (or any nested
  // `*/app.jsx`) is intentionally excluded — if it's missing, the AI
  // failed in a different way and we want the error overlay to fire.
  const isAppEntry = (p: string): boolean =>
    p === "app.jsx" || /(^|\/)app\.jsx$/i.test(p);
  const orphans = allJsxPaths.filter(
    (p) => !referenced.has(p) && !isAppEntry(p),
  );
  if (orphans.length === 0) return html;

  const bucketOf = (p: string): number => {
    if (p.startsWith("hooks/")) return 1;
    if (p.startsWith("components/")) return 2;
    if (p.startsWith("pages/")) return 3;
    return 2; // unknown-folder files behave most like components
  };
  orphans.sort((a, b) => {
    const ba = bucketOf(a);
    const bb = bucketOf(b);
    if (ba !== bb) return ba - bb;
    return a.localeCompare(b);
  });

  // Build the injection block. The `data-deploybro-auto` attribute makes
  // it obvious in the rendered DOM that we filled in a missing tag, which
  // is useful when debugging "wait, where did THIS script come from?".
  const tags = orphans
    .map(
      (p) =>
        `<script type="text/babel" data-presets="react" data-deploybro-auto src="${p}"></script>`,
    )
    .join("\n  ");
  const block =
    `\n  <!-- deploybro: auto-loaded ${orphans.length} script tag${
      orphans.length === 1 ? "" : "s"
    } the AI forgot to re-emit in index.html -->\n  ${tags}\n  `;

  // Inject right BEFORE the existing `app.jsx` script tag so the canonical
  // load order is preserved (hooks → components → pages → app.jsx LAST).
  // If no `app.jsx` script tag exists in this HTML we deliberately bail
  // and return the original — without an anchor we have no safe place to
  // insert that's guaranteed to keep the right load order, and silently
  // adding scripts to a project the AI didn't bootstrap as a multi-file
  // React app would mask the real failure rather than fix it. The error
  // overlay surfaces whatever crash happens next so the user sees it.
  const APP_TAG_RE =
    /<script\b[^>]*\btype\s*=\s*["']text\/babel["'][^>]*\bsrc\s*=\s*["'](?:\.\/?|\/)?app\.jsx["'][^>]*>\s*<\/script>/i;
  const APP_TAG_RE_REVERSE =
    /<script\b[^>]*\bsrc\s*=\s*["'](?:\.\/?|\/)?app\.jsx["'][^>]*\btype\s*=\s*["']text\/babel["'][^>]*>\s*<\/script>/i;
  const appMatch = html.match(APP_TAG_RE) ?? html.match(APP_TAG_RE_REVERSE);
  if (!appMatch || typeof appMatch.index !== "number") return html;
  return html.slice(0, appMatch.index) + block + html.slice(appMatch.index);
}

export function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "html":
    case "htm":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
    case "mjs":
      return "application/javascript; charset=utf-8";
    case "jsx":
    case "tsx":
    case "ts":
      // Served as text/babel so the in-browser Babel standalone transpiler
      // can pick them up via `<script type="text/babel" src="…">`.
      return "text/babel; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "svg":
      return "image/svg+xml";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "ico":
      return "image/x-icon";
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "tiff":
    case "tif":
      return "image/tiff";
    // Fonts — important for user-uploaded brand fonts to render in
    // both the live preview iframe and the published Vercel site.
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    case "ttf":
      return "font/ttf";
    case "otf":
      return "font/otf";
    case "eot":
      return "application/vnd.ms-fontobject";
    // Audio / video — round out the binary asset story so uploaded
    // sound/video files at least serve with the right type.
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "pdf":
      return "application/pdf";
    case "wasm":
      return "application/wasm";
    case "txt":
    case "md":
      return "text/plain; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

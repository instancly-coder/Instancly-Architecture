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
      // so the chat doesn't briefly show raw file bodies.
      cursor = text.length;
      out += `\n_(writing ${match[1]}…)_`;
      break;
    }
    out += `\n_(updated **${match[1]}**)_\n`;
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
    case "txt":
    case "md":
      return "text/plain; charset=utf-8";
    default:
      return "text/plain; charset=utf-8";
  }
}

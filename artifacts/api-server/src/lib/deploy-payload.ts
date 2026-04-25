// Translates the project_files rows that the AI generated into the inlined
// file payload Vercel expects. Also injects sane defaults when the AI omits
// `package.json` or `vercel.json` so Vite-based builds work out of the box.

import type { VercelInlinedFile } from "./vercel";

export type ProjectFileLite = { path: string; content: string };

const DEFAULT_PACKAGE_JSON = {
  name: "deploybro-app",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview",
  },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  },
  devDependencies: {
    "@vitejs/plugin-react": "^4.3.4",
    vite: "^5.4.10",
  },
};

const DEFAULT_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`;

const DEFAULT_VERCEL_JSON = {
  rewrites: [{ source: "/(.*)", destination: "/index.html" }],
};

// Hard cap on the total size of the inlined payload we'll send to Vercel.
// Vercel itself rejects requests well above 100MB; we leave a safety margin
// so the user gets our friendly message instead of an opaque 413 / network
// error mid-pipeline. Counted as the sum of the raw (pre-base64) file
// contents — base64 inflates by ~4/3 but headers, JSON envelope, and other
// fields take additional space so 90MB raw is comfortably under the limit.
export const PAYLOAD_SIZE_LIMIT_BYTES = 90 * 1024 * 1024;

// File extensions that are unambiguously binary (images, fonts, archives,
// audio/video, compiled artifacts). The DB column for `content` is `text`,
// so anything that arrived here has already been UTF-8 round-tripped and is
// almost certainly corrupt — base64-encoding it again would just deploy a
// broken asset. Reject up front with a clear message instead.
const BINARY_EXTENSIONS = new Set([
  // images
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "tif", "avif", "heic",
  // fonts
  "woff", "woff2", "ttf", "otf", "eot",
  // audio
  "mp3", "wav", "ogg", "flac", "aac", "m4a",
  // video
  "mp4", "mov", "avi", "webm", "mkv",
  // archives / binaries
  "zip", "tar", "gz", "tgz", "rar", "7z", "pdf", "exe", "dll", "so", "dylib",
  "wasm", "class", "jar",
]);

// Thrown when the project contains a file whose extension we know is binary.
// Caught by the publish pipeline and surfaced verbatim to the user via the
// deployments row's `errorMessage` column.
export class BinaryFileNotSupportedError extends Error {
  readonly path: string;
  constructor(path: string) {
    super(
      `Binary uploads aren't supported yet — remove or replace "${path}" before publishing.`,
    );
    this.name = "BinaryFileNotSupportedError";
    this.path = path;
  }
}

// Thrown when the total raw size of project files exceeds our safe limit.
export class PayloadTooLargeError extends Error {
  readonly totalBytes: number;
  readonly limitBytes: number;
  constructor(totalBytes: number, limitBytes: number) {
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const limitMb = Math.floor(limitBytes / (1024 * 1024));
    super(
      `Project is too large to publish (${totalMb}MB; limit is ${limitMb}MB). Remove large files and try again.`,
    );
    this.name = "PayloadTooLargeError";
    this.totalBytes = totalBytes;
    this.limitBytes = limitBytes;
  }
}

function extensionOf(path: string): string {
  const idx = path.lastIndexOf(".");
  if (idx < 0 || idx === path.length - 1) return "";
  return path.slice(idx + 1).toLowerCase();
}

function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(extensionOf(path));
}

function toBase64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

// True if the project file list looks like it should be treated as a
// pre-built static site (raw HTML/CSS/JS at the root) rather than a Vite
// project. In that case we ship everything as `public/` and let Vercel
// serve it without a build step.
function isStaticOnly(files: ProjectFileLite[]): boolean {
  const hasIndexHtml = files.some((f) => f.path === "index.html");
  const hasPackage = files.some((f) => f.path === "package.json");
  const hasJsx = files.some((f) => /\.(tsx|jsx)$/.test(f.path));
  return hasIndexHtml && !hasPackage && !hasJsx;
}

export function buildVercelPayload(
  files: ProjectFileLite[],
): VercelInlinedFile[] {
  // ---------- Pre-flight: reject binary files & oversized payloads ----------
  // Run these checks before any base64 work so failures are fast and the
  // error message references the offending path, not a partial payload.
  let totalBytes = 0;
  for (const f of files) {
    if (isBinaryPath(f.path)) {
      throw new BinaryFileNotSupportedError(f.path);
    }
    // Byte length, not character length — multi-byte UTF-8 characters
    // count for what they actually take on the wire.
    totalBytes += Buffer.byteLength(f.content, "utf8");
    if (totalBytes > PAYLOAD_SIZE_LIMIT_BYTES) {
      throw new PayloadTooLargeError(totalBytes, PAYLOAD_SIZE_LIMIT_BYTES);
    }
  }

  const present = new Set(files.map((f) => f.path));

  if (isStaticOnly(files)) {
    // Pure static site — ship as-is plus a vercel.json that disables the
    // build step. Vercel will serve files from the project root.
    const out: VercelInlinedFile[] = files.map((f) => ({
      file: f.path,
      data: toBase64(f.content),
      encoding: "base64",
    }));
    if (!present.has("vercel.json")) {
      out.push({
        file: "vercel.json",
        data: toBase64(JSON.stringify({
          buildCommand: null,
          outputDirectory: ".",
          rewrites: DEFAULT_VERCEL_JSON.rewrites,
        }, null, 2)),
        encoding: "base64",
      });
    }
    return out;
  }

  // Vite project path — synthesize package.json / vite.config / vercel.json
  // when missing so the AI doesn't have to remember to emit them every time.
  const out: VercelInlinedFile[] = files.map((f) => ({
    file: f.path,
    data: toBase64(f.content),
    encoding: "base64",
  }));

  if (!present.has("package.json")) {
    out.push({
      file: "package.json",
      data: toBase64(JSON.stringify(DEFAULT_PACKAGE_JSON, null, 2)),
      encoding: "base64",
    });
  }
  if (!present.has("vite.config.js") && !present.has("vite.config.ts")) {
    out.push({
      file: "vite.config.js",
      data: toBase64(DEFAULT_VITE_CONFIG),
      encoding: "base64",
    });
  }
  if (!present.has("vercel.json")) {
    out.push({
      file: "vercel.json",
      data: toBase64(JSON.stringify(DEFAULT_VERCEL_JSON, null, 2)),
      encoding: "base64",
    });
  }

  return out;
}

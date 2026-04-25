// Translates the project_files rows that the AI generated (or the user
// uploaded) into the inlined file payload Vercel expects. Also injects sane
// defaults when the project omits `package.json` or `vercel.json` so
// Vite-based builds work out of the box.

import type { VercelInlinedFile } from "./vercel";

// Rows we accept from the publish pipeline. `encoding` mirrors the new
// project_files column: "utf8" means `content` is the raw source string,
// "base64" means `content` is already base64-encoded bytes (binary
// uploads — images, fonts, etc.).
export type ProjectFileLite = {
  path: string;
  content: string;
  encoding?: "utf8" | "base64" | null;
};

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
// error mid-pipeline. Counted as the sum of the raw (decoded) file
// contents — base64 inflates by ~4/3 but headers, JSON envelope, and other
// fields take additional space so 90MB raw is comfortably under the limit.
export const PAYLOAD_SIZE_LIMIT_BYTES = 90 * 1024 * 1024;

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

function toBase64FromUtf8(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

// Returns the base64-encoded payload Vercel expects, plus the raw
// (decoded) byte length for size accounting. Branches on `encoding` so
// binary uploads — already base64 in the DB — pass through unchanged
// instead of being re-encoded as UTF-8 (which would corrupt them).
function encodeForVercel(file: ProjectFileLite): {
  data: string;
  rawBytes: number;
} {
  if (file.encoding === "base64") {
    // Re-decode just to get the raw byte length for the size budget.
    // This is a small price to pay for an honest size check, and
    // base64 decoding is fast.
    const rawBytes = Buffer.from(file.content, "base64").length;
    return { data: file.content, rawBytes };
  }
  const rawBytes = Buffer.byteLength(file.content, "utf8");
  return { data: toBase64FromUtf8(file.content), rawBytes };
}

// True if the project file list looks like it should be treated as a
// pre-built static site rather than a project that needs `vite build` to
// run on Vercel. In that case we ship everything as-is and let Vercel
// serve it without a build step.
//
// The AI builder emits CDN-style projects on purpose: an `index.html`
// that pulls React + ReactDOM from unpkg and uses
// `<script type="text/babel" src="app.jsx">` so Babel-standalone
// transpiles the JSX in the browser at runtime. That means the
// presence of `.jsx` files is NOT a signal of a Vite project — those
// files are meant to be served as raw text and compiled client-side,
// the same way the dev preview iframe loads them.
//
// So the real signal is `package.json`. Without it there is nothing to
// `npm install` and no build to run, and any attempt to force one
// would silently produce an empty bundle (Vercel's auto-detect treats
// a folder with only `.jsx` and `index.html` as Vite, runs
// `vite build`, and emits a near-empty `dist/` because the JSX files
// reference `React`/`ReactDOM` as globals from CDNs that aren't
// imported as ES modules — which is exactly the "blank page after
// publish" report we got).
function isStaticOnly(files: ProjectFileLite[]): boolean {
  const hasIndexHtml = files.some((f) => f.path === "index.html");
  const hasPackage = files.some((f) => f.path === "package.json");
  return hasIndexHtml && !hasPackage;
}

export function buildVercelPayload(
  files: ProjectFileLite[],
): VercelInlinedFile[] {
  // ---------- Pre-flight: encode every file & enforce the size cap ----------
  // We do this in a single pass so the size accounting is honest (binary
  // file size is the *decoded* byte length, not the inflated base64
  // length) and so an oversized project bails out before we synthesise
  // any defaults below.
  const encoded: VercelInlinedFile[] = [];
  let totalBytes = 0;
  for (const f of files) {
    const { data, rawBytes } = encodeForVercel(f);
    totalBytes += rawBytes;
    if (totalBytes > PAYLOAD_SIZE_LIMIT_BYTES) {
      throw new PayloadTooLargeError(totalBytes, PAYLOAD_SIZE_LIMIT_BYTES);
    }
    encoded.push({ file: f.path, data, encoding: "base64" });
  }

  const present = new Set(files.map((f) => f.path));

  if (isStaticOnly(files)) {
    // Pure static site — ship as-is plus a vercel.json that disables the
    // build step. Vercel will serve files from the project root.
    if (!present.has("vercel.json")) {
      encoded.push({
        file: "vercel.json",
        data: toBase64FromUtf8(JSON.stringify({
          buildCommand: null,
          outputDirectory: ".",
          rewrites: DEFAULT_VERCEL_JSON.rewrites,
        }, null, 2)),
        encoding: "base64",
      });
    }
    return encoded;
  }

  // Vite project path — synthesize package.json / vite.config / vercel.json
  // when missing so the AI doesn't have to remember to emit them every time.
  if (!present.has("package.json")) {
    encoded.push({
      file: "package.json",
      data: toBase64FromUtf8(JSON.stringify(DEFAULT_PACKAGE_JSON, null, 2)),
      encoding: "base64",
    });
  }
  if (!present.has("vite.config.js") && !present.has("vite.config.ts")) {
    encoded.push({
      file: "vite.config.js",
      data: toBase64FromUtf8(DEFAULT_VITE_CONFIG),
      encoding: "base64",
    });
  }
  if (!present.has("vercel.json")) {
    encoded.push({
      file: "vercel.json",
      data: toBase64FromUtf8(JSON.stringify(DEFAULT_VERCEL_JSON, null, 2)),
      encoding: "base64",
    });
  }

  return encoded;
}

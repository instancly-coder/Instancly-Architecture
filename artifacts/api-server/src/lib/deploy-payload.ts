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

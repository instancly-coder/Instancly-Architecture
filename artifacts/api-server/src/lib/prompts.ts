// Centralised loader for the markdown-based prompt files that drive
// each stage of the AI pipeline (plan → clarify → build → verify).
//
// The .md sources live under `artifacts/api-server/prompts/` and are
// copied into `dist/prompts/` by the esbuild script (see build.mjs).
// At runtime we resolve them relative to `__dirname` (set by the
// banner at the top of dist/index.mjs), which works in both `pnpm dev`
// (which still bundles before starting) and prod.
//
// We read every prompt eagerly at module init so a typo in a path
// surfaces on server boot rather than at the first request, and so
// repeated render calls don't re-touch the filesystem on the hot path.
//
// Templates use a tiny `{{name}}` placeholder syntax — no expressions,
// no nesting — to keep the markdown human-editable. Unknown vars are
// left untouched so it's safe to add new variables incrementally.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve to <package>/dist/prompts/ at runtime. The banner emitted by
// build.mjs sets globalThis.__filename + globalThis.__dirname for the
// bundled output, but we still compute it here from import.meta.url so
// this module also works when run directly via tsx/ts-node.
const here = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(here, "..", "prompts");

export type PromptName = "plan" | "build" | "clarify" | "verification";

const cache: Partial<Record<PromptName, string>> = {};

function loadRaw(name: PromptName): string {
  if (cache[name]) return cache[name]!;
  const file = join(PROMPTS_DIR, `${name}.md`);
  const body = readFileSync(file, "utf8");
  cache[name] = body;
  return body;
}

/**
 * Render a prompt with simple `{{name}}` substitution. Missing keys
 * are left as the literal `{{name}}` in the output so a forgotten
 * variable is loud rather than silently rendering a half-empty string.
 */
export function renderPrompt(
  name: PromptName,
  vars: Record<string, string | number> = {},
): string {
  const raw = loadRaw(name);
  return raw.replace(/\{\{(\w+)\}\}/g, (full, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : full,
  );
}

/** Returns the raw markdown body of a prompt without substitution. */
export function getPrompt(name: PromptName): string {
  return loadRaw(name);
}

// Eager preload so a missing/misnamed file fails fast on boot rather
// than on the first user request. Wrapped so the import side-effect
// can't crash the whole server in the rare case prompts/ is absent in
// some bespoke environment — the per-call loadRaw will throw a clearer
// error if it actually matters.
try {
  loadRaw("plan");
  loadRaw("build");
  loadRaw("clarify");
  loadRaw("verification");
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(
    "[prompts] Preload failed — prompts will be loaded on first use:",
    (err as Error).message,
  );
}

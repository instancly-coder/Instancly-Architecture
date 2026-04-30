// Loads every `*.md` skill file in this directory at build time and
// exposes a typed `SKILLS` array. Each markdown file uses YAML-style
// frontmatter (`name`, `description`) followed by the skill body —
// the body is what gets prepended to the user's prompt when the skill
// is activated via the `/` slash-picker on the homepage, and shown on
// the `/skills` marketing page so people know what they're getting.

export type Skill = {
  /** filename without `.md`, e.g. "polish" — used as the slash-command token. */
  slug: string;
  /** Display name from the frontmatter. */
  name: string;
  /** Short trigger description from the frontmatter. */
  description: string;
  /** The instruction text injected into the prompt when activated. */
  body: string;
};

// Vite eager-glob: every .md file ships its raw text into the bundle.
// `import: "default"` returns the raw string directly so we don't have
// to dereference `.default` at use-sites.
const RAW = import.meta.glob("./*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  // Tiny YAML-frontmatter parser. We only support `key: value` lines —
  // no nested objects, lists, or multi-line values. Good enough for
  // our metadata shape (name + description) and avoids pulling in a
  // dependency for a few dozen lines of text. We normalize CRLF →
  // LF up front so files saved on Windows still parse correctly.
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(normalized);
  if (!match) return { meta: {}, body: raw.trim() };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (k) meta[k] = v;
  }
  return { meta, body: (match[2] ?? "").trim() };
}

export const SKILLS: Skill[] = Object.entries(RAW)
  .map(([path, raw]) => {
    const slug = path.replace(/^\.\//, "").replace(/\.md$/, "");
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug,
      name: meta.name ?? slug,
      description: meta.description ?? "",
      body,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/** Look a skill up by slug. */
export function findSkill(slug: string): Skill | undefined {
  return SKILLS.find((s) => s.slug === slug);
}

/** Build the prompt prefix that gets prepended when one or more
 *  skills are active. Each skill's body is rendered as its own
 *  fenced section so the AI can clearly see which instructions
 *  belong to which skill. */
export function buildSkillsPrefix(slugs: string[]): string {
  const active = slugs.map(findSkill).filter((s): s is Skill => !!s);
  if (active.length === 0) return "";
  const blocks = active.map(
    (s) => `## Skill: ${s.name}\n${s.body}`,
  );
  return `Apply the following skill instructions to the request below.\n\n${blocks.join("\n\n")}\n\n---\n\n`;
}

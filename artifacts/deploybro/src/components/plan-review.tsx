import { useState } from "react";
import { Check, Pencil, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type Plan = {
  projectName: string;
  summary: string;
  pages: string[];
  sections: { name: string; description: string; enabled: boolean }[];
  colors: { name: string; hex: string }[];
  fonts: { heading: string; body: string };
  features: string[];
  copyTone: string;
};

// Lightweight markdown renderer scoped to the format the server emits
// from /ai/plan: `## heading`, paragraphs, `- bullets`, `**bold**`, and
// inline `` `code` ``. We render these directly instead of pulling in a
// full markdown library because the format is tightly server-controlled
// and we want fine UI control (hex colors get a swatch, bullets get a
// custom dot, etc).
export function PlanText({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: Array<
    | { type: "h"; content: string }
    | { type: "p"; content: string }
    | { type: "ul"; items: string[] }
  > = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      blocks.push({ type: "h", content: line.slice(3) });
      i++;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: "ul", items });
    } else if (line.trim() === "") {
      i++;
    } else {
      blocks.push({ type: "p", content: line });
      i++;
    }
  }
  return (
    <div className="space-y-2">
      {blocks.map((b, idx) => {
        if (b.type === "h") {
          return (
            <h3
              key={idx}
              className="text-sm font-semibold text-foreground mt-2 first:mt-0"
            >
              {b.content}
            </h3>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={idx} className="space-y-1 ml-0.5">
              {b.items.map((it, ii) => (
                <li
                  key={ii}
                  className="flex gap-2 text-sm leading-relaxed text-foreground"
                >
                  <span className="text-secondary mt-[2px] shrink-0">•</span>
                  <span className="flex-1 min-w-0">
                    <PlanInlineMd text={it} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-sm leading-relaxed text-foreground">
            <PlanInlineMd text={b.content} />
          </p>
        );
      })}
    </div>
  );
}

function PlanInlineMd({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          const inner = p.slice(1, -1);
          // Hex colors get a tiny inline swatch so the palette is
          // visible at a glance — the streamed text is the only place
          // the user sees the actual colors before approving the plan.
          if (/^#[0-9a-fA-F]{6}$/.test(inner)) {
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-raised text-xs font-mono align-middle"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm border border-border/60"
                  style={{ backgroundColor: inner }}
                />
                {inner}
              </span>
            );
          }
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-surface-raised text-xs font-mono"
            >
              {inner}
            </code>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

type Props = {
  open: boolean;
  plan: Plan;
  onCancel: () => void;
  onApprove: (plan: Plan) => void;
};

export function PlanReview({ open, plan, onCancel, onApprove }: Props) {
  // Local working copy so we can edit/toggle without mutating the prop. The
  // user's edits only escape via onApprove(modified) — Cancel discards them.
  const [draft, setDraft] = useState<Plan>(plan);
  const [editing, setEditing] = useState(false);

  const toggleSection = (i: number) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, idx) =>
        idx === i ? { ...s, enabled: !s.enabled } : s,
      ),
    }));

  const updateSectionDesc = (i: number, value: string) =>
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s, idx) =>
        idx === i ? { ...s, description: value } : s,
      ),
    }));

  const updateColor = (i: number, hex: string) =>
    setDraft((d) => ({
      ...d,
      colors: d.colors.map((c, idx) => (idx === i ? { ...c, hex } : c)),
    }));

  const updateFeature = (i: number, value: string) =>
    setDraft((d) => ({
      ...d,
      features: d.features.map((f, idx) => (idx === i ? value : f)),
    }));

  const enabledCount = draft.sections.filter((s) => s.enabled).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        // Override the default max-width so the plan can breathe; the
        // structured layout is denser than a typical confirm dialog.
        // The built-in DialogContent close (X) in the corner already
        // calls onOpenChange(false) which routes through onCancel below.
        className="max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
      >
        {/* Header — leave room on the right for the dialog's built-in X */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 pr-14 border-b border-border/60">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-primary/15 text-primary inline-flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                Build plan ready
              </DialogTitle>
              <p className="text-xs text-secondary mt-0.5">
                Review the plan, toggle sections, edit anything — then build.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing((e) => !e)}
              className="h-8 px-2.5 text-xs gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              {editing ? "Done" : "Edit"}
            </Button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Project name + summary */}
          <section className="space-y-2">
            {editing ? (
              <Input
                value={draft.projectName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, projectName: e.target.value }))
                }
                className="text-lg font-semibold h-9"
              />
            ) : (
              <h2 className="text-lg font-semibold leading-tight">
                {draft.projectName}
              </h2>
            )}
            {editing ? (
              <Textarea
                value={draft.summary}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, summary: e.target.value }))
                }
                rows={2}
                className="text-sm"
              />
            ) : (
              <p className="text-sm text-secondary leading-relaxed">
                {draft.summary}
              </p>
            )}
          </section>

          {/* Pages — editable list. Click to rename, × to remove,
              "+ Add page" to append a new entry. The trimmed list is
              what ships in `onApprove`. */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wider text-secondary font-medium">
                Pages
              </h3>
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => ({ ...d, pages: [...d.pages, "New page"] }))
                }
                className="text-xs text-secondary hover:text-primary"
                data-testid="plan-add-page"
              >
                + Add page
              </button>
            </div>
            {draft.pages.length === 0 ? (
              <p className="text-xs text-secondary italic">No pages yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {draft.pages.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-raised"
                  >
                    <input
                      value={p}
                      onChange={(e) =>
                        setDraft((d) => {
                          const pages = [...d.pages];
                          pages[i] = e.target.value;
                          return { ...d, pages };
                        })
                      }
                      className="bg-transparent text-xs font-medium outline-none focus:ring-1 focus:ring-accent rounded px-1 min-w-[4rem]"
                      style={{ width: `${Math.max(p.length, 4) + 1}ch` }}
                      data-testid={`plan-page-${i}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          pages: d.pages.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="text-secondary hover:text-primary text-sm leading-none"
                      aria-label={`Remove ${p}`}
                      data-testid={`plan-remove-page-${i}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sections */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wider text-secondary font-medium">
                Sections
              </h3>
              <span className="text-[11px] text-secondary font-mono">
                {enabledCount} / {draft.sections.length} on
              </span>
            </div>
            <div className="space-y-1.5">
              {draft.sections.map((s, i) => (
                <div
                  key={`${s.name}-${i}`}
                  className={`rounded-md p-3 transition-colors ${
                    s.enabled
                      ? "bg-surface-raised"
                      : "bg-surface-raised/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleSection(i)}
                      aria-pressed={s.enabled}
                      aria-label={`${s.enabled ? "Disable" : "Enable"} ${s.name}`}
                      className={`mt-0.5 w-4 h-4 rounded-[3px] border inline-flex items-center justify-center shrink-0 transition-colors ${
                        s.enabled
                          ? "bg-primary border-primary"
                          : "border-secondary/70 hover:border-foreground"
                      }`}
                    >
                      {s.enabled && (
                        <Check
                          className="w-3 h-3 text-primary-foreground"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.name}</div>
                      {editing ? (
                        <Input
                          value={s.description}
                          onChange={(e) =>
                            updateSectionDesc(i, e.target.value)
                          }
                          className="mt-1 h-7 text-xs"
                        />
                      ) : (
                        <div className="text-xs text-secondary mt-0.5 leading-relaxed">
                          {s.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Colors + Fonts side-by-side on wider screens */}
          <div className="grid sm:grid-cols-2 gap-6">
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">
                Color palette
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {draft.colors.map((c, i) => (
                  <div
                    key={`${c.name}-${i}`}
                    className="flex items-center gap-2 p-2 rounded-md bg-surface-raised"
                  >
                    {editing ? (
                      <input
                        type="color"
                        value={c.hex}
                        onChange={(e) => updateColor(i, e.target.value)}
                        className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer shrink-0"
                        aria-label={`${c.name} color`}
                      />
                    ) : (
                      <span
                        className="w-7 h-7 rounded shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-secondary font-mono uppercase">
                        {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">
                Typography
              </h3>
              <div className="space-y-2">
                <div className="p-2.5 rounded-md bg-surface-raised">
                  <div className="text-[10px] uppercase tracking-wider text-secondary mb-1">
                    Heading
                  </div>
                  {editing ? (
                    <Input
                      value={draft.fonts.heading}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          fonts: { ...d.fonts, heading: e.target.value },
                        }))
                      }
                      className="h-7 text-xs"
                    />
                  ) : (
                    <div className="text-sm font-medium">
                      {draft.fonts.heading}
                    </div>
                  )}
                </div>
                <div className="p-2.5 rounded-md bg-surface-raised">
                  <div className="text-[10px] uppercase tracking-wider text-secondary mb-1">
                    Body
                  </div>
                  {editing ? (
                    <Input
                      value={draft.fonts.body}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          fonts: { ...d.fonts, body: e.target.value },
                        }))
                      }
                      className="h-7 text-xs"
                    />
                  ) : (
                    <div className="text-sm font-medium">
                      {draft.fonts.body}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Features */}
          {draft.features.length > 0 && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">
                Key features
              </h3>
              <ul className="space-y-1.5">
                {draft.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                    {editing ? (
                      <Input
                        value={f}
                        onChange={(e) => updateFeature(i, e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                    ) : (
                      <span className="flex-1">{f}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Copy tone */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">
              Copy tone
            </h3>
            {editing ? (
              <Input
                value={draft.copyTone}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, copyTone: e.target.value }))
                }
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-sm text-secondary">{draft.copyTone}</p>
            )}
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-surface-raised/30">
          <p className="text-[11px] text-secondary leading-snug hidden sm:block">
            The build will be locked to this plan. You can iterate after the
            first build like normal.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(draft)}
              className="gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Build this
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

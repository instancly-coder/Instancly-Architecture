// Plan-mode artifacts. The old PlanReview modal + PlanText markdown
// renderer have been retired in favour of the conversational interview
// flow (see builder.tsx → planConversation). All that remains is:
//   - the `Plan` type (still the wire format between server & build),
//   - `PlanSummary`, a compact structured render of the final approved
//     plan that the conversation card shows just above the
//     "Build this" / "Cancel" actions.

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

// Structured summary of the final approved plan. Designed to fit
// inside the plan-conversation card in the chat panel — dense but
// scannable, no horizontal scroll. Omits sections the model didn't
// populate so an iteration plan with no colors/sections still renders
// cleanly.
//
// The palette is interactive when an `onChange` prop is supplied: up
// to four swatches are shown side-by-side and each one opens a native
// color picker on click. Picking a color fires `onChange` with the
// plan mutated in place. Pages / sections / typography / features
// stay read-only — they're better edited via a follow-up chat turn.
const PALETTE_LIMIT = 4;

export function PlanSummary({
  plan,
  onChange,
}: {
  plan: Plan;
  onChange?: (next: Plan) => void;
}) {
  const enabledSections = plan.sections.filter((s) => s.enabled);
  const editable = typeof onChange === "function";
  // Show the first PALETTE_LIMIT colors. The model occasionally
  // suggests 5–6 — we keep the chat surface tight by truncating.
  const visibleColors = plan.colors.slice(0, PALETTE_LIMIT);

  const handleColorChange = (idx: number, hex: string) => {
    if (!onChange) return;
    const nextColors = plan.colors.map((c, i) =>
      i === idx ? { ...c, hex } : c,
    );
    onChange({ ...plan, colors: nextColors });
  };
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-semibold text-foreground leading-tight">
          {plan.projectName}
        </div>
        {plan.summary && (
          <p className="text-secondary text-xs leading-relaxed mt-0.5">
            {plan.summary}
          </p>
        )}
      </div>

      {plan.pages.length > 0 && (
        <Section label="Pages">
          <div className="flex flex-wrap gap-1">
            {plan.pages.map((p, i) => (
              <span
                key={`pg-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-raised text-xs"
              >
                {p}
              </span>
            ))}
          </div>
        </Section>
      )}

      {enabledSections.length > 0 && (
        <Section label={`Sections (${enabledSections.length})`}>
          <div className="flex flex-wrap gap-1">
            {enabledSections.map((s, i) => (
              <span
                key={`sec-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-raised text-xs"
                title={s.description}
              >
                {s.name}
              </span>
            ))}
          </div>
        </Section>
      )}

      {visibleColors.length > 0 && (
        <Section label="Palette">
          <div className="flex flex-wrap gap-2">
            {visibleColors.map((c, i) =>
              editable ? (
                // The label wraps a hidden native color input, so the
                // entire chip — swatch + hex label — is the click
                // target that opens the OS color picker. `onInput`
                // fires continuously while the user drags inside the
                // picker, giving them a live preview against the rest
                // of the plan summary.
                <label
                  key={`col-${i}`}
                  className="group inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface text-[11px] font-mono cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
                  title={`${c.name} · ${c.hex} · click to change`}
                >
                  <span
                    className="inline-block w-4 h-4 rounded-sm shadow-inner"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="uppercase">{c.hex}</span>
                  <input
                    type="color"
                    value={normalizeHex(c.hex)}
                    onInput={(e) =>
                      handleColorChange(i, e.currentTarget.value)
                    }
                    className="sr-only"
                    aria-label={`Change ${c.name} color`}
                  />
                </label>
              ) : (
                <span
                  key={`col-${i}`}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface text-[11px] font-mono"
                  title={`${c.name} · ${c.hex}`}
                >
                  <span
                    className="inline-block w-4 h-4 rounded-sm shadow-inner"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="uppercase">{c.hex}</span>
                </span>
              ),
            )}
          </div>
          {editable && (
            <p className="text-[10px] text-secondary mt-1.5 leading-relaxed">
              Click a swatch to change it, or describe the palette you
              want in the chat.
            </p>
          )}
        </Section>
      )}

      {(plan.fonts.heading || plan.fonts.body) && (
        <Section label="Typography">
          <div className="text-xs text-foreground">
            <span className="font-medium">{plan.fonts.heading}</span>
            <span className="text-secondary mx-1.5">·</span>
            <span>{plan.fonts.body}</span>
          </div>
        </Section>
      )}

      {plan.features.length > 0 && (
        <Section label="Key features">
          <ul className="space-y-0.5">
            {plan.features.map((f, i) => (
              <li
                key={`feat-${i}`}
                className="flex items-start gap-2 text-xs leading-relaxed text-foreground"
              >
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                <span className="flex-1 min-w-0">{f}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {plan.copyTone && (
        <Section label="Tone">
          <p className="text-xs text-secondary leading-relaxed">
            {plan.copyTone}
          </p>
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-secondary font-medium mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

// `<input type="color">` only accepts 7-character `#rrggbb` strings.
// The model occasionally emits 3-digit shorthand or names ("blue"),
// which would silently render as black in the picker. Normalise to a
// safe value the picker can paint, falling back to mid-grey when the
// input is unparseable so the user can still pick a new color.
function normalizeHex(input: string): string {
  const v = input.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    const [, r, g, b] = v;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#888888";
}

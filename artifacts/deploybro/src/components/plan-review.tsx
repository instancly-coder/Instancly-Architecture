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

// Read-only structured summary of the final approved plan. Designed to
// fit inside the plan-conversation card in the chat panel — dense but
// scannable, no horizontal scroll. Omits sections the model didn't
// populate so an iteration plan with no colors/sections still renders
// cleanly.
export function PlanSummary({ plan }: { plan: Plan }) {
  const enabledSections = plan.sections.filter((s) => s.enabled);
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

      {plan.colors.length > 0 && (
        <Section label="Palette">
          <div className="flex flex-wrap gap-1.5">
            {plan.colors.map((c, i) => (
              <span
                key={`col-${i}`}
                className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface-raised text-[11px] font-mono"
                title={`${c.name} · ${c.hex}`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-sm border border-border/60"
                  style={{ backgroundColor: c.hex }}
                />
                {c.hex}
              </span>
            ))}
          </div>
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

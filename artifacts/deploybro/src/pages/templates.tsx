import { Link } from "wouter";
import { useTemplates, useMe } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Shell } from "@/pages/info";
import { DashboardLayout } from "@/components/dashboard-layout";

// Public landing for the curated, admin-featured templates returned by
// `GET /api/templates`. Reachable from:
//   - the homepage "View all" link in the templates section,
//   - the admin templates page's "Open public /templates →" link.
//
// Visual layout mirrors the four-up grid on `landing.tsx` (same card
// chrome, same `aspect-[16/10]` thumbnail, same `screenshotUrl ??
// coverImageUrl` resolution, same letter fallback) so a visitor scrolling
// from "View all" lands on a page that looks like the section they came
// from. We don't add filters here on purpose — the curated set is small
// (currently 3) and orthogonal to the search/sort UX on `/explore`,
// which already covers all public projects including templates.

function TemplateSkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-4 flex-1 flex flex-col gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

function TemplatesGrid() {
  const { data: templates = [], isLoading } = useTemplates();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <TemplateSkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-secondary">
        No templates yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => (
        <Link
          key={t.id}
          href={`/${t.author}/${t.slug}`}
          aria-label={`Open template ${t.name} by ${t.author}`}
          className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col"
        >
          <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-surface-raised to-background relative overflow-hidden">
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase z-10">
              {t.framework}
            </div>
            {(t.screenshotUrl ?? t.coverImageUrl) ? (
              <img
                src={(t.screenshotUrl ?? t.coverImageUrl)!}
                alt={t.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-top transition-transform group-hover:scale-[1.02]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
                <div className="w-16 h-16 rounded-2xl bg-border flex items-center justify-center text-secondary font-mono text-3xl">
                  {t.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col gap-2">
            <h3 className="font-medium group-hover:text-primary transition-colors truncate">
              {t.name}
            </h3>
            <p className="text-xs text-secondary line-clamp-2">{t.description || "—"}</p>
            <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-secondary">
              <span className="truncate">by @{t.author}</span>
              <span>{t.clones} clones</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Templates() {
  // Match the dual-chrome pattern used by `/explore`: signed-in
  // visitors get the dashboard sidebar so the page sits naturally next
  // to Projects / Library / Billing, anonymous visitors get the
  // marketing Shell for SEO + a sign-up CTA in the footer.
  const { data: me } = useMe();
  const isAuthed = !!me?.username;

  if (isAuthed) {
    return (
      <DashboardLayout>
        <div className="px-4 md:px-8 py-6 md:py-8">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-secondary mb-1">
              Templates
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Featured templates</h1>
            <p className="text-sm text-secondary mt-1 max-w-2xl">
              Hand-picked starting points. Clone any template into your dashboard,
              then customise with the AI builder.
            </p>
          </div>
          <TemplatesGrid />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <Shell
      eyebrow="Templates"
      title="Featured templates"
      intro="Hand-picked starting points. Clone any template into your dashboard, then customise with the AI builder."
    >
      <TemplatesGrid />
    </Shell>
  );
}

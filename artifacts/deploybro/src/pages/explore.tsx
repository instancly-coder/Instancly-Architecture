import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, X } from "lucide-react";
import { useTemplates, useMe, type ApiTemplateItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shell } from "@/pages/info";
import { DashboardLayout } from "@/components/dashboard-layout";

// Single public-facing browse surface. Replaces the previous separate
// `/templates` and `/explore` routes — both are now consolidated here
// at `/explore`. Lists the curated, admin-featured templates returned
// by `GET /api/templates` and lets the visitor narrow with a search
// box, framework filter, and sort.
//
// Visual layout mirrors the four-up grid on `landing.tsx` (same card
// chrome, same `aspect-[16/10]` thumbnail, same `screenshotUrl ??
// coverImageUrl` resolution, same letter fallback).

type SortKey = "recent" | "popular" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Newest",
  popular: "Most clones",
  name: "A → Z",
};

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

function applyFilters(
  templates: ApiTemplateItem[],
  q: string,
  framework: string,
  sort: SortKey,
): ApiTemplateItem[] {
  const needle = q.trim().toLowerCase();
  let out = templates.filter((t) => {
    if (framework !== "all" && t.framework !== framework) return false;
    if (!needle) return true;
    return (
      t.name.toLowerCase().includes(needle) ||
      (t.description ?? "").toLowerCase().includes(needle) ||
      t.author.toLowerCase().includes(needle)
    );
  });

  if (sort === "popular") {
    out = [...out].sort((a, b) => b.clones - a.clones);
  } else if (sort === "name") {
    out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // "recent" — server orders by clones, so we have to sort by
    // `createdAt` ourselves to make "Newest" mean what it says.
    out = [...out].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return out;
}

function ExploreGrid() {
  const { data: templates = [], isLoading } = useTemplates();
  const [q, setQ] = useState("");
  const [framework, setFramework] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Build the framework dropdown from the data so we don't hard-code a
  // list that drifts whenever the curated set adds a new stack.
  const frameworks = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) set.add(t.framework);
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(
    () => applyFilters(templates, q, framework, sort),
    [templates, q, framework, sort],
  );

  const hasActiveFilters = q.length > 0 || framework !== "all" || sort !== "recent";

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates"
            className="pl-9"
            aria-label="Search templates"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-secondary hover:text-foreground hover:bg-surface-raised"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={framework} onValueChange={setFramework}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by framework">
            <SelectValue placeholder="All frameworks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All frameworks</SelectItem>
            {frameworks.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Sort templates">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {SORT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateSkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-secondary">
          {templates.length === 0 ? (
            "No templates yet."
          ) : (
            <div className="space-y-3">
              <div>No templates match your filters.</div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setFramework("all");
                    setSort("recent");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
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
      )}
    </>
  );
}

export default function Explore() {
  // Dual-chrome pattern: signed-in visitors get the dashboard sidebar
  // so the page sits naturally next to Projects / Billing / Settings;
  // anonymous visitors get the marketing Shell for SEO + a sign-up CTA
  // in the footer.
  const { data: me } = useMe();
  const isAuthed = !!me?.username;

  if (isAuthed) {
    return (
      <DashboardLayout>
        <div className="px-4 md:px-8 py-6 md:py-8">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-secondary mb-1">
              Explore
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Featured templates</h1>
            <p className="text-sm text-secondary mt-1 max-w-2xl">
              Hand-picked starting points. Clone any template into your
              dashboard, then customise with the AI builder.
            </p>
          </div>
          <ExploreGrid />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <Shell
      eyebrow="Explore"
      title="Featured templates"
      intro="Hand-picked starting points. Clone any template into your dashboard, then customise with the AI builder."
    >
      <ExploreGrid />
    </Shell>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Shell } from "@/pages/info";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PROJECT_CATEGORIES } from "@/lib/categories";

// Single public-facing browse surface. Replaces the previous separate
// `/templates` and `/explore` routes — both are now consolidated here
// at `/explore`. Lists the curated, admin-featured templates returned
// by `GET /api/templates` and lets the visitor narrow with a search
// box, category filter, and sort.
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

// How many of the top-cloned templates feed the hero carousel. Five
// gives a strong "best of" feel without paginating offscreen on
// desktop where two cards are visible at a time.
const FEATURED_CAROUSEL_COUNT = 5;

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
  category: string,
  sort: SortKey,
): ApiTemplateItem[] {
  const needle = q.trim().toLowerCase();
  let out = templates.filter((t) => {
    if (category !== "all" && (t.category ?? "Other") !== category) return false;
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

// Big-format hero card used inside the featured carousel. Wider
// thumbnail and richer metadata than the grid card so the carousel
// feels distinct from the grid below.
function FeaturedCard({ t }: { t: ApiTemplateItem }) {
  const img = t.screenshotUrl ?? t.coverImageUrl;
  return (
    <Link
      href={`/${t.author}/${t.slug}`}
      aria-label={`Open featured template ${t.name} by ${t.author}`}
      className="group block rounded-2xl border border-border bg-surface hover-elevate overflow-hidden h-full"
    >
      <div className="grid sm:grid-cols-[1.2fr_1fr] h-full">
        <div className="aspect-[16/10] sm:aspect-auto bg-gradient-to-br from-primary/20 via-surface-raised to-background relative overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={t.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
              <div className="w-20 h-20 rounded-2xl bg-border flex items-center justify-center text-secondary font-mono text-4xl">
                {t.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
        <div className="p-5 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase">
              Featured
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-raised border border-border text-[10px] font-mono uppercase text-secondary">
              {t.category ?? "Other"}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
            {t.name}
          </h3>
          <p className="text-sm text-secondary line-clamp-3">
            {t.description || "—"}
          </p>
          <div className="mt-auto flex items-center justify-between text-xs text-secondary pt-2">
            <span className="truncate">by @{t.author}</span>
            <span>{t.clones} clones</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeaturedCarousel({ templates }: { templates: ApiTemplateItem[] }) {
  // Top by clones — that's the most defensible "featured" signal we
  // can compute client-side without a separate flag.
  const featured = useMemo(
    () =>
      [...templates]
        .sort((a, b) => b.clones - a.clones)
        .slice(0, FEATURED_CAROUSEL_COUNT),
    [templates],
  );

  // Embla API + chevron state. We track selected/canScroll so the
  // arrow buttons can disable themselves at the ends.
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  if (featured.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-secondary">
            Spotlight
          </div>
          <h2 className="text-lg font-semibold">Featured this week</h2>
        </div>
        <div className="flex gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => api?.scrollPrev()}
            disabled={!canPrev}
            aria-label="Previous featured template"
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => api?.scrollNext()}
            disabled={!canNext}
            aria-label="Next featured template"
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false }}
        className="w-full"
      >
        <CarouselContent>
          {featured.map((t) => (
            <CarouselItem
              key={t.id}
              className="basis-full md:basis-1/2"
            >
              <FeaturedCard t={t} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

function ExploreGrid() {
  const { data: templates = [], isLoading } = useTemplates();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  // Derive the category dropdown from the static list union'd with
  // any extra values present in the data — that way an admin who
  // adds a new bucket on the server doesn't have to ship a frontend
  // change before it's selectable.
  const categories = useMemo(() => {
    const set = new Set<string>(PROJECT_CATEGORIES);
    for (const t of templates) {
      if (t.category) set.add(t.category);
    }
    return Array.from(set);
  }, [templates]);

  const filtered = useMemo(
    () => applyFilters(templates, q, category, sort),
    [templates, q, category, sort],
  );

  const hasActiveFilters = q.length > 0 || category !== "all" || sort !== "recent";

  return (
    <>
      <FeaturedCarousel templates={templates} />

      {/*
        Mobile layout: search on row 1 (full width), the two selects
        share row 2 side-by-side via grid-cols-2 so they don't stack
        vertically. Desktop collapses everything onto one row.
      */}
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
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-full sm:w-44"
              aria-label="Filter by category"
            >
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              className="w-full sm:w-40"
              aria-label="Sort templates"
            >
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
                    setCategory("all");
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
                  {t.category ?? "Other"}
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

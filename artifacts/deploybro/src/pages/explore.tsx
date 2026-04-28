import { useEffect, useMemo, useRef, useState } from "react";
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

// Single public-facing browse surface. Lists curated, admin-featured
// templates with three browsing surfaces stacked top-to-bottom:
//   1. Hero: title + a prominent search input with an inline dropdown
//      that surfaces matching templates as the visitor types.
//   2. Featured carousel: top-cloned spotlights, sits between the
//      hero and the browse grid so the hero stays uncluttered.
//   3. Browse grid with category + sort filters (search has been
//      promoted to the hero so it doesn't appear here twice).
//
// State for the search query lives at the page level so the hero
// dropdown and the grid stay in sync — typing in the hero also
// narrows the grid below.

type SortKey = "recent" | "popular" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Newest",
  popular: "Most clones",
  name: "A → Z",
};

// How many rows the hero search dropdown shows at most. Eight keeps
// the popover within roughly a viewport-half on mobile while still
// offering enough variety for a typical search.
const HERO_DROPDOWN_LIMIT = 8;

// How many of the top-cloned templates feed the spotlight carousel.
// Five gives a strong "best of" feel without paginating offscreen.
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
    out = [...out].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  return out;
}

// Returns matching templates for the hero dropdown. Identical needle
// logic to `applyFilters` so the dropdown and the grid agree about
// what "matches" means for a given query.
function heroMatches(
  templates: ApiTemplateItem[],
  q: string,
): ApiTemplateItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return templates
    .filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        (t.description ?? "").toLowerCase().includes(needle) ||
        t.author.toLowerCase().includes(needle),
    )
    .slice(0, HERO_DROPDOWN_LIMIT);
}

// Hero search: a wide input with an autocomplete dropdown that
// renders below it whenever the visitor has typed something AND
// there's at least one matching template. Click-outside, Escape,
// and a row click all dismiss the popover.
function HeroSearch({
  value,
  onChange,
  templates,
}: {
  value: string;
  onChange: (v: string) => void;
  templates: ApiTemplateItem[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const matches = useMemo(() => heroMatches(templates, value), [templates, value]);
  const showDropdown = open && value.trim().length > 0;

  // Click-outside dismissal. Bound only while open so we're not
  // listening on every render.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search templates by name, description, or author"
          aria-label="Search templates"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className="pl-12 pr-10 h-12 sm:h-14 text-base rounded-xl"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-secondary hover:text-foreground hover:bg-surface-raised"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-2 rounded-xl border border-border bg-surface shadow-xl overflow-hidden"
        >
          <div className="px-3 pt-2.5 pb-1 text-[11px] uppercase tracking-wider text-secondary">
            {matches.length === 0
              ? "No matches"
              : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
          </div>
          {matches.length > 0 && (
            <ul className="max-h-[26rem] overflow-y-auto py-1">
              {matches.map((t) => {
                const img = t.screenshotUrl ?? t.coverImageUrl;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/${t.author}/${t.slug}`}
                      onClick={() => setOpen(false)}
                      role="option"
                      aria-label={`Open ${t.name} by ${t.author}`}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-surface-raised focus:bg-surface-raised outline-none"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-raised border border-border shrink-0">
                        {img ? (
                          <img
                            src={img}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-secondary font-mono text-sm">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {t.name}
                        </div>
                        <div className="text-xs text-secondary truncate">
                          by @{t.author} · {t.category ?? "Other"}
                        </div>
                      </div>
                      <span className="text-[11px] text-secondary shrink-0 hidden sm:inline">
                        {t.clones} clones
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Big-format hero card used inside the featured carousel.
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
  const featured = useMemo(
    () =>
      [...templates]
        .sort((a, b) => b.clones - a.clones)
        .slice(0, FEATURED_CAROUSEL_COUNT),
    [templates],
  );

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
            <CarouselItem key={t.id} className="basis-full md:basis-1/2">
              <FeaturedCard t={t} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

// Browse panel: featured carousel + category/sort filters + grid.
// Receives the search query from the hero so the grid stays synced.
function ExploreBrowse({
  templates,
  isLoading,
  q,
  setQ,
}: {
  templates: ApiTemplateItem[];
  isLoading: boolean;
  q: string;
  setQ: (v: string) => void;
}) {
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("recent");

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
        Filter row — search lives in the hero now, so this row only
        carries category + sort. Side-by-side via grid-cols-2 on
        mobile so they don't stack vertically.
      */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-2">
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
  const { data: templates = [], isLoading } = useTemplates();
  const [q, setQ] = useState("");
  const isAuthed = !!me?.username;

  const heroSearch = (
    <HeroSearch value={q} onChange={setQ} templates={templates} />
  );
  const browse = (
    <ExploreBrowse
      templates={templates}
      isLoading={isLoading}
      q={q}
      setQ={setQ}
    />
  );

  if (isAuthed) {
    return (
      <DashboardLayout>
        <div className="px-4 md:px-8 py-6 md:py-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Explore</h1>
            <p className="text-sm text-secondary mt-1 mb-5 max-w-2xl">
              Hand-picked starting points. Clone any template into your
              dashboard, then customise with the AI builder.
            </p>
            {heroSearch}
          </div>
          {browse}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <Shell
      title="Explore"
      intro="Hand-picked starting points. Clone any template into your dashboard, then customise with the AI builder."
      headerExtra={heroSearch}
    >
      {browse}
    </Shell>
  );
}

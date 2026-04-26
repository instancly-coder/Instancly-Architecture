import { useState } from "react";
import { Link } from "wouter";
import { Search, Compass, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplore, useMe } from "@/lib/api";
import { Shell } from "@/pages/info";
import { DashboardLayout } from "@/components/dashboard-layout";

const FRAMEWORKS = ["all", "Next.js", "Vite", "React", "Vue", "Vanilla"];
const SORTS = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "most-cloned", label: "Most cloned" },
];

function SearchField({
  q,
  onChange,
  className = "",
}: {
  q: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
      <Input
        value={q}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search projects..."
        className="pl-9 bg-surface border-border"
      />
    </div>
  );
}

// Skeleton card stand-in — same outer dimensions as the real card so
// the grid doesn't reflow when projects load in.
function ExploreSkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-4 flex-1 flex flex-col gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="mt-auto pt-2 flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

function ExploreBody({
  framework,
  setFramework,
  sort,
  setSort,
  q,
  hasActiveFilters,
  onClearFilters,
  projects,
  isLoading,
}: {
  framework: string;
  setFramework: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  q: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  projects: ReturnType<typeof useExplore>["data"];
  isLoading: boolean;
}) {
  const list = projects ?? [];
  return (
    <>
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {FRAMEWORKS.map((f) => (
          <button
            key={f}
            onClick={() => setFramework(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              framework === f
                ? "bg-primary text-primary-foreground"
                : "bg-surface border border-border text-secondary hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
        <div className="ml-auto shrink-0">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort projects"
            className="bg-surface border border-border rounded-md text-sm px-3 py-1.5 text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExploreSkeletonCard key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/60 p-10 text-center">
          <Compass className="w-8 h-8 text-secondary/70 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">
            {hasActiveFilters ? "No projects match those filters" : "Nothing to explore yet"}
          </h3>
          <p className="text-sm text-secondary max-w-md mx-auto">
            {hasActiveFilters
              ? "Try a different framework, clear the search, or switch sort order."
              : "Public projects will show up here as builders ship them. Check back soon."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="mt-4 inline-flex items-center text-xs font-mono text-primary hover:underline"
            >
              Reset filters →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((project) => {
            const features = (project.features ?? []).slice(0, 3);
            return (
              <Link
                key={project.id}
                href={`/${project.author}/${project.slug}`}
                aria-label={`Open ${project.name} by ${project.author}`}
                className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-background relative overflow-hidden">
                  {project.coverImageUrl ? (
                    <img
                      src={project.coverImageUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-raised">
                      <div className="w-16 h-16 rounded-2xl bg-border flex items-center justify-center text-secondary font-mono text-3xl">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase shadow-lg">
                    {project.framework}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div>
                    <h3 className="font-medium mb-1 group-hover:text-primary transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-secondary line-clamp-2">
                      {project.description || "—"}
                    </p>
                  </div>
                  {features.length > 0 && (
                    <ul className="space-y-1 mt-1">
                      {features.map((f) => (
                        <li
                          key={f}
                          className="text-[11px] text-secondary flex gap-1.5 items-start"
                        >
                          <CheckCircle2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-secondary">
                    <span className="font-mono">@{project.author}</span>
                    <span className="font-mono">{project.clones} clones</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function Explore() {
  const [framework, setFramework] = useState("all");
  const [sort, setSort] = useState("trending");
  const [q, setQ] = useState("");

  const { data: projects = [], isLoading } = useExplore({ q, framework, sort });
  // `useMe` 401s for logged-out visitors and resolves with the user
  // when signed in. We pick the dashboard chrome only once we have a
  // confirmed session — while it's loading we render the public Shell
  // so first paint matches what an anonymous visitor would see (no
  // sidebar flash for the common public-traffic case).
  const { data: me } = useMe();
  const isAuthed = !!me?.username;

  const hasActiveFilters =
    !!q.trim() || framework !== "all" || sort !== "trending";
  const clearFilters = () => {
    setQ("");
    setFramework("all");
    setSort("trending");
  };

  // Signed-in: dashboard sidebar + header consistent with Projects /
  // Library / Billing. The page heading lives inside the main column
  // so we don't double up titles with the sidebar chrome.
  if (isAuthed) {
    return (
      <DashboardLayout>
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <div className="text-xs uppercase tracking-wider text-secondary mb-1">
                Explore
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">Explore Projects</h1>
              <p className="text-sm text-secondary mt-1 max-w-2xl">
                Browse what builders are shipping on DeployBro right now. Clone
                any project to start your own remix.
              </p>
            </div>
            <SearchField q={q} onChange={setQ} className="w-full md:w-72" />
          </div>
          <ExploreBody
            framework={framework}
            setFramework={setFramework}
            sort={sort}
            setSort={setSort}
            q={q}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            projects={projects}
            isLoading={isLoading}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Public / logged-out: keep the marketing Shell so the page still
  // shows the marketing nav + footer for SEO and signup conversion.
  return (
    <Shell
      eyebrow="Explore"
      title="Explore Projects"
      intro="Browse what builders are shipping on DeployBro right now. Clone any project to start your own remix."
      headerActions={<SearchField q={q} onChange={setQ} className="w-full md:w-72" />}
    >
      <ExploreBody
        framework={framework}
        setFramework={setFramework}
        sort={sort}
        setSort={setSort}
        q={q}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        projects={projects}
        isLoading={isLoading}
      />
    </Shell>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useExplore, useMe } from "@/lib/api";
import { Shell } from "@/pages/info";
import { DashboardLayout } from "@/components/dashboard-layout";

const FRAMEWORKS = ["all", "Next.js", "React", "Vue", "Vanilla"];
const SORTS = [
  { value: "popular", label: "Most cloned" },
  { value: "recent", label: "Recently built" },
  { value: "alpha", label: "A → Z" },
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

function ExploreBody({
  framework,
  setFramework,
  sort,
  setSort,
  projects,
  isLoading,
}: {
  framework: string;
  setFramework: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
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
        <div className="text-secondary text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-secondary text-sm">No projects match.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((project) => (
            <Link key={project.id} href={`/${project.author}/${project.slug}`}>
              <div className="group border border-border bg-surface rounded-xl overflow-hidden hover-elevate cursor-pointer">
                <div className="h-32 bg-surface-raised border-b border-border flex items-center justify-center">
                  <div className="w-12 h-12 rounded-lg bg-border flex items-center justify-center text-secondary font-mono text-xl">
                    {project.name.charAt(0)}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold truncate mb-1">{project.name}</h3>
                  <div className="text-xs text-secondary mb-3">@{project.author}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded bg-background border border-border">
                      {project.framework}
                    </span>
                    <span className="text-secondary">{project.clones} clones</span>
                  </div>
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
  const [framework, setFramework] = useState("all");
  const [sort, setSort] = useState("popular");
  const [q, setQ] = useState("");

  const { data: projects = [], isLoading } = useExplore({ q, framework, sort });
  // `useMe` 401s for logged-out visitors and resolves with the user
  // when signed in. We pick the dashboard chrome only once we have a
  // confirmed session — while it's loading we render the public Shell
  // so first paint matches what an anonymous visitor would see (no
  // sidebar flash for the common public-traffic case).
  const { data: me } = useMe();
  const isAuthed = !!me?.username;

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
        projects={projects}
        isLoading={isLoading}
      />
    </Shell>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useExplore } from "@/lib/api";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const FRAMEWORKS = ["all", "Next.js", "React", "Vue", "Vanilla"];
const SORTS = [
  { value: "popular", label: "Most cloned" },
  { value: "recent", label: "Recently built" },
  { value: "alpha", label: "A → Z" },
];

export default function Explore() {
  const [framework, setFramework] = useState("all");
  const [sort, setSort] = useState("popular");
  const [q, setQ] = useState("");

  const { data: projects = [], isLoading } = useExplore({ q, framework, sort });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <MarketingNav />

      <main className="px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Explore Projects</h1>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects..."
              className="pl-9 bg-surface border-border"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
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
          <div className="ml-auto">
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
        ) : projects.length === 0 ? (
          <div className="text-secondary text-sm">No projects match.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.map((project) => (
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
      </main>

      <div className="mt-auto">
        <MarketingFooter />
      </div>
    </div>
  );
}

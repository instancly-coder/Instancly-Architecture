import { Link, useParams } from "wouter";
import { Copy, ExternalLink, FolderTree, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProject } from "@/lib/api";
import { toast } from "sonner";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Project() {
  const { username, slug } = useParams();
  const { data: project, isLoading, isError } = useProject(username, slug);

  const clone = () => toast.success("Project cloned to your dashboard.");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MarketingNav />
        <div className="p-8 text-secondary">Loading…</div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MarketingNav />
        <main className="p-8">
          <h1 className="text-2xl font-bold mb-2">Project not found</h1>
          <p className="text-secondary">No project at /{username}/{slug}.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <div className="border-b border-border bg-surface/50 px-4 sm:px-6 py-2 flex items-center justify-end gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="hidden sm:flex hover:bg-surface-raised">
          <ExternalLink className="w-4 h-4 mr-2" /> Open live app
        </Button>
        <Link href={`/${username}/${slug}/build`}>
          <Button variant="outline" size="sm">Open builder</Button>
        </Link>
        <Button size="sm" onClick={clone} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
          <Copy className="w-4 h-4 mr-2" /> Clone
        </Button>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="w-full lg:w-80 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-surface p-4 sm:p-6 flex flex-col overflow-y-auto">
          <h1 className="text-2xl font-bold tracking-tight mb-2">{project.name}</h1>
          <p className="text-sm text-secondary mb-6">{project.description}</p>

          <div className="space-y-4 mb-8">
            <div>
              <div className="text-xs text-secondary mb-1">Framework</div>
              <div className="text-sm font-medium">{project.framework}</div>
            </div>
            <div>
              <div className="text-xs text-secondary mb-1">Database</div>
              <div className="text-sm font-medium">Neon Serverless Postgres</div>
            </div>
            <div>
              <div className="text-xs text-secondary mb-1">Stats</div>
              <div className="text-sm font-medium">
                {project.clones} clones · {project.buildsCount} builds
              </div>
            </div>
            <div>
              <div className="text-xs text-secondary mb-1">Last built</div>
              <div className="text-sm font-medium">{timeAgo(project.lastBuildAt ?? project.lastBuiltAt)}</div>
            </div>
            <div>
              <div className="text-xs text-secondary mb-1">Owner</div>
              <Link href={`/${project.owner.username}`} className="text-sm font-medium hover:text-primary">
                @{project.owner.username}
              </Link>
            </div>
          </div>

          <div className="mt-auto hidden lg:block">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-secondary" /> Files
            </h3>
            <div className="space-y-1 font-mono text-sm">
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-surface-raised rounded text-secondary cursor-pointer">
                <FileCode2 className="w-4 h-4" /> src/app/page.tsx
              </div>
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-surface-raised rounded text-secondary cursor-pointer">
                <FileCode2 className="w-4 h-4" /> src/lib/db.ts
              </div>
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-surface-raised rounded text-secondary cursor-pointer">
                <FileCode2 className="w-4 h-4" /> package.json
              </div>
            </div>
          </div>
        </div>

        {/* Preview mockup: full width of the remaining column on desktop,
            sane fixed height on mobile so the iframe always has room. */}
        <div className="flex-1 bg-background p-3 sm:p-4 lg:p-6 flex flex-col min-h-0">
          <div className="w-full flex-1 min-h-[420px] sm:min-h-[520px] bg-surface rounded-lg shadow-2xl overflow-hidden border border-border flex flex-col">
            <div className="h-10 bg-surface-raised border-b border-border flex items-center px-3 sm:px-4 gap-2 shrink-0">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-foreground/20"></div>
                <div className="w-3 h-3 rounded-full bg-foreground/20"></div>
                <div className="w-3 h-3 rounded-full bg-foreground/20"></div>
              </div>
              <div className="mx-auto text-[10px] sm:text-xs font-mono text-secondary bg-background px-3 sm:px-12 lg:px-24 py-1 rounded border border-border truncate max-w-[70%] sm:max-w-[60%] lg:max-w-none">
                {slug}.deploybro.app
              </div>
            </div>
            <div className="flex-1 bg-background relative min-h-0">
              {/* Real preview of the project content. Same endpoint the
                  builder iframe uses, so what visitors see here matches
                  exactly what the owner sees in the dev preview. */}
              <iframe
                src={`/api/preview/${encodeURIComponent(String(username))}/${encodeURIComponent(String(slug))}/`}
                title={`${project.name} preview`}
                sandbox="allow-scripts allow-same-origin"
                className="absolute inset-0 w-full h-full border-0 bg-background"
              />
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

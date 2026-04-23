import { Link, useParams } from "wouter";
import { Copy, ExternalLink, ChevronRight, FolderTree, FileCode2 } from "lucide-react";
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

      <div className="border-b border-border bg-surface/50 px-4 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center text-sm font-mono text-secondary min-w-0">
          <Link href={`/${username}`} className="hover:text-foreground transition-colors truncate">
            {username}
          </Link>
          <ChevronRight className="w-4 h-4 mx-1 shrink-0" />
          <span className="text-foreground truncate">{slug}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
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
      </div>

      <main className="flex-1 flex flex-col md:flex-row">
        <div className="w-full md:w-80 border-r border-border bg-surface p-6 flex flex-col shrink-0 overflow-y-auto">
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

          <div className="mt-auto">
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

        <div className="flex-1 bg-black flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-4xl h-full max-h-[800px] bg-white rounded-lg shadow-2xl overflow-hidden border border-border flex flex-col">
            <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              </div>
              <div className="mx-auto text-xs font-mono text-gray-500 bg-white px-24 py-1 rounded border border-gray-200">
                {slug}-{username}.instancly.app
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-black">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
                <p className="text-gray-500">{project.description}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

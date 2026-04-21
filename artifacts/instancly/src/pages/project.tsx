import { Link, useParams } from "wouter";
import { Copy, ExternalLink, ChevronRight, FolderTree, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/lib/mock-data";
import { toast } from "sonner";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

export default function Project() {
  const { username, slug } = useParams();
  const project = mockProjects.find(p => p.slug === slug) || mockProjects[0];

  const clone = () => {
    toast.success("Project cloned to your dashboard.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <div className="border-b border-border bg-surface/50 px-4 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center text-sm font-mono text-secondary min-w-0">
          <Link href={`/${username}`} className="hover:text-foreground transition-colors truncate">{username}</Link>
          <ChevronRight className="w-4 h-4 mx-1 shrink-0" />
          <span className="text-foreground truncate">{slug}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:flex hover:bg-surface-raised">
            <ExternalLink className="w-4 h-4 mr-2" /> Open live app
          </Button>
          <Button size="sm" onClick={clone} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            <Copy className="w-4 h-4 mr-2" /> Clone
          </Button>
        </div>
      </div>

      <main className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar info */}
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
              <div className="text-sm font-medium">{project.clones} clones</div>
            </div>
            <div>
              <div className="text-xs text-secondary mb-1">Deployed</div>
              <div className="text-sm font-medium">{project.lastActive}</div>
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

        {/* Live Preview */}
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
                <h2 className="text-2xl font-bold mb-2">Live App Preview</h2>
                <p className="text-gray-500">This is where the user's generated Next.js app renders.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
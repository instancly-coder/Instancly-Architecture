import { Link } from "wouter";
import { useState, type FormEvent } from "react";
import { Plus, MoreVertical, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  useMe,
  useMyProjects,
  useCreateProject,
  useRenameProject,
  useDeleteProject,
  type ApiProjectListItem,
} from "@/lib/api";
import { useLocation } from "wouter";
import { toast } from "sonner";

const PROJECT_TEMPLATES: Array<{ label: string; prompt: string }> = [
  { label: "Landing page", prompt: "A modern marketing landing page for " },
  { label: "SaaS dashboard", prompt: "A SaaS dashboard with charts and tables for " },
  { label: "E-commerce store", prompt: "An online store that sells " },
  { label: "Internal tool", prompt: "An internal admin tool that lets the team " },
  { label: "Blog", prompt: "A blog about " },
];

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

export default function Dashboard() {
  const { data: me } = useMe();
  const { data: projects = [], isLoading } = useMyProjects();
  const createProject = useCreateProject();
  const [, navigate] = useLocation();

  const balance = me?.balance ?? 0;
  const hasLowBalance = balance < 20.0;

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const openNewDialog = () => {
    setNewName("");
    setNewPrompt("");
    setNewOpen(true);
  };

  const handleCreate = async (e?: FormEvent) => {
    e?.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast.error("Give your project a name");
      return;
    }
    try {
      const created = await createProject.mutateAsync({ name });
      toast.success("Project created");
      setNewOpen(false);
      // The API echoes back the owner — fall back to that if `me` hasn't
      // hydrated yet (e.g. first visit after a fresh dev-bypass).
      const owner = me?.username ?? created.ownerUsername;
      const initialPrompt = newPrompt.trim();
      const target = `/${owner}/${created.slug}/build${
        initialPrompt
          ? `?prompt=${encodeURIComponent(initialPrompt)}`
          : ""
      }`;
      navigate(target);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create project");
    }
  };

  return (
    <DashboardLayout>
      {hasLowBalance && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 text-amber-500 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Your balance is running low (£{balance.toFixed(2)}). Top up to ensure continuous service.
            </span>
          </div>
          <Link href="/dashboard/billing">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 w-fit"
            >
              Top up
            </Button>
          </Link>
        </div>
      )}

      <header className="px-4 md:px-8 py-5 md:h-20 md:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
          Hey, {me?.username ?? "..."}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="px-3 py-1.5 rounded-full bg-surface border border-border text-sm font-mono font-medium hover:bg-surface-raised transition-colors"
          >
            £{balance.toFixed(2)}
          </Link>
          <Button
            onClick={openNewDialog}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            data-testid="button-new-project"
          >
            <Plus className="w-4 h-4 mr-2" /> New project
          </Button>
        </div>
      </header>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create a new project</DialogTitle>
            <DialogDescription>
              Give it a name and (optionally) a one-line idea. We'll spin up a
              fresh database branch and drop you straight into the builder.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-project-name">Project name</Label>
              <Input
                id="new-project-name"
                autoFocus
                placeholder="e.g. recipe-vault"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                data-testid="input-new-project-name"
              />
              <p className="text-[11px] text-secondary">
                Letters, numbers, dashes. We'll slug-ify it for the URL.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-project-prompt">
                What should it do? <span className="text-secondary font-normal">(optional)</span>
              </Label>
              <Textarea
                id="new-project-prompt"
                placeholder="A recipe site where I can save meals and rate them…"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                rows={3}
                className="resize-none"
                data-testid="input-new-project-prompt"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PROJECT_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setNewPrompt(t.prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-surface hover:bg-surface-raised text-secondary hover:text-foreground transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewOpen(false)}
                disabled={createProject.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProject.isPending || !newName.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                data-testid="button-create-project"
              >
                {createProject.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create project
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="p-4 md:p-8">
        {isLoading ? (
          <div className="text-secondary text-sm">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-1">No projects yet</h3>
            <p className="text-secondary text-sm mb-5 max-w-sm mx-auto">
              Spin up your first app. Tell the AI what you want, watch it build,
              then publish to a real URL.
            </p>
            <Button
              onClick={openNewDialog}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Plus className="w-4 h-4 mr-2" /> New project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} ownerUsername={me?.username ?? ""} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ProjectCard({ project, ownerUsername }: { project: ApiProjectListItem; ownerUsername: string }) {
  const rename = useRenameProject();
  const remove = useDeleteProject();

  const handleRename = async () => {
    const next = window.prompt("New name?", project.name);
    if (!next || next.trim() === project.name) return;
    try {
      await rename.mutateAsync({ slug: project.slug, name: next.trim() });
      toast.success("Renamed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(project.slug);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="group relative border border-border bg-surface rounded-xl overflow-hidden hover-elevate transition-all duration-200">
      <Link
        href={`/${ownerUsername}/${project.slug}/build`}
        className="absolute inset-0 z-10"
      />

      <div className="h-32 bg-gradient-to-br from-surface-raised to-background border-b border-border flex items-center justify-center p-4">
        <div className="w-full h-full rounded border border-border/50 bg-background/50 flex flex-col px-4 py-3">
          <div className="w-1/2 h-2 bg-border/50 rounded mb-2"></div>
          <div className="w-3/4 h-2 bg-border/50 rounded mb-1"></div>
          <div className="w-2/3 h-2 bg-border/50 rounded mb-4"></div>
          <div className="mt-auto self-end w-8 h-8 rounded bg-border/50"></div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold truncate pr-2">{project.name}</h3>
          <div className="flex items-center gap-2 relative z-20">
            <div
              className={`status-dot ${
                project.status === "live"
                  ? ""
                  : project.status === "error"
                  ? "red"
                  : "amber"
              }`}
              title={project.status}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-surface-raised rounded text-secondary hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-surface-raised border-border"
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleRename();
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  className="text-error focus:text-error cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="text-xs font-mono text-secondary mb-4 truncate">
          {project.slug}
        </div>

        <div className="flex items-center justify-between text-xs text-secondary">
          <div className="flex items-center gap-2">
            <span>{project.framework}</span>
            <span>•</span>
            <span>{project.buildsCount} builds</span>
          </div>
          <span>{timeAgo(project.lastBuiltAt)}</span>
        </div>
      </div>
    </div>
  );
}

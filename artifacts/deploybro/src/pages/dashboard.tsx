import { Link } from "wouter";
import { useState } from "react";
import { Plus, MoreVertical, AlertTriangle, Loader2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import {
  useMe,
  useMyProjects,
  useCreateProject,
  useRenameProject,
  useDeleteProject,
  useUpdateProject,
  type ApiProjectListItem,
} from "@/lib/api";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { randomProjectName } from "@/lib/random-name";

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

  // One-tap create: skip the modal, mint a project with an
  // auto-numbered "Untitled project N" name (the server slug-suffixes
  // for URL uniqueness anyway), and drop the user straight into the
  // builder. The builder's own chat is the right place to describe the
  // app — making them fill in a separate name + prompt form first was
  // an extra hop that didn't earn its keep. Users can rename from the
  // project card menu.
  const handleNewProject = async () => {
    if (createProject.isPending) return;
    try {
      const created = await createProject.mutateAsync({
        name: randomProjectName(),
      });
      // The API echoes back the owner — fall back to that if `me`
      // hasn't hydrated yet (e.g. first visit after a fresh dev-bypass).
      const owner = me?.username ?? created.ownerUsername;
      navigate(`/${owner}/${created.slug}/build`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create project",
      );
    }
  };

  return (
    <DashboardLayout>
      {hasLowBalance && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 text-amber-500 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Your balance is running low (${balance.toFixed(2)}). Top up to ensure continuous service.
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
            ${balance.toFixed(2)}
          </Link>
          <Button
            onClick={handleNewProject}
            disabled={createProject.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            data-testid="button-new-project"
          >
            {createProject.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" /> New project
              </>
            )}
          </Button>
        </div>
      </header>

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
              onClick={handleNewProject}
              disabled={createProject.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> New project
                </>
              )}
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
  // Visibility toggle uses the same PATCH endpoint as the builder Settings
  // pane — sending only `{ isPublic }` leaves every other field untouched.
  const update = useUpdateProject(ownerUsername, project.slug);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const handleDeleteConfirmed = async () => {
    try {
      await remove.mutateAsync(project.slug);
      toast.success("Project deleted");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const qc = useQueryClient();
  const handleToggleVisibility = async () => {
    if (!ownerUsername) return;
    const next = !project.isPublic;
    // Optimistic patch: flip the badge instantly in the dashboard list
    // cache so the user sees feedback immediately, then roll back if the
    // server rejects.
    const listKey = ["me", "projects"] as const;
    const prev = qc.getQueryData<ApiProjectListItem[]>(listKey);
    if (prev) {
      qc.setQueryData<ApiProjectListItem[]>(
        listKey,
        prev.map((p) => (p.id === project.id ? { ...p, isPublic: next } : p)),
      );
    }
    try {
      await update.mutateAsync({ isPublic: next });
      toast.success(next ? "Project is now public" : "Project is now private");
    } catch (err) {
      if (prev) qc.setQueryData(listKey, prev);
      toast.error(err instanceof Error ? err.message : "Failed to update visibility");
    }
  };

  return (
    <div className="group relative border border-border bg-surface rounded-xl overflow-hidden hover-elevate transition-all duration-200">
      <Link
        href={`/${ownerUsername}/${project.slug}/build`}
        className="absolute inset-0 z-10"
      />

      {/* Card thumbnail: prefer the auto-captured publish screenshot, then
          a manually-set cover image, then a letter placeholder. The
          aspect-[16/10] container matches the 1280×800 viewport that
          `seed-template-screenshots.mjs` and `runPublishPipeline` use, so
          `object-cover object-top` paints the page header full-width
          without side-cropping. */}
      <div className="aspect-[16/10] bg-surface-raised border-b border-border relative overflow-hidden">
        {(project.screenshotUrl ?? project.coverImageUrl) ? (
          <img
            src={(project.screenshotUrl ?? project.coverImageUrl)!}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-raised to-background">
            <div className="w-14 h-14 rounded-2xl bg-border/60 flex items-center justify-center text-secondary font-mono text-2xl">
              {project.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
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
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={update.isPending || !ownerUsername}
                  onSelect={() => {
                    // Let the menu close naturally — the toggle is fast
                    // and any feedback comes via toast + the optimistic
                    // badge update below.
                    handleToggleVisibility();
                  }}
                  data-testid={`toggle-visibility-${project.slug}`}
                >
                  {project.isPublic ? (
                    <>
                      <Lock className="w-3.5 h-3.5 mr-2" />
                      Make private
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 mr-2" />
                      Make public
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  className="text-error focus:text-error cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    setDeleteOpen(true);
                  }}
                  data-testid={`delete-project-${project.slug}`}
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
            <span>•</span>
            <span
              className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider text-[10px] ${
                project.isPublic ? "text-primary" : "text-secondary"
              }`}
              data-testid={`visibility-badge-${project.slug}`}
            >
              {project.isPublic ? (
                <>
                  <Globe className="w-3 h-3" /> Public
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" /> Private
                </>
              )}
            </span>
          </div>
          <span>{timeAgo(project.lastBuiltAt)}</span>
        </div>
      </div>

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!remove.isPending) setDeleteOpen(o);
        }}
        projectName={project.name}
        slug={project.slug}
        hasHosting
        hasDatabase
        isPending={remove.isPending}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}

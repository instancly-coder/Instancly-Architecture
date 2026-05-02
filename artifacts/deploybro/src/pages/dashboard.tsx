import { Link, useLocation } from "wouter";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProjectCard } from "@/components/project-card";
import {
  useMe,
  useMyProjects,
  useCreateProject,
} from "@/lib/api";
import { toast } from "sonner";

import { randomProjectName } from "@/lib/random-name";

export default function Dashboard() {
  const { data: me } = useMe();
  const { data: projects = [], isLoading } = useMyProjects();
  const createProject = useCreateProject();
  const [, navigate] = useLocation();

  const balance = me?.balance ?? 0;

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
              <ProjectCard
                key={project.id}
                project={project}
                ownerUsername={me?.username ?? ""}
                isOwner
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


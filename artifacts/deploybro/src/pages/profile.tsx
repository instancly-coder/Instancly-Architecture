import { Link, useParams } from "wouter";
import { Calendar, Globe, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useUser,
  useUserProjects,
  useMe,
  useUpdateProject,
  type ApiProjectListItem,
} from "@/lib/api";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

function formatJoined(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function VisibilityToggle({
  username,
  project,
}: {
  username: string;
  project: ApiProjectListItem;
}) {
  const update = useUpdateProject(username, project.slug);
  const next = !project.isPublic;
  const label = next ? "Publish" : "Make private";
  const Icon = next ? Globe : Lock;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={update.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        update.mutate(
          { isPublic: next },
          {
            onSuccess: () =>
              toast.success(
                next
                  ? `Published ${project.name}`
                  : `Made ${project.name} private`,
              ),
            onError: (err) =>
              toast.error(
                err instanceof Error ? err.message : "Update failed",
              ),
          },
        );
      }}
    >
      {update.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Icon className="w-3.5 h-3.5" />
      )}
      {label}
    </Button>
  );
}

function ProjectCard({
  username,
  project,
  isOwner,
}: {
  username: string;
  project: ApiProjectListItem;
  isOwner: boolean;
}) {
  return (
    <div className="border border-border bg-surface rounded-xl p-5 hover-elevate h-full flex flex-col">
      <Link
        href={`/${username}/${project.slug}`}
        className="flex-1 flex flex-col"
      >
        <div className="flex items-start justify-between mb-2 gap-2">
          <h3 className="font-bold text-lg">{project.name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {isOwner && (
              <div
                className={`text-xs px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                  project.isPublic
                    ? "bg-background border border-border text-secondary"
                    : "bg-background border border-border text-secondary"
                }`}
                title={project.isPublic ? "Public" : "Private"}
              >
                {project.isPublic ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {project.isPublic ? "Public" : "Private"}
              </div>
            )}
            <div className="text-xs px-2 py-0.5 rounded bg-background border border-border">
              {project.framework}
            </div>
          </div>
        </div>
        <div className="text-sm text-secondary mb-6 flex-1">
          {project.description}
        </div>
        <div className="flex items-center justify-between text-xs text-secondary mt-auto pt-4 border-t border-border/50">
          <span>{project.clones} clones</span>
          <span>Updated {timeAgo(project.lastBuiltAt)}</span>
        </div>
      </Link>
      {isOwner && (
        <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
          <VisibilityToggle username={username} project={project} />
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { username } = useParams();
  const { data: user, isLoading, isError } = useUser(username);
  const { data: projects = [] } = useUserProjects(username);
  const { data: me } = useMe();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MarketingNav />
        <main className="max-w-5xl mx-auto p-8 text-secondary">Loading…</main>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MarketingNav />
        <main className="max-w-5xl mx-auto p-8">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-secondary">No user with the handle @{username}.</p>
        </main>
      </div>
    );
  }

  // Owner-only view: when the signed-in user is looking at their own profile
  // they should see *all* their projects (not just public ones) and be able
  // to flip each between public/private inline.
  const isOwner = !!me && me.username === user.username;
  const visibleProjects = isOwner
    ? projects
    : projects.filter((p) => p.isPublic);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <main className="max-w-5xl mx-auto p-8 w-full">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="w-full md:w-64 shrink-0">
            <div
              className="w-32 h-32 rounded-full border border-border flex items-center justify-center text-4xl font-bold mb-4 text-white shadow-lg bg-gradient-to-br from-blue-500 via-blue-900 to-black"
              aria-hidden="true"
            >
              {user.username[0].toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{user.displayName}</h1>
            <div className="text-secondary font-mono text-sm mb-4">@{user.username}</div>
            <p className="text-sm mb-6">{user.bio}</p>

            <div className="space-y-2 text-sm text-secondary">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Joined {formatJoined(user.signupDate)}
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-secondary">Public Projects</span>
                <span className="font-mono font-medium">{user.publicProjects}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Total Clones</span>
                <span className="font-mono font-medium">{user.totalClones}</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="border-b border-border pb-4 mb-6 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold">
                {isOwner ? "Your Projects" : "Public Projects"}
              </h2>
              {isOwner && (
                <span className="text-xs text-secondary">
                  Visible only to you · {projects.length} total
                </span>
              )}
            </div>

            {visibleProjects.length === 0 ? (
              <div className="text-secondary text-sm">
                {isOwner
                  ? "No projects yet. Start a new build to see it here."
                  : "No public projects yet."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    username={user.username}
                    project={project}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="mt-auto">
        <MarketingFooter />
      </div>
    </div>
  );
}

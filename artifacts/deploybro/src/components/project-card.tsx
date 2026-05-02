import { Link } from "wouter";
import { useState } from "react";
import { MoreVertical, Globe, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import {
  useRenameProject,
  useDeleteProject,
  useUpdateProject,
  type ApiProjectListItem,
} from "@/lib/api";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type Props = {
  project: ApiProjectListItem;
  ownerUsername: string;
  /**
   * When true the card behaves like a dashboard tile: the click
   * target opens the builder, and the overflow menu exposes
   * rename / visibility toggle / delete. When false (e.g. the public
   * profile of someone else) the card links to the public project
   * page and the menu is omitted entirely.
   */
  isOwner: boolean;
};

/**
 * Single source of truth for the project card UI used by both the
 * dashboard and the public profile. Keeping the visual contract in
 * one place means a redesign of either surface stays in sync, and
 * the public profile of an owner reads as another tab in the same
 * shell instead of a different product.
 */
export function ProjectCard({ project, ownerUsername, isOwner }: Props) {
  const rename = useRenameProject();
  const remove = useDeleteProject();
  const update = useUpdateProject(ownerUsername, project.slug);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const qc = useQueryClient();

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

  const handleToggleVisibility = async () => {
    if (!ownerUsername) return;
    const next = !project.isPublic;
    // Optimistic patch on both list caches that surface this row
    // (dashboard + public profile) so the badge flips instantly
    // wherever this card is mounted, then rolls back on error.
    const dashKey = ["me", "projects"] as const;
    const profileKey = ["users", ownerUsername, "projects"] as const;
    const prevDash = qc.getQueryData<ApiProjectListItem[]>(dashKey);
    const prevProfile = qc.getQueryData<ApiProjectListItem[]>(profileKey);
    const apply = (rows: ApiProjectListItem[] | undefined) =>
      rows?.map((p) => (p.id === project.id ? { ...p, isPublic: next } : p));
    if (prevDash) qc.setQueryData(dashKey, apply(prevDash));
    if (prevProfile) qc.setQueryData(profileKey, apply(prevProfile));
    try {
      await update.mutateAsync({ isPublic: next });
      toast.success(next ? "Project is now public" : "Project is now private");
    } catch (err) {
      if (prevDash) qc.setQueryData(dashKey, prevDash);
      if (prevProfile) qc.setQueryData(profileKey, prevProfile);
      toast.error(err instanceof Error ? err.message : "Failed to update visibility");
    }
  };

  // Owners get whisked into the builder for quick iteration; viewers
  // land on the public project page (read-only project profile).
  const href = isOwner
    ? `/${ownerUsername}/${project.slug}/build`
    : `/${ownerUsername}/${project.slug}`;

  return (
    <div className="group relative bg-surface-raised rounded-xl overflow-hidden hover-elevate transition-all duration-200">
      <Link href={href} className="absolute inset-0 z-10" />

      {/* Card thumbnail: prefer the auto-captured publish screenshot,
          then a manually-set cover image, then a letter placeholder.
          The aspect-[16/10] container matches the 1280×800 viewport
          that `seed-template-screenshots.mjs` and `runPublishPipeline`
          use, so `object-cover object-top` paints the page header
          full-width without side-cropping. */}
      <div className="aspect-[16/10] relative overflow-hidden">
        {(project.screenshotUrl ?? project.coverImageUrl) ? (
          <img
            src={(project.screenshotUrl ?? project.coverImageUrl)!}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
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
            {/* Project "live" dot. We key off `publishStatus` rather
                than `status` — every newly-created project defaults
                to status="live" before it has actually been deployed,
                which made the dot misleadingly green. The Vercel
                publish pipeline is the only thing that flips
                `publishStatus` to "live". */}
            <div
              className={`status-dot ${
                project.publishStatus === "live"
                  ? ""
                  : project.publishStatus === "failed"
                  ? "red"
                  : "amber"
              }`}
              title={
                project.publishStatus === "live"
                  ? "Published"
                  : project.publishStatus === "failed"
                  ? "Publish failed"
                  : project.publishStatus === "none"
                  ? "Not published yet"
                  : `Publishing… (${project.publishStatus})`
              }
            />
            {isOwner && (
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
            )}
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

      {isOwner && (
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
      )}
    </div>
  );
}

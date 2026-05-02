import { useState } from "react";
import { useParams } from "wouter";
import { Calendar, Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  useUser,
  useUserProjects,
  useMe,
} from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProjectCard } from "@/components/project-card";

function formatJoined(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}


export default function Profile() {
  const { username } = useParams();
  const { data: user, isLoading, isError } = useUser(username);
  const { data: projects = [] } = useUserProjects(username);
  const { data: me } = useMe();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8 text-secondary">Loading…</div>
      </DashboardLayout>
    );
  }

  if (isError || !user) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-8">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-secondary">No user with the handle @{username}.</p>
        </div>
      </DashboardLayout>
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
    <DashboardLayout>
      {/* Full-bleed top header — same shape as the one on the main
          /dashboard page (px-4 md:px-8, md:h-20, border-b) so the
          profile reads as another tab in the same shell, instead of
          a narrow centered card floating in the content well. The
          right side carries the canonical share URL + copy button
          for owners. */}
      <header className="px-4 md:px-8 py-5 md:h-20 md:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
            {isOwner ? "Your profile" : `${user.displayName}'s profile`}
          </h1>
          <div className="text-secondary text-xs md:text-sm font-mono truncate">
            @{user.username}
          </div>
        </div>
        {isOwner && <PublicProfileUrl username={user.username} />}
      </header>

      <div className="p-4 md:p-8 w-full">
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
                    project={project}
                    ownerUsername={user.username}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * Owner-facing chip that exposes the canonical public URL of the
 * profile so the user can share it in one click. Uses
 * `window.location.origin` so the URL stays correct on dev,
 * preview, and production domains without any env wiring.
 *
 * Click anywhere on the chip (the URL itself or the icon) copies
 * to the clipboard; the icon flips to a check for ~1.5s as
 * confirmation, with a parallel toast for users who don't catch
 * the icon swap.
 */
function PublicProfileUrl({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  // SSR-safe origin read. We only render this on the client so
  // window will exist, but guarding lets us cheaply pre-render an
  // empty href in the worst case.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/${username}`;
  // Strip the protocol for display so the chip stays scannable on
  // narrow screens (`deploybro.com/alex` instead of
  // `https://deploybro.com/alex`).
  const display = url.replace(/^https?:\/\//, "");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Profile URL copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — copy it manually instead.");
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-xs font-mono text-secondary hover:text-foreground hover:border-primary/40 transition-colors max-w-[260px] truncate"
        title={`Open ${url} in a new tab`}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{display}</span>
      </a>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy public profile URL"
        title="Copy public profile URL"
        className="w-8 h-8 rounded-md flex items-center justify-center bg-surface border border-border text-secondary hover:text-foreground hover:border-primary/40 transition-colors"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

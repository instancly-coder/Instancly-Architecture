import { useState } from "react";
import { useParams } from "wouter";
import { Globe, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useUser, useUserProjects, useMe } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProfileView } from "@/components/profile-view";

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

  const isOwner = !!me && me.username === user.username;

  return (
    <DashboardLayout>
      {/* Full-bleed top header — same shape as the one on the main
          /dashboard page (px-4 md:px-8, md:h-20, border-b) so the
          profile reads as another tab in the same shell. */}
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

      <ProfileView user={user} projects={projects} me={me} />
    </DashboardLayout>
  );
}

/**
 * Owner-facing chip that exposes the canonical public URL of the
 * profile so the user can share it in one click. Uses
 * `window.location.origin` so the URL stays correct on dev,
 * preview, and production domains without any env wiring.
 */
function PublicProfileUrl({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/${username}`;
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

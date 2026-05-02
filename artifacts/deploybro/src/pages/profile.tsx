import { useState } from "react";
import { useParams } from "wouter";
import {
  Calendar,
  Globe,
  Copy,
  Check,
  MapPin,
  Link as LinkIcon,
  Pencil,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useUser,
  useUserProjects,
  useMe,
} from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProjectCard } from "@/components/project-card";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { Button } from "@/components/ui/button";

function formatJoined(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

// Strip protocol + trailing slash for display so "https://moyin.design/"
// reads as "moyin.design". Keeps the original href intact for the link.
function displayUrl(raw: string): string {
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

// Best-effort URL builder. Users can paste either a full URL
// ("https://moyin.design") or just a host ("moyin.design"); both should
// open in a new tab. We default to https:// when no protocol is given
// and treat the field as decoration if it doesn't parse at all.
function toHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    return u.toString();
  } catch {
    return null;
  }
}

export default function Profile() {
  const { username } = useParams();
  const { data: user, isLoading, isError } = useUser(username);
  const { data: projects = [] } = useUserProjects(username);
  const { data: me } = useMe();
  const [editOpen, setEditOpen] = useState(false);

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

  // Defensive trims so legacy rows that contain just whitespace
  // don't render an empty paragraph or a placeholder icon row.
  // The server now collapses these to "" on write, but old rows
  // (or rows updated by other surfaces) may still have spaces.
  const tagline = user.tagline.trim();
  const bio = user.bio.trim();
  const location = user.location.trim();
  const websiteUrl = user.websiteUrl.trim();
  const websiteHref = toHref(websiteUrl);

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

      <div className="p-4 md:p-8 w-full">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Left sidebar — Framer-style profile card. Centered avatar,
              name, headline, bio, primary action(s), then icon rows of
              metadata and a chip cloud of skills at the bottom. */}
          <aside className="w-full md:w-72 shrink-0">
            <div
              className="w-28 h-28 mx-auto rounded-full border border-border flex items-center justify-center text-4xl font-bold mb-4 text-white shadow-lg bg-gradient-to-br from-blue-500 via-blue-900 to-black"
              aria-hidden="true"
            >
              {user.username[0].toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-center">
              {user.displayName}
            </h2>
            <div className="text-secondary font-mono text-sm text-center mb-3">
              @{user.username}
            </div>

            {tagline && (
              <p className="text-sm text-center text-secondary mb-4 leading-snug">
                {tagline}
              </p>
            )}
            {bio && (
              <p className="text-sm text-center mb-5 leading-relaxed">
                {bio}
              </p>
            )}

            {/* Primary action(s). Owner gets Edit + a quick share button;
                visitors get a single Share button so the layout stays
                identical between the two views. */}
            <div className="space-y-2 mb-6">
              {isOwner ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit profile
                </Button>
              ) : (
                <ShareProfileButton username={user.username} variant="primary" />
              )}
              {isOwner && (
                <ShareProfileButton username={user.username} variant="outline" />
              )}
            </div>

            {/* Metadata rows. Each row is suppressed when the field is
                empty so a barebones profile doesn't render a stack of
                placeholder icons. `Joined` is always present because we
                derive it from the signup date. */}
            <div className="space-y-2.5 text-sm text-secondary border-t border-border pt-5">
              {location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              )}
              {websiteUrl && (
                <div className="flex items-center gap-2 min-w-0">
                  <LinkIcon className="w-4 h-4 shrink-0" />
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-foreground hover:underline"
                    >
                      {displayUrl(websiteUrl)}
                    </a>
                  ) : (
                    <span className="truncate">{websiteUrl}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 shrink-0" />
                Joined {formatJoined(user.signupDate)}
              </div>
            </div>

            {user.skills.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full bg-surface-raised border border-border px-2.5 py-1 text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-secondary">Public Projects</span>
                <span className="font-mono font-medium">{user.publicProjects}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Total Clones</span>
                <span className="font-mono font-medium">{user.totalClones}</span>
              </div>
            </div>
          </aside>

          {/* Right column — projects grid. */}
          <div className="flex-1 min-w-0">
            <div className="border-b border-border pb-4 mb-6 flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-bold">
                {isOwner ? "Your Projects" : "Projects"}
              </h2>
              {isOwner ? (
                <span className="text-xs text-secondary">
                  Visible only to you · {projects.length} total
                </span>
              ) : (
                <span className="text-xs text-secondary">
                  {visibleProjects.length}{" "}
                  {visibleProjects.length === 1 ? "project" : "projects"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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

      {isOwner && me && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          me={me}
        />
      )}
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

/**
 * Sidebar share-profile button. Variants control whether it renders
 * as the primary CTA (visitors) or as the secondary CTA next to the
 * "Edit profile" button (owners). Copies the canonical profile URL
 * to the clipboard and shows a toast.
 */
function ShareProfileButton({
  username,
  variant,
}: {
  username: string;
  variant: "primary" | "outline";
}) {
  const onShare = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile URL copied");
    } catch {
      toast.error("Couldn't copy — copy it manually instead.");
    }
  };

  return (
    <Button
      type="button"
      variant={variant === "primary" ? "default" : "outline"}
      className="w-full"
      onClick={onShare}
    >
      <Share2 className="w-4 h-4 mr-2" />
      Share profile
    </Button>
  );
}

import { useState } from "react";
import {
  Calendar,
  MapPin,
  Link as LinkIcon,
  Pencil,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/project-card";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import type { ApiMe, ApiProjectListItem, ApiUser } from "@/lib/api";

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

// For the banner image, we only accept http(s) URLs we can actually
// resolve into an absolute URL — anything else (relative paths, junk
// strings, malformed input) collapses to the gradient placeholder.
// We deliberately do NOT auto-prefix `https://` here the way `toHref`
// does, because a malformed banner URL would otherwise render a
// broken-image icon instead of the placeholder.
function toBannerSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Shared Framer-style profile body — sidebar (avatar / name / tagline /
 * bio / Edit+Share or Share / icon-row metadata / skill chips / stats)
 * on the left, projects grid on the right.
 *
 * Used by both `/:username` (the public profile) and `/dashboard/settings`
 * (the owner's in-app profile view) so the two stay visually identical.
 * Owner-only behaviors (Edit dialog, "all projects" view, "Your Projects"
 * heading) are gated by the resolved `isOwner` flag rather than by the
 * page calling this component.
 *
 * Anything that needs to live OUTSIDE the shared layout — e.g. the
 * Account section + Danger Zone on the settings page — is rendered
 * via the `footerSlot` prop so callers can extend without forking
 * the whole layout.
 */
export function ProfileView({
  user,
  projects,
  me,
  footerSlot,
}: {
  user: ApiUser;
  projects: ApiProjectListItem[];
  me: ApiMe | undefined;
  footerSlot?: React.ReactNode;
}) {
  const [editOpen, setEditOpen] = useState(false);

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
  const bannerSrc = toBannerSrc(user.bannerUrl);

  return (
    <>
      {/* Cover banner. Renders the user's image if they've set one,
          otherwise a subtle gradient placeholder so the page still
          has the same vertical rhythm. The avatar in the sidebar
          below uses a negative top margin to overlap the banner's
          bottom edge, matching the social-profile convention. */}
      <div
        className={
          "w-full h-32 md:h-44 border-b border-border " +
          (bannerSrc
            ? "bg-cover bg-center"
            : "bg-gradient-to-r from-blue-900/40 via-blue-700/30 to-purple-900/40")
        }
        style={bannerSrc ? { backgroundImage: `url(${JSON.stringify(bannerSrc)})` } : undefined}
        role={bannerSrc ? "img" : undefined}
        aria-label={bannerSrc ? `${user.displayName} cover image` : undefined}
      />

      <div className="p-4 md:p-8 w-full">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Left sidebar — Framer-style profile card. Left-aligned
              with a small avatar at the top so the eye reads top→down
              like a personal "card" (matches framer.com/@<user>'s
              expert profile layout: small avatar, name, headline, bio,
              primary action(s), icon rows of metadata, skill chips). */}
          <aside className="w-full md:w-72 shrink-0">
            {/* `-mt-12 md:-mt-16` lifts the avatar so its top half
                overlaps the cover banner above. The thicker
                background-colored ring (border-4 border-background)
                punches the avatar out of the banner cleanly. */}
            <div
              className="w-20 h-20 -mt-12 md:-mt-16 rounded-full border-4 border-background flex items-center justify-center text-2xl font-bold mb-5 text-white shadow-lg bg-gradient-to-br from-blue-500 via-blue-900 to-black"
              aria-hidden="true"
            >
              {user.username[0].toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {user.displayName}
            </h2>
            <div className="text-secondary font-mono text-sm mb-3">
              @{user.username}
            </div>

            {tagline && (
              <p className="text-sm text-secondary mb-4 leading-snug">
                {tagline}
              </p>
            )}
            {bio && (
              <p className="text-sm mb-5 leading-relaxed">
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
            {/* NOTE: stats (Public Projects / Total Clones) intentionally
                not rendered here — Framer's layout doesn't surface them
                in the sidebar, and the project grid header already shows
                a project count. Stats are still on the API response so
                other surfaces (e.g. /admin/users) can use them. */}
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

            {footerSlot}
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
    </>
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

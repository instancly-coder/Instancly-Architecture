import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProfileView } from "@/components/profile-view";
import { useMe, useUser, useUserProjects } from "@/lib/api";
import { authClient, authConfigured } from "@/auth";

/**
 * In-app profile/settings page (`/dashboard/settings`).
 *
 * Visually identical to the public profile at `/:username` — the same
 * Framer-style sidebar (avatar, name, tagline, bio, Edit/Share, icon-
 * row metadata, skill chips, stats) and projects grid — so the user
 * has a single mental model for "my profile".
 *
 * Account-only bits that don't belong on the public page (read-only
 * email + Danger Zone) are tucked underneath the projects grid via
 * `<ProfileView footerSlot=...>`.
 */
export default function SettingsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  // Reuse the `/users/:username` query so the data shape exactly
  // matches the public profile page — this is what makes the layouts
  // truly "identical" (same avatar/handle/stats source of truth).
  const { data: user, isLoading: userLoading } = useUser(me?.username);
  const { data: projects = [] } = useUserProjects(me?.username);

  const deleteAccount = async () => {
    if (
      !confirm(
        "Are you sure? This permanently deletes your account and all projects.",
      )
    )
      return;
    try {
      const res = await fetch("/api/me", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Backend cleanup failed (${res.status})`);
      }
      if (authConfigured && authClient) {
        // The backend account row is already gone; sign the user out of
        // the hosted auth instance so the next visit lands them at
        // /login. We intentionally don't try to delete the upstream
        // Better Auth user here — that's a separate admin-API concern.
        await authClient.signOut().catch(() => {});
      }
      toast.success("Account deleted.");
      window.location.href = "/";
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete account.",
      );
    }
  };

  if (meLoading || userLoading || !user || !me) {
    return (
      <DashboardLayout>
        <header className="px-4 md:px-8 py-5 md:h-20 md:py-0 flex items-center border-b border-border">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">
            Your profile
          </h1>
        </header>
        <div className="p-4 md:p-8 flex items-center gap-2 text-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header mirrors the public profile header so the two pages
          read as the same view, just with different tabs around it. */}
      <header className="px-4 md:px-8 py-5 md:h-20 md:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate">
            Your profile
          </h1>
          <div className="text-secondary text-xs md:text-sm font-mono truncate">
            @{user.username}
          </div>
        </div>
      </header>

      <ProfileView
        user={user}
        projects={projects}
        me={me}
        footerSlot={
          <div className="mt-12 pt-8 border-t border-border space-y-8">
            <section>
              <h2 className="text-lg font-bold mb-1">Account</h2>
              <p className="text-sm text-secondary mb-5">
                Sign-in details tied to your account. These aren't shown on
                your public profile.
              </p>
              <div className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="acc-username" className="text-secondary">
                    Username
                  </Label>
                  <Input
                    id="acc-username"
                    value={user.username}
                    readOnly
                    disabled
                    className="bg-surface border-border text-muted-foreground font-mono"
                  />
                  <p className="text-xs text-secondary">
                    Username cannot be changed.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acc-email" className="text-secondary">
                    Email Address
                  </Label>
                  <Input
                    id="acc-email"
                    type="email"
                    value={me.email}
                    readOnly
                    disabled
                    className="bg-surface border-border text-muted-foreground"
                  />
                  <p className="text-xs text-secondary">
                    {authConfigured
                      ? "Email is managed by your sign-in provider."
                      : "Email is locked in dev mode."}
                  </p>
                </div>
              </div>
            </section>

            <section className="border border-error/30 rounded-xl p-5 md:p-6 bg-error/5 max-w-md">
              <h2 className="text-error font-bold flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Danger Zone
              </h2>
              <p className="text-sm text-secondary mb-4">
                Permanently delete your account and all associated projects.
                This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={deleteAccount}
                className="bg-error text-white hover:bg-error/90 font-medium"
              >
                Delete Account
              </Button>
            </section>
          </div>
        }
      />
    </DashboardLayout>
  );
}

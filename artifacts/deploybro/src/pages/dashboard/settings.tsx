import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useMe, useUpdateMe } from "@/lib/api";
import { authClient, authConfigured } from "@/auth";

export default function SettingsPage() {
  const { data: user, isLoading } = useMe();
  const update = useUpdateMe();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({ displayName, bio });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  const deleteAccount = async () => {
    if (!confirm("Are you sure? This permanently deletes your account and all projects.")) return;
    try {
      const res = await fetch("/api/me", { method: "DELETE", credentials: "include" });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Backend cleanup failed (${res.status})`);
      }
      if (authConfigured && authClient) {
        // The backend account row is already gone; sign the user out of the
        // hosted auth instance so the next visit lands them at /login. We
        // intentionally don't try to delete the upstream Better Auth user
        // here — that's a separate admin-API concern.
        await authClient.signOut().catch(() => {});
      }
      toast.success("Account deleted.");
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-6 md:mb-8">
          Account Settings
        </h1>

        {isLoading ? (
          <div className="flex items-center gap-2 text-secondary text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : (
          <form onSubmit={save} className="space-y-6 mb-12">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-secondary">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-surface border-border max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-secondary">Bio</Label>
              <Input
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short description for your profile"
                className="bg-surface border-border max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-secondary">Username</Label>
              <Input
                id="username"
                value={user?.username ?? ""}
                readOnly
                disabled
                className="bg-surface border-border text-muted-foreground max-w-md font-mono"
              />
              <p className="text-xs text-secondary">Username cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-secondary">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email ?? ""}
                readOnly
                disabled
                className="bg-surface border-border text-muted-foreground max-w-md"
              />
              <p className="text-xs text-secondary">
                {authConfigured
                  ? "Email is managed by your sign-in provider."
                  : "Email is locked in dev mode."}
              </p>
            </div>

            <Button
              type="submit"
              disabled={update.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {update.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        )}

        <div className="border border-error/30 rounded-xl p-5 md:p-6 bg-error/5">
          <h2 className="text-error font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h2>
          <p className="text-sm text-secondary mb-4">
            Permanently delete your account and all associated projects. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={deleteAccount}
            className="bg-error text-white hover:bg-error/90 font-medium"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

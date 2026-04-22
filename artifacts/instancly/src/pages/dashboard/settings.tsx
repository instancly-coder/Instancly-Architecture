import { AlertTriangle } from "lucide-react";
import { mockUser } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";

export default function SettingsPage() {
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Settings saved successfully.");
  };

  const deleteAccount = () => {
    toast.error("Account deletion requested.");
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-6 md:mb-8">
          Account Settings
        </h1>

        <form onSubmit={save} className="space-y-6 mb-12">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-secondary">Display Name</Label>
            <Input id="displayName" defaultValue={mockUser.displayName} className="bg-surface border-border max-w-md" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-secondary">Username</Label>
            <Input id="username" defaultValue={mockUser.username} readOnly disabled className="bg-surface border-border text-muted-foreground max-w-md font-mono" />
            <p className="text-xs text-secondary">Username cannot be changed.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-secondary">Email Address</Label>
            <Input id="email" type="email" defaultValue={mockUser.email} readOnly disabled className="bg-surface border-border text-muted-foreground max-w-md" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-secondary">New Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className="bg-surface border-border max-w-md" />
          </div>

          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Changes
          </Button>
        </form>

        <div className="border border-error/30 rounded-xl p-5 md:p-6 bg-error/5">
          <h2 className="text-error font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h2>
          <p className="text-sm text-secondary mb-4">
            Permanently delete your account and all associated projects. This action cannot be undone.
          </p>
          <Button variant="destructive" onClick={deleteAccount} className="bg-error text-white hover:bg-error/90 font-medium">
            Delete Account
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

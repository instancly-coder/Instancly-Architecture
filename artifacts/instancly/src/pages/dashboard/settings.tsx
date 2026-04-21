import { Link } from "wouter";
import { Flame, LayoutDashboard, CreditCard, Settings, LogOut, Code, AlertTriangle } from "lucide-react";
import { mockUser } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsPage() {
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Settings saved successfully.");
  };

  const deleteAccount = () => {
    toast.error("Account deletion requested.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 border-r border-border bg-surface flex flex-col fixed inset-y-0 left-0">
        <div className="h-14 border-b border-border flex items-center px-6 gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80">
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-bold tracking-tight">instancly</span>
          </Link>
        </div>
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <LayoutDashboard className="w-4 h-4" /> Projects
            </Link>
            <Link href="/explore" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <Code className="w-4 h-4" /> Explore
            </Link>
            <Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
              <CreditCard className="w-4 h-4" /> Billing
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md bg-primary/10 text-primary">
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-8">Account Settings</h1>

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

        <div className="border border-error/30 rounded-xl p-6 bg-error/5">
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
      </main>
    </div>
  );
}
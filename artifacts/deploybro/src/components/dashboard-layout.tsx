import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Code,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Coins,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "./brand-logo";
import { useMe } from "@/lib/api";
import { authClient, authConfigured } from "@/auth";

const NAV = [
  { href: "/dashboard", label: "Projects", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Code },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/earnings", label: "Earnings", icon: Coins },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const initial = (me?.displayName?.[0] ?? me?.username?.[0] ?? "?").toUpperCase();
  const displayName = me?.displayName ?? "—";
  const username = me?.username ?? "loading";

  const signOut = async () => {
    if (authConfigured && authClient) {
      await authClient.signOut().catch(() => {});
    }
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-30 bg-surface border-b border-border flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandLogo className="h-5 w-auto text-foreground" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-6 gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo className="h-5 w-auto text-foreground" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-secondary hover:text-foreground hover:bg-surface-raised"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-surface-raised transition-colors text-left">
                <div className="w-8 h-8 rounded bg-border flex items-center justify-center font-bold text-sm">
                  {initial}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-medium truncate">{displayName}</div>
                  <div className="text-xs text-secondary truncate">@{username}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-surface-raised border-border"
            >
              <div className="px-2 py-1.5 text-sm font-medium">Account</div>
              <DropdownMenuSeparator className="bg-border" />
              <Link href={`/${username}`}>
                <DropdownMenuItem className="text-secondary hover:text-foreground cursor-pointer">
                  View public profile
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem
                className="text-error focus:text-error cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  signOut();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen pt-14 md:pt-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

import { type ReactNode } from "react";
import { Link } from "wouter";
import { BrandLogo } from "./brand-logo";
import { useIsAdmin } from "@/lib/api";
import { ShieldOff } from "lucide-react";

export function AdminLayout({ active, children }: { active: "overview" | "users" | "models" | "revenue"; children: ReactNode }) {
  const { data, isLoading } = useIsAdmin();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-surface h-14 flex items-center px-6 sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 mr-8">
          <BrandLogo className="h-5 w-auto text-foreground" />
          <span className="font-bold tracking-tight text-secondary">/ admin</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <NavLink href="/admin" label="Overview" active={active === "overview"} />
          <NavLink href="/admin/users" label="Users" active={active === "users"} />
          <NavLink href="/admin/models" label="Models" active={active === "models"} />
          <NavLink href="/admin/revenue" label="Revenue" active={active === "revenue"} />
        </div>
      </nav>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-secondary text-sm">
          Loading…
        </div>
      ) : !data?.isAdmin ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <ShieldOff className="w-10 h-10 text-secondary" />
          <h2 className="text-lg font-bold">Admin access required</h2>
          <p className="text-secondary text-sm max-w-md">
            You don't have permission to view this page.
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={active ? "text-primary font-medium" : "text-secondary hover:text-foreground"}
    >
      {label}
    </Link>
  );
}

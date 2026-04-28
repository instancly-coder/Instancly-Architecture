import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "wouter";
import {
  X,
  Search,
  Home,
  LayoutGrid,
  Star,
  Clock,
  Folder,
  BookOpen,
  Tag,
  Building2,
  Briefcase,
  Newspaper,
  Activity,
  ChevronDown,
  ExternalLink,
  LogOut,
  CreditCard,
  Coins,
  Settings as SettingsIcon,
  User as UserIcon,
} from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { useMe } from "@/lib/api";
import { authClient, authConfigured } from "@/auth";

type MobileUserMenuContextValue = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const MobileUserMenuContext = createContext<MobileUserMenuContextValue | null>(null);

export function useMobileUserMenu() {
  const ctx = useContext(MobileUserMenuContext);
  if (!ctx) {
    throw new Error("useMobileUserMenu must be used within MobileUserMenuProvider");
  }
  return ctx;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  external?: boolean;
};

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard", label: "Projects", icon: LayoutGrid },
  { href: "/explore", label: "Explore", icon: Star },
  { href: "/templates", label: "Templates", icon: Clock },
];

const SECONDARY: NavItem[] = [
  { href: "/explore", label: "Shared with you", icon: Folder },
  { href: "/how-it-works", label: "Docs & Help center", icon: BookOpen },
];

const TERTIARY: NavItem[] = [
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/about", label: "About", icon: Building2 },
  { href: "/careers", label: "Careers", icon: Briefcase },
  { href: "/changelog", label: "Changelog", icon: Newspaper },
  { href: "/status", label: "Status", icon: Activity },
];

function MobileUserDrawer({ onClose }: { onClose: () => void }) {
  const [location, navigate] = useLocation();
  const { data: me } = useMe();
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");

  const displayName = me?.displayName || me?.username || "Guest";
  const email = me?.email ?? "";
  const username = me?.username ?? "";
  const plan = me?.plan ?? "Free";
  const initial = (displayName[0] ?? "?").toUpperCase();

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return location === "/dashboard";
    return location === href || location.startsWith(`${href}/`);
  };

  const signOut = async () => {
    if (authConfigured && authClient) {
      await authClient.signOut().catch(() => {});
    }
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/";
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navigate(`/explore?q=${encodeURIComponent(q)}`);
    onClose();
  };

  return (
    <>
      <div
        className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="md:hidden fixed inset-y-0 left-0 z-[70] w-[88vw] max-w-[360px] bg-surface text-foreground border-r border-border flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="User menu"
      >
        {/* Top bar: logo + close */}
        <div className="h-14 flex items-center justify-between px-5 shrink-0">
          <Link
            href={me ? "/dashboard" : "/"}
            onClick={onClose}
            className="flex items-center"
            aria-label="DeployBro"
          >
            <BrandLogo className="h-5 w-auto text-foreground" />
          </Link>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 shrink-0">
          <form onSubmit={onSearchSubmit} className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-raised border border-border text-sm placeholder:text-secondary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </form>
        </div>

        {/* Account chip */}
        {me ? (
          <div className="px-4 pb-3 shrink-0">
            <button
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-raised border border-border hover:border-primary/30 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-md bg-border flex items-center justify-center text-xs font-bold shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{email || displayName}</div>
              </div>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                  plan.toLowerCase() === "free"
                    ? "border-border text-secondary bg-surface"
                    : "border-primary/40 text-primary bg-primary/10"
                }`}
              >
                {plan}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-secondary shrink-0 transition-transform ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {accountOpen && (
              <div className="mt-2 ml-1 border-l border-border pl-3 py-1 space-y-0.5">
                <Link
                  href={`/${username}`}
                  onClick={onClose}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                >
                  <UserIcon className="w-4 h-4" />
                  View public profile
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={onClose}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Billing
                </Link>
                <Link
                  href="/dashboard/earnings"
                  onClick={onClose}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                >
                  <Coins className="w-4 h-4" />
                  Earnings
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={onClose}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    onClose();
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-error hover:bg-error/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 pb-3 shrink-0">
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Log in / Sign up
            </Link>
          </div>
        )}

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <NavSection items={PRIMARY} location={location} isActive={isActive} onClose={onClose} />
          <Divider />
          <NavSection items={SECONDARY} location={location} isActive={isActive} onClose={onClose} />
          <Divider />
          <NavSection items={TERTIARY} location={location} isActive={isActive} onClose={onClose} />
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between shrink-0">
          {me ? (
            <Link
              href={`/${username}`}
              onClick={onClose}
              aria-label="Profile"
              className="w-9 h-9 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <UserIcon className="w-4 h-4" />
            </Link>
          ) : (
            <span className="w-9 h-9" aria-hidden />
          )}
          <div className="text-xs text-secondary font-mono">
            DeployBro
          </div>
        </div>
      </aside>
    </>
  );
}

function Divider() {
  return <div className="my-2 h-px bg-border mx-2" aria-hidden />;
}

function NavSection({
  items,
  location: _loc,
  isActive,
  onClose,
}: {
  items: NavItem[];
  location: string;
  isActive: (href: string) => boolean;
  onClose: () => void;
}) {
  return (
    <nav className="space-y-0.5 py-1">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={`${item.label}-${idx}`}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-[15px] font-medium transition-colors ${
              active
                ? "bg-surface-raised text-foreground"
                : "text-secondary hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.external && <ExternalLink className="w-3.5 h-3.5 text-secondary/70" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileUserMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  // Auto-close on route change so the drawer never lingers when nav happens.
  useEffect(() => {
    setOpen(false);
  }, [location]);

  // Auto-close when viewport crosses to md+ — the drawer is mobile-only
  // (`md:hidden`) so without this it would become invisible while still
  // mounted, leaving body scroll locked with no way to close it.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    if (mql.matches) setOpen(false);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<MobileUserMenuContextValue>(
    () => ({
      open,
      openMenu: () => setOpen(true),
      closeMenu: () => setOpen(false),
    }),
    [open],
  );

  const close = useCallback(() => setOpen(false), []);

  return (
    <MobileUserMenuContext.Provider value={value}>
      {children}
      {open && <MobileUserDrawer onClose={close} />}
    </MobileUserMenuContext.Provider>
  );
}

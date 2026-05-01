import { Link, useLocation } from "wouter";
import { Menu } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/api";
import { useMobileUserMenu } from "./mobile-user-menu";

const NAV_LINKS = [
  { label: "Skills", href: "/skills" },
  { label: "Pricing", href: "/pricing" },
];

export function MarketingNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const { openMenu } = useMobileUserMenu();
  const isHome = location === "/";
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location]);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const navClass = isHome && atTop
    ? "bg-transparent"
    : atTop
      ? "bg-surface"
      : "bg-surface/80 backdrop-blur-md border-b border-border";

  return (
    <nav className={`sticky top-0 z-50 h-14 flex items-center justify-between px-6 transition-all duration-300 ${navClass}`}>
      <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="DeployBro">
        <BrandLogo className="h-5 w-auto text-foreground" />
      </Link>

      <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={`transition-colors ${
              isActive(l.href) ? "text-foreground font-medium" : "hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {me ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        ) : (
          <>
            <Link
              href="/login"
              className="text-sm font-medium hover:text-foreground text-secondary transition-colors hidden sm:block"
            >
              Log in
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Link href="/login">Start building</Link>
            </Button>
          </>
        )}
        <button
          onClick={() => {
            // Logged-in users get the rich global drawer; logged-out users get
            // the small inline dropdown with marketing links + login.
            if (me) {
              openMenu();
            } else {
              setOpen((v) => !v);
            }
          }}
          className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {open && !me && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-surface border-b border-border shadow-lg p-4 flex flex-col gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="px-3 py-2 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors sm:hidden"
          >
            Log in
          </Link>
        </div>
      )}
    </nav>
  );
}

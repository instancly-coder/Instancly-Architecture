import { Link, useLocation } from "wouter";
import { Box, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Templates", href: "/templates" },
  { label: "Explore", href: "/explore" },
  { label: "Docs", href: "/docs" },
];

export function MarketingNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return false;
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-6">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Box className="w-5 h-5 text-primary" />
        <span className="font-bold text-lg tracking-tight">instancly</span>
      </Link>

      <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
        {NAV_LINKS.map((l) =>
          l.href.startsWith("/#") || l.href === "#" ? (
            <a
              key={l.label}
              href={l.href}
              className="hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ) : (
            <Link
              key={l.label}
              href={l.href}
              className={`transition-colors ${
                isActive(l.href) ? "text-foreground font-medium" : "hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          )
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/login"
          className="text-sm font-medium hover:text-foreground text-secondary transition-colors hidden sm:block"
        >
          Log in
        </Link>
        <Link href="/login">
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            Start building
          </Button>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-surface border-b border-border shadow-lg p-4 flex flex-col gap-1">
          {NAV_LINKS.map((l) =>
            l.href.startsWith("/#") || l.href === "#" ? (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                {l.label}
              </Link>
            )
          )}
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

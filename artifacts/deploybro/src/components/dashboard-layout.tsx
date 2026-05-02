import { type ReactNode } from "react";
import { Link } from "wouter";
import { Menu } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { DesktopSideNav } from "./mobile-user-menu";
// Import the hook from the dedicated context module (not from
// `mobile-user-menu`) so HMR edits to the nav components can't
// invalidate the Context identity this layout depends on.
import { useMobileUserMenu } from "./mobile-user-menu-context";

/**
 * Shell for every signed-in dashboard route.
 *
 * The sidebar content (logo, search, account chip, full nav, sign-out)
 * lives in a single shared `SideNavContent` component inside
 * `mobile-user-menu.tsx`. We render it two ways here:
 *   - Persistent left rail on md+ via `<DesktopSideNav />`.
 *   - Slide-in drawer on mobile, opened by the hamburger in this
 *     header and rendered by `MobileUserMenuProvider` (mounted near
 *     the app root). Same component, same data, no drift.
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { openMenu } = useMobileUserMenu();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile-only top bar: logo + hamburger to open the shared drawer. */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-30 bg-surface border-b border-border flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandLogo className="h-5 w-auto text-foreground" />
        </Link>
        <button
          onClick={openMenu}
          className="w-9 h-9 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Persistent desktop sidebar — shares its body with the mobile drawer. */}
      <DesktopSideNav />

      {/* Main content. md:ml-72 reserves space for the desktop sidebar
          (matches the `w-72` on DesktopSideNav). pt-14 on mobile clears
          the fixed header. */}
      <main className="flex-1 md:ml-72 min-h-screen pt-14 md:pt-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

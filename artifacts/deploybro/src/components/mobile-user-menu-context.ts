import { createContext, useContext } from "react";

/**
 * Context shape for the shared mobile drawer / desktop sidebar nav.
 *
 * Lives in its own non-component module on purpose: React Fast
 * Refresh treats any file that exports React components as a
 * "refresh boundary", which means an HMR edit to that file produces
 * a brand-new module instance — and a brand-new `Context` object
 * with it. Consumers (like `DashboardLayout`) that imported the
 * context from the old module instance would then see `null` from
 * `useContext`, throwing the misleading
 * "useMobileUserMenu must be used within MobileUserMenuProvider"
 * runtime error even though the provider is correctly mounted in
 * the tree.
 *
 * Keeping the context + hook in this JSX-free module guarantees a
 * single stable identity for the Context across HMR updates of the
 * surrounding component files.
 */
export type MobileUserMenuContextValue = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

export const MobileUserMenuContext =
  createContext<MobileUserMenuContextValue | null>(null);

export function useMobileUserMenu(): MobileUserMenuContextValue {
  const ctx = useContext(MobileUserMenuContext);
  if (!ctx) {
    throw new Error(
      "useMobileUserMenu must be used within MobileUserMenuProvider",
    );
  }
  return ctx;
}

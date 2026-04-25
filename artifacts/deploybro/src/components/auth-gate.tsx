import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { authClient, authConfigured } from "@/auth";

/**
 * Wrap any page that requires the user to be signed in.
 * If auth is not configured at all (no Neon Auth base URL), the gate is
 * bypassed and we let the existing dev fallback (`demo`) take over server-side.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  if (!authConfigured) return <>{children}</>;
  return <AuthGateInner>{children}</AuthGateInner>;
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const session = authClient!.useSession();
  const [, navigate] = useLocation();

  const user = session.data?.user ?? null;
  const pending = session.isPending;

  // The Better Auth React client caches the session result in a global
  // nanostore. If the very first read on page load returned null (which
  // is the common case on a fresh tab before any OAuth has happened),
  // the cache stays null until something invalidates it. After /handler
  // calls `authClient.getSession()` to refresh the store, we should see
  // the user — but if for any reason the store is still null when we
  // mount (race / stale cache), do ONE explicit refetch before deciding
  // the user really is signed out.
  const [refreshed, setRefreshed] = useState(false);
  const triedRefresh = useRef(false);

  useEffect(() => {
    if (pending) return;
    if (user) return;
    if (triedRefresh.current) return;
    triedRefresh.current = true;
    let cancelled = false;
    (async () => {
      try {
        await authClient!.getSession();
      } catch {}
      if (!cancelled) setRefreshed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pending, user]);

  useEffect(() => {
    if (pending) return;
    // Wait for our one-shot refetch to complete before deciding the user
    // is unauthenticated — otherwise we race the nanostore and bounce a
    // genuinely-signed-in user back to /login.
    if (!user && !refreshed) return;

    if (!user) {
      try {
        sessionStorage.setItem(
          "deploybro:after-login",
          window.location.pathname,
        );
      } catch {}
      navigate("/login");
      return;
    }

    // Honour any "go here after login" target the homepage or login
    // page stashed before we arrived. Always clear the key on read
    // (one-shot) so a stale value can't bounce a future gated route
    // mount to the wrong place. Only navigate when the target differs
    // from the current path so we don't loop on it.
    try {
      const target = sessionStorage.getItem("deploybro:after-login");
      if (target) {
        sessionStorage.removeItem("deploybro:after-login");
        if (target !== window.location.pathname) navigate(target);
      }
    } catch {}
  }, [pending, user, refreshed, navigate]);

  if (pending || (!user && !refreshed)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}

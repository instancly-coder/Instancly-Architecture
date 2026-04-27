import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authClient, authConfigured } from "@/auth";
import type { ApiMe } from "@/lib/api";

// Routes that ARE part of the post-signup flow. The onboarding-redirect
// effect below skips these so we don't create a redirect loop on the
// pages whose whole purpose is to finish onboarding.
const PRE_ONBOARDING_PATHS = new Set(["/onboarding", "/signup/username"]);

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

  // ---- Onboarding gate ----
  // Once auth is confirmed, fetch the Me row to check whether the user
  // has completed the post-signup onboarding flow. The query is keyed
  // identically to the rest of the app's `useMe` so both share a single
  // react-query cache entry — no double-fetching. We deliberately do
  // not gate-block on this query loading (we only redirect on a
  // confirmed null `onboardedAt`) so a slow /me response doesn't add a
  // perceptible loading screen on top of every gated page mount.
  const meQuery = useQuery<ApiMe>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`me ${res.status}`);
      return (await res.json()) as ApiMe;
    },
    enabled: !!user,
    retry: 1,
  });

  useEffect(() => {
    if (!user) return;
    const me = meQuery.data;
    if (!me) return;
    if (me.onboardedAt) return;
    // /signup/username and /onboarding are themselves part of the
    // post-signup flow — staying out of their way here is what
    // prevents the redirect loop. We deliberately do NOT additionally
    // gate on the username being "real" because there is no clean
    // server-side signal for that (auth derives a username from the
    // OAuth claim on first login, so something is always set), and
    // simple `startsWith("user")` heuristics would skip onboarding for
    // legitimate users like `userland` / `user42`.
    const path = window.location.pathname;
    if (PRE_ONBOARDING_PATHS.has(path)) return;
    navigate("/onboarding");
  }, [user, meQuery.data, navigate]);

  if (pending || (!user && !refreshed)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  // ---- Fail-closed onboarding gate ----
  // Pages in PRE_ONBOARDING_PATHS render their own me-loading UX, so we
  // let them through unconditionally. For every OTHER gated page we
  // refuse to render children until /me resolves and confirms the user
  // has onboarded — otherwise a transient /me failure would silently
  // bypass onboarding (the redirect effect can only run once it has
  // data). On error we surface a retry instead of either spinning
  // forever or quietly rendering the protected page.
  const path = window.location.pathname;
  const isPreOnboarding = PRE_ONBOARDING_PATHS.has(path);
  if (!isPreOnboarding) {
    if (meQuery.isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
          Loading your account…
        </div>
      );
    }
    if (meQuery.isError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-secondary text-sm">
          <span>Couldn't load your account.</span>
          <button
            type="button"
            onClick={() => meQuery.refetch()}
            className="h-8 px-3 rounded-md border border-border text-foreground text-xs hover:bg-muted/40"
          >
            Try again
          </button>
        </div>
      );
    }
    // Hold the page until the redirect effect has had a chance to fire
    // for un-onboarded users — prevents a one-frame flash of the gated
    // page before navigation.
    if (!meQuery.data?.onboardedAt) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
          Loading…
        </div>
      );
    }
  }

  return <>{children}</>;
}

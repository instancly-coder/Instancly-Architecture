import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { AuthCallback } from "@neondatabase/neon-js/auth/react/ui";
import { authConfigured, fetchAuthJwt } from "@/auth";

/**
 * Lands here after Better Auth's hosted OAuth callback redirects back to
 * us. We delegate session-restoration timing to the SDK's official
 * `<AuthCallback>` component (which waits for `useIsRestoring` to settle
 * via the `NeonAuthUIProvider` context, then redirects to `redirectTo`).
 *
 * On top of that we push a fresh JWT to our backend cookie so the next
 * gated route's first /api/me call doesn't 401 against the API server's
 * JOSE verifier.
 */
function popStashedTargetOnce(): string {
  try {
    const t = sessionStorage.getItem("deploybro:after-login");
    if (t) {
      sessionStorage.removeItem("deploybro:after-login");
      return t;
    }
  } catch {}
  return "/dashboard";
}

export default function Handler() {
  const [, navigate] = useLocation();

  // Pop the stash exactly once on first render and stick the result in a
  // ref. If React re-renders this component (e.g. AuthCallback's restore
  // state flips), we MUST NOT re-read sessionStorage — it's already been
  // cleared and we'd silently fall back to "/dashboard" instead of the
  // user's intended destination.
  const targetRef = useRef<string | null>(null);
  if (targetRef.current === null) {
    targetRef.current = popStashedTargetOnce();
  }
  const target = targetRef.current;

  // Fire-and-forget: push the JWT to our backend cookie. AuthCallback
  // will navigate as soon as it's restored; this runs in parallel.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // A short delay gives Better Auth a beat to commit the session
      // cookie before we ask `/token` for the JWT.
      for (let i = 0; i < 6 && !cancelled; i++) {
        const token = await fetchAuthJwt();
        if (cancelled) return;
        if (token) {
          await fetch("/api/auth/session", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => {});
          return;
        }
        await new Promise((r) => setTimeout(r, 250 + i * 250));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!authConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary">
        Authentication is not configured.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="flex items-center gap-3 text-sm text-secondary mb-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Finishing sign in…</span>
      </div>
      {/* The SDK's official OAuth-return component. It waits for the
          session to be restored via the AuthUIContext, then navigates to
          `redirectTo` using the `navigate` function we wired into
          NeonAuthUIProvider. */}
      <AuthCallback redirectTo={target} />
      <noscript>
        <button
          type="button"
          onClick={() => navigate(target, { replace: true })}
          className="mt-4 h-8 px-3 rounded-md border border-border text-xs"
        >
          Continue
        </button>
      </noscript>
    </div>
  );
}

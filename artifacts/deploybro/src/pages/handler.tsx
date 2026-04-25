import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { authClient, authConfigured, fetchAuthJwt } from "@/auth";

/**
 * Lands here after Better Auth's hosted OAuth callback redirects back to
 * us. We wait for `useSession()` to confirm the session, push a fresh JWT
 * into the backend cookie, then forward the user to the stashed after-login
 * target (homepage prompt → /build/new) or /dashboard.
 */
export default function Handler() {
  const [, navigate] = useLocation();

  if (!authConfigured) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary">
        Authentication is not configured.
      </div>
    );
  }

  return <HandlerInner navigate={navigate} />;
}

function HandlerInner({
  navigate,
}: {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}) {
  const session = authClient!.useSession();

  useEffect(() => {
    if (session.isPending) return;
    let cancelled = false;
    (async () => {
      if (!session.data?.user) {
        navigate("/login", { replace: true });
        return;
      }
      // Best-effort: sync the JWT cookie before the next gated route renders
      // so its first /api/me call doesn't 401.
      const token = await fetchAuthJwt();
      if (token) {
        await fetch("/api/auth/session", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      if (cancelled) return;

      let target = "/dashboard";
      try {
        const stashed = sessionStorage.getItem("deploybro:after-login");
        if (stashed) {
          sessionStorage.removeItem("deploybro:after-login");
          target = stashed;
        }
      } catch {}
      navigate(target, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [session.isPending, session.data?.user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="flex items-center gap-3 text-sm text-secondary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Finishing sign in…</span>
      </div>
    </div>
  );
}

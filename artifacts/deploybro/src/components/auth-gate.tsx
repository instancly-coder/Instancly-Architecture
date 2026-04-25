import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@stackframe/react";
import { stackConfigured } from "@/stack";

/**
 * Wrap any page that requires the user to be signed in.
 * If auth is not configured at all (no Stack secrets), the gate is bypassed
 * and we let the existing dev fallback (`johndoe`) take over server-side.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  if (!stackConfigured) return <>{children}</>;
  return <AuthGateInner>{children}</AuthGateInner>;
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user === null) {
      try {
        sessionStorage.setItem("deploybro:after-login", window.location.pathname);
      } catch {}
      navigate("/login");
      return;
    }
    if (user) {
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
    }
  }, [user, navigate]);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
        Loading…
      </div>
    );
  }
  if (user === null) return null;
  return <>{children}</>;
}

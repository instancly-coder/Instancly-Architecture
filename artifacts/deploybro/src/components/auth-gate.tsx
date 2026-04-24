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

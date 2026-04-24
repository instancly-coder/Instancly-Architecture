import { useEffect } from "react";
import { useUser } from "@stackframe/react";
import { stackConfigured } from "@/stack";

/**
 * Whenever the Stack user changes, push the current access token to the
 * backend so it can set/refresh the `auth_token` cookie for cross-domain
 * requests. Mounted globally inside <App />.
 */
export function SessionSync() {
  if (!stackConfigured) return null;
  return <SessionSyncInner />;
}

function SessionSyncInner() {
  const user = useUser();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" }).catch(() => {});
        return;
      }
      try {
        const tokens = await user.getAuthJson();
        const token = tokens?.accessToken;
        if (cancelled || !token) return;
        await fetch("/api/auth/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch {
        // ignore — backend will treat as anonymous
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}

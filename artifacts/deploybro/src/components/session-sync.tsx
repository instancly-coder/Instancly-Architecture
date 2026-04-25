import { useEffect } from "react";
import { authClient, authConfigured, fetchAuthJwt } from "@/auth";

/**
 * Whenever the Better Auth session changes, push a fresh JWT to the backend
 * so it can set/refresh the `auth_token` cookie that our JOSE-based JWT
 * verifier reads on every API request. Mounted globally inside <App />.
 *
 * Better Auth's JWTs are short-lived (default 15 min), so we also refresh
 * the cookie every 10 minutes while the tab is open.
 */
export function SessionSync() {
  if (!authConfigured) return null;
  return <SessionSyncInner />;
}

const REFRESH_MS = 10 * 60 * 1000;

function SessionSyncInner() {
  const session = authClient!.useSession();
  const userId = session.data?.user?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const pushJwt = async () => {
      if (!userId) {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        return;
      }
      const token = await fetchAuthJwt();
      if (cancelled || !token) return;
      await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {
        // ignore — backend will treat as anonymous on next request
      });
    };

    void pushJwt();
    const interval = userId ? setInterval(pushJwt, REFRESH_MS) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [userId]);

  return null;
}

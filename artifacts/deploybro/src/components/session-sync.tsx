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

    // When `/token` (or the subsequent /api/auth/session POST) fails on a
    // fresh push, retry once shortly after — the most common cause is a
    // race against Better Auth still finalising the session cookie on the
    // auth server's domain right after the OAuth callback. Without this,
    // the next ~10 minutes of API calls would silently 401 until the
    // periodic refresh fires.
    const pushJwt = async (attempt = 0): Promise<void> => {
      if (!userId) {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        return;
      }
      const token = await fetchAuthJwt();
      if (cancelled) return;
      if (!token) {
        if (attempt < 2) {
          window.setTimeout(() => {
            if (!cancelled) void pushJwt(attempt + 1);
          }, 800 * (attempt + 1));
        }
        return;
      }
      const res = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => null);
      if (cancelled) return;
      if (!res || !res.ok) {
        if (attempt < 2) {
          window.setTimeout(() => {
            if (!cancelled) void pushJwt(attempt + 1);
          }, 800 * (attempt + 1));
        }
      }
    };

    void pushJwt();
    const interval = userId
      ? window.setInterval(() => {
          void pushJwt();
        }, REFRESH_MS)
      : null;
    return () => {
      cancelled = true;
      if (interval !== null) window.clearInterval(interval);
    };
  }, [userId]);

  return null;
}

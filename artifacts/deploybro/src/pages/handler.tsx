import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { authBaseURL, authClient, authConfigured, fetchAuthJwt } from "@/auth";

/**
 * Lands here after Better Auth's hosted OAuth callback redirects back to
 * us. We deliberately bypass the Better Auth React `useSession()` hook
 * here because:
 *
 *   1. Right after the OAuth redirect there's a tiny race between Neon
 *      committing its session cookie and us reading it. `useSession()`
 *      caches the first failed read for the lifetime of the page, so a
 *      single early miss bounces the user straight back to /login with
 *      no diagnostics.
 *   2. The hook swallows network/CORS errors, so when third-party-cookie
 *      restrictions or a misconfigured allow-origin causes the fetch to
 *      fail, the user just sees "redirected back to login" with no clue
 *      why.
 *
 * Instead we poll `${baseURL}/get-session` directly with credentials,
 * retry a handful of times with backoff, and on terminal failure show a
 * visible, copy-pastable diagnostic so the cause is obvious.
 */
export default function Handler() {
  const [, navigate] = useLocation();

  if (!authConfigured || !authBaseURL) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary">
        Authentication is not configured.
      </div>
    );
  }

  return <HandlerInner navigate={navigate} />;
}

type Status =
  | { kind: "loading"; attempt: number }
  | { kind: "ok" }
  | {
      kind: "error";
      reason: string;
      detail?: string;
      httpStatus?: number;
    };

const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [200, 400, 800, 1200, 1600, 2000];

function HandlerInner({
  navigate,
}: {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading", attempt: 0 });

  useEffect(() => {
    let cancelled = false;

    const popStashedTarget = (): string => {
      try {
        const t = sessionStorage.getItem("deploybro:after-login");
        if (t) {
          sessionStorage.removeItem("deploybro:after-login");
          return t;
        }
      } catch {}
      return "/dashboard";
    };

    const tryOnce = async (
      attempt: number,
    ): Promise<
      | { ok: true; userId: string }
      | { ok: false; reason: string; detail?: string; httpStatus?: number }
    > => {
      let res: Response;
      try {
        res = await fetch(`${authBaseURL}/get-session`, {
          credentials: "include",
          headers: { accept: "application/json" },
        });
      } catch (err) {
        // CORS or network failure — `fetch` only throws on these. Most
        // commonly: the auth server's CORS is missing our exact origin or
        // missing `Access-Control-Allow-Credentials: true`.
        return {
          ok: false,
          reason: "network_or_cors",
          detail:
            err instanceof Error
              ? err.message
              : "Could not reach the auth server.",
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          reason: "no_session",
          httpStatus: res.status,
        };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          ok: false,
          reason: "auth_server_error",
          detail: text.slice(0, 300),
          httpStatus: res.status,
        };
      }

      // 200 with a body. Better Auth returns `null` (or `{}`) when the
      // user has no session. Otherwise the body is `{ user, session }`.
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        return { ok: false, reason: "bad_response_json", httpStatus: 200 };
      }
      const user =
        body && typeof body === "object" && "user" in body
          ? (body as { user?: { id?: string } }).user
          : null;
      if (!user?.id) {
        return { ok: false, reason: "no_session", httpStatus: 200 };
      }
      return { ok: true, userId: user.id };
    };

    const run = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        setStatus({ kind: "loading", attempt });
        const result = await tryOnce(attempt);
        if (cancelled) return;
        if (result.ok) {
          // Push a fresh JWT into our backend cookie BEFORE we navigate
          // so the next gated route's first /api/me call doesn't 401.
          const token = await fetchAuthJwt();
          if (token) {
            await fetch("/api/auth/session", {
              method: "POST",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ token }),
            }).catch(() => {});
          }
          // Warm Better Auth's own nanostore so the next gated route's
          // `useSession()` hook resolves with our user immediately rather
          // than re-reading a stale "no session" cache from the initial
          // page load (which happened before the OAuth redirect committed
          // the session cookie). Without this, AuthGate would briefly see
          // user=null and bounce us back to /login.
          try {
            await authClient!.getSession();
          } catch {}
          if (cancelled) return;
          setStatus({ kind: "ok" });
          navigate(popStashedTarget(), { replace: true });
          return;
        }
        // Network/CORS failure — no point retrying, the next attempt will
        // hit the same wall. Surface immediately.
        if (result.reason === "network_or_cors") {
          setStatus({
            kind: "error",
            reason: result.reason,
            detail: result.detail,
          });
          return;
        }
        // 5xx from the auth server — surface immediately too.
        if (result.reason === "auth_server_error") {
          setStatus({
            kind: "error",
            reason: result.reason,
            detail: result.detail,
            httpStatus: result.httpStatus,
          });
          return;
        }
        // "No session yet" — wait and retry; this races the Set-Cookie
        // commit on the auth server's domain right after the OAuth redirect.
        await new Promise((r) =>
          setTimeout(r, BACKOFF_MS[attempt] ?? 2000),
        );
      }
      if (cancelled) return;
      setStatus({
        kind: "error",
        reason: "no_session_after_retries",
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (status.kind === "loading" || status.kind === "ok") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
        <div className="flex items-center gap-3 text-sm text-secondary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Finishing sign in…
            {status.kind === "loading" && status.attempt > 0
              ? ` (retry ${status.attempt + 1}/${MAX_ATTEMPTS})`
              : ""}
          </span>
        </div>
      </div>
    );
  }

  // Terminal error — show actionable diagnostic instead of silently
  // bouncing to /login. The user can copy this and paste it for support.
  const explain: Record<string, { title: string; hint: string }> = {
    network_or_cors: {
      title: "Couldn't reach the auth server",
      hint:
        "This is usually because your browser blocked the cross-site request. Make sure third-party cookies are enabled for this site, or that your auth provider's allowed origins include this exact URL.",
    },
    no_session_after_retries: {
      title: "Sign-in didn't complete",
      hint:
        "Your browser blocked or didn't receive the session cookie from the auth server. In Safari/iOS or with strict tracking protection on, this can happen after a cross-domain OAuth redirect.",
    },
    auth_server_error: {
      title: "The auth server returned an error",
      hint: "Try again in a moment. If it persists, contact support.",
    },
  };
  const e = explain[status.reason] ?? {
    title: "Sign-in failed",
    hint: "An unexpected error occurred. Please try again.",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">
              {e.title}
            </h1>
            <p className="text-sm text-secondary mt-1.5 leading-relaxed">
              {e.hint}
            </p>
            {(status.detail || status.httpStatus) && (
              <pre className="mt-3 text-[11px] font-mono text-secondary bg-background border border-border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {status.httpStatus ? `HTTP ${status.httpStatus}\n` : ""}
                {status.detail ?? ""}
              </pre>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Back to login
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-surface-raised transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

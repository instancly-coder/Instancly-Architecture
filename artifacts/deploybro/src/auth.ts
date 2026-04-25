import { createAuthClient } from "better-auth/react";

const rawBaseURL = (
  import.meta.env.VITE_NEON_AUTH_BASE_URL as string | undefined
)?.replace(/\/+$/, "");

const looksLikeUrl = (s: string | undefined): s is string =>
  !!s && /^https?:\/\//.test(s);

const hasValidConfig = looksLikeUrl(rawBaseURL);

export const authBaseURL = hasValidConfig ? rawBaseURL! : null;

export const authClient = hasValidConfig
  ? createAuthClient({
      baseURL: rawBaseURL!,
      fetchOptions: { credentials: "include" },
    })
  : null;

export const authConfigured = !!authClient;

if (!authConfigured && rawBaseURL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] VITE_NEON_AUTH_BASE_URL is set but doesn't look like an http(s) URL.",
  );
}

/**
 * Fetch a fresh JWT for the current Better Auth session. Neon's hosted
 * Better Auth instance exposes its JWKS at `/.well-known/jwks.json`, which
 * means the JWT plugin is enabled and `GET <baseURL>/token` returns a short-
 * lived JWT we can hand to the API server's existing JOSE verifier.
 *
 * Returns `null` when not signed in or when the auth server doesn't expose
 * the JWT plugin (404).
 */
export async function fetchAuthJwt(): Promise<string | null> {
  if (!authBaseURL) return null;
  try {
    const res = await fetch(`${authBaseURL}/token`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string };
    return typeof body.token === "string" && body.token ? body.token : null;
  } catch {
    return null;
  }
}

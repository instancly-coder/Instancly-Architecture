import { createAuthClient } from "better-auth/react";

/**
 * Normalise whatever the user pasted into `VITE_NEON_AUTH_BASE_URL` into
 * the canonical Better Auth base URL (i.e. the URL where appending
 * `/sign-in/social`, `/get-session`, `/token`, `/.well-known/jwks.json`
 * etc. yields the right endpoint).
 *
 * People reasonably copy whichever URL they have to hand from the Neon
 * Console, which is often the JWKS URL (it's the one Neon shows on the
 * Auth tab). We tolerate both by stripping known trailing endpoint
 * suffixes and any trailing slashes.
 */
function normaliseAuthBaseURL(raw: string | undefined): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!/^https?:\/\//.test(url)) return null;
  url = url.replace(/\/+$/, "");
  // Common pasted-by-mistake suffixes — strip them so the SDK ends up
  // hitting `<base>/sign-in/social` instead of `<base>/.well-known/jwks.json/sign-in/social`.
  const stripSuffixes = [
    "/.well-known/jwks.json",
    "/.well-known/openid-configuration",
    "/get-session",
    "/token",
    "/sign-in",
    "/sign-out",
  ];
  for (const suffix of stripSuffixes) {
    if (url.toLowerCase().endsWith(suffix)) {
      url = url.slice(0, -suffix.length);
      break;
    }
  }
  return url.replace(/\/+$/, "");
}

const rawEnv = import.meta.env.VITE_NEON_AUTH_BASE_URL as string | undefined;
const normalised = normaliseAuthBaseURL(rawEnv);
const hasValidConfig = !!normalised;

export const authBaseURL = normalised;

export const authClient = hasValidConfig
  ? createAuthClient({
      baseURL: normalised!,
      fetchOptions: { credentials: "include" },
    })
  : null;

export const authConfigured = !!authClient;

if (!authConfigured && rawEnv) {
  // eslint-disable-next-line no-console
  console.warn(
    "[auth] VITE_NEON_AUTH_BASE_URL is set but doesn't look like an http(s) URL.",
    { raw: rawEnv },
  );
}
if (authConfigured && rawEnv && rawEnv.replace(/\/+$/, "") !== normalised) {
  // eslint-disable-next-line no-console
  console.info(
    `[auth] Normalised VITE_NEON_AUTH_BASE_URL "${rawEnv}" → "${normalised}"`,
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

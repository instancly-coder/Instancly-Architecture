import { StackClientApp } from "@stackframe/react";

const projectId = import.meta.env.VITE_STACK_PROJECT_ID as string | undefined;
const publishableClientKey = import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY as
  | string
  | undefined;

const looksLikeUuid = (s: string | undefined) =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const hasValidConfig = looksLikeUuid(projectId) && Boolean(publishableClientKey);

let app: StackClientApp | null = null;
let initError: string | null = null;

if (hasValidConfig) {
  try {
    app = new StackClientApp({
      projectId: projectId!,
      publishableClientKey: publishableClientKey!,
      tokenStore: "cookie",
      urls: {
        signIn: "/login",
        signUp: "/login",
        afterSignIn: "/dashboard",
        afterSignUp: "/signup/username",
        afterSignOut: "/",
        handler: "/handler",
      },
    });
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("[stack-auth] init failed:", initError);
  }
} else if (projectId || publishableClientKey) {
  initError =
    "Stack Auth env vars are set but VITE_STACK_PROJECT_ID is not a valid UUID. " +
    "Get the project ID from your Neon Auth dashboard.";
  // eslint-disable-next-line no-console
  console.warn("[stack-auth]", initError);
}

export const stackApp = app;
export const stackConfigured = !!app;
export const stackInitError = initError;

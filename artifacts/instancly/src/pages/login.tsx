import { Link, useLocation } from "wouter";
import { useState } from "react";
import logoUrl from "@assets/download_1776989236348.png";
import { stackApp, stackConfigured } from "@/stack";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Provider = "google" | "apple" | "github";

export default function Login() {
  const [, setLocation] = useLocation();
  const [busy, setBusy] = useState<Provider | null>(null);

  const handleClick = async (provider: Provider) => {
    if (provider === "apple") {
      // Temporary dev bypass while we wire up real Apple sign-in.
      setBusy("apple");
      setLocation("/dashboard");
      return;
    }

    if (!stackConfigured || !stackApp) {
      toast.message("Sign-in isn't configured yet — using the dev bypass.");
      setLocation("/dashboard");
      return;
    }

    try {
      setBusy(provider);
      await stackApp.signInWithOAuth(provider);
    } catch (err) {
      setBusy(null);
      toast.error(err instanceof Error ? err.message : `Failed to sign in with ${provider}.`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8 hover:opacity-80 transition-opacity" aria-label="DeployBro home">
        <img src={logoUrl} alt="DeployBro" className="h-8 w-auto" />
      </Link>

      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">
          Log in to DeployBro
        </h1>
        <p className="text-sm text-secondary text-center mb-6">
          Continue with your favourite account.
        </p>

        <div className="space-y-3">
          <ProviderButton
            provider="google"
            label="Continue with Google"
            busy={busy === "google"}
            onClick={() => handleClick("google")}
            icon={<GoogleIcon />}
          />
          <ProviderButton
            provider="apple"
            label="Continue with Apple"
            busy={busy === "apple"}
            onClick={() => handleClick("apple")}
            icon={<AppleIcon />}
          />
          <ProviderButton
            provider="github"
            label="Continue with GitHub"
            busy={busy === "github"}
            onClick={() => handleClick("github")}
            icon={<GitHubIcon />}
          />
        </div>

        <p className="text-xs text-secondary text-center mt-6">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function ProviderButton({
  label,
  busy,
  onClick,
  icon,
}: {
  provider: Provider;
  label: string;
  busy: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-md border border-border bg-background hover:bg-surface-raised transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-4 h-4 inline-flex items-center justify-center">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.5-1.74 4.4-5.5 4.4-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.86 3.62 14.66 2.7 12 2.7 6.92 2.7 2.8 6.82 2.8 11.9S6.92 21.1 12 21.1c6.93 0 9.2-4.86 9.2-7.4 0-.5-.06-.88-.13-1.26H12z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.22-1.18 3-.78.81-2.04 1.44-3.06 1.36-.13-1.1.42-2.25 1.16-3.04.83-.86 2.21-1.5 3.08-1.32zM20.5 17.18c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.39 3.5-4.13 3.51-1.55.02-1.95-1.01-4.06-1-2.11.01-2.55 1.02-4.1 1.01-1.74-.02-3.06-1.78-4.05-3.34C-.07 16.85-.39 11.66 1.34 8.95 2.57 7.02 4.51 5.9 6.34 5.9c1.86 0 3.03 1.02 4.57 1.02 1.49 0 2.4-1.02 4.55-1.02 1.62 0 3.34.88 4.57 2.41-4.02 2.2-3.37 7.95.47 8.87z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.05c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
    </svg>
  );
}

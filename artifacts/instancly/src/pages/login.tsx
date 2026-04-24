import { Link, useLocation } from "wouter";
import { SignIn } from "@stackframe/react";
import logoUrl from "@assets/download_1776989236348.png";
import { stackConfigured } from "@/stack";

export default function Login() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8 hover:opacity-80 transition-opacity" aria-label="Instancly home">
        <img src={logoUrl} alt="Instancly" className="h-8 w-auto" />
      </Link>

      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-center mb-6">Log in to Instancly</h1>

        {stackConfigured ? (
          <SignIn fullPage={false} />
        ) : (
          <div className="text-sm text-secondary text-center space-y-3">
            <p>Authentication is not yet configured.</p>
            <button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="text-primary hover:underline"
            >
              Continue to the demo dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

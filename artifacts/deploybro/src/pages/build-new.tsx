import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import logoUrl from "@assets/download_1776989236348.png";
import { useCreateProject, useMe } from "@/lib/api";
import { randomProjectName } from "@/lib/random-name";
import { toast } from "sonner";

const PROMPT_KEY = "deploybro:initial-prompt";
// Cap how long we'll wait for `useMe` to recover from a transient 401
// (auth cookie still being set by SessionSync) before giving up and
// bouncing the user to the dashboard. Keeps us from hanging forever on
// genuinely-broken sessions.
const ME_ERROR_RETRY_BUDGET = 2;

function nameFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return randomProjectName();
  const firstSentence = cleaned.split(/[.!?\n]/)[0] ?? cleaned;
  const words = firstSentence.split(" ").slice(0, 6).join(" ");
  const trimmed = (words || cleaned.slice(0, 50)).slice(0, 50).trim();
  return trimmed || randomProjectName();
}

export default function BuildNew() {
  const [, navigate] = useLocation();
  const me = useMe();
  const createProject = useCreateProject();
  // Strict Mode mounts effects twice in development; a `useRef` guard
  // alone isn't enough because the ref resets on remount. We instead
  // *atomically claim* the prompt by removing it from sessionStorage
  // BEFORE calling the mutation. The second mount sees an empty key
  // and bails. We also keep a local ref so a single mount can't fire
  // the mutation twice (e.g. if React batches rerenders).
  const startedRef = useRef(false);
  // Keep showing the splash through a couple of transient `useMe` 401s
  // (the cookie that SessionSync sets after Better Auth sign-in lands a
  // moment later than the gate's first /api/me hit). Only bounce to
  // /dashboard if the error keeps repeating after a couple of retries.
  const [errorAttempts, setErrorAttempts] = useState(0);

  useEffect(() => {
    if (!me.isError) {
      if (errorAttempts !== 0) setErrorAttempts(0);
      return;
    }
    if (errorAttempts >= ME_ERROR_RETRY_BUDGET) return;
    const t = setTimeout(() => {
      setErrorAttempts((n) => n + 1);
      void me.refetch?.();
    }, 600);
    return () => clearTimeout(t);
  }, [me, errorAttempts]);

  useEffect(() => {
    if (startedRef.current) return;

    // Wait for `useMe` to resolve before deciding what to do. While it
    // is loading or transiently failing we keep showing the splash;
    // only after we've exhausted our retry budget do we give up and
    // bounce to the dashboard.
    if (me.isLoading) return;
    if (me.isError) {
      if (errorAttempts < ME_ERROR_RETRY_BUDGET) return;
      navigate("/dashboard");
      return;
    }
    if (!me.data?.username) {
      navigate("/dashboard");
      return;
    }

    let prompt = "";
    try {
      prompt = sessionStorage.getItem(PROMPT_KEY) ?? "";
      // Atomic claim: remove the key now so a Strict-Mode re-fire
      // (or a tab refresh while the mutation is in flight) can't see
      // the same prompt and create a duplicate project.
      if (prompt.trim()) sessionStorage.removeItem(PROMPT_KEY);
    } catch {
      prompt = "";
    }

    if (!prompt.trim()) {
      navigate("/dashboard");
      return;
    }

    startedRef.current = true;
    const ownerUsername = me.data.username;

    createProject.mutate(
      { name: nameFromPrompt(prompt), description: prompt.slice(0, 280) },
      {
        onSuccess: (proj) => {
          // The builder reads `?prompt=` and sessionStorage settings on
          // mount, then auto-fires handleSend. We re-stash the prompt
          // (we cleared it during the atomic claim above) so the
          // builder's existing rehydration path works unchanged; it
          // clears the key after consuming it.
          try { sessionStorage.setItem(PROMPT_KEY, prompt); } catch {}
          const username = proj.ownerUsername || ownerUsername;
          navigate(
            `/${username}/${proj.slug}/build?prompt=${encodeURIComponent(prompt)}`,
            { replace: true },
          );
        },
        onError: (err) => {
          // Put the prompt back so the user can try again from the
          // dashboard or homepage instead of losing their typing.
          try { sessionStorage.setItem(PROMPT_KEY, prompt); } catch {}
          toast.error(
            err instanceof Error
              ? err.message
              : "Couldn't create your project. Please try again.",
          );
          navigate("/dashboard");
        },
      },
    );
  }, [me.isLoading, me.isError, me.data?.username, errorAttempts, createProject, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <img src={logoUrl} alt="DeployBro" className="h-8 w-auto mb-8 opacity-90" />
      <div className="flex items-center gap-3 text-sm text-secondary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Spinning up your project…</span>
      </div>
    </div>
  );
}

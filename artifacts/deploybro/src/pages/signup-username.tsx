import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoUrl from "@assets/download_1776989236348.png";
import { useMe, useUpdateMe } from "@/lib/api";
import { toast } from "sonner";

const RESERVED = ["admin", "api", "www", "dashboard", "explore", "settings", "billing", "support", "deploybro", "help", "handler", "login", "signup"];

export default function SignupUsername() {
  const [, setLocation] = useLocation();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [message, setMessage] = useState("");

  // If the user already has a real (non-default) username, skip this step
  useEffect(() => {
    if (me?.username && !/^[a-z0-9]{6,}$/.test(me.username) === false && me.username !== "" && !me.username.startsWith("user")) {
      // already has a custom-looking username; jump to dashboard
      setLocation("/dashboard");
    }
  }, [me, setLocation]);

  useEffect(() => {
    if (!username) {
      setStatus("idle");
      setMessage("");
      return;
    }
    const val = username.toLowerCase();
    if (val.length < 3) return setBoth("invalid", "Username must be at least 3 characters.");
    if (val.length > 20) return setBoth("invalid", "Username must be less than 20 characters.");
    if (!/^[a-z]/.test(val)) return setBoth("invalid", "Must start with a letter.");
    if (val.endsWith("-")) return setBoth("invalid", "Cannot end with a hyphen.");
    if (!/^[a-z0-9-]+$/.test(val)) return setBoth("invalid", "Only lowercase letters, numbers, and hyphens allowed.");
    if (RESERVED.includes(val)) return setBoth("invalid", "This username is reserved.");
    setBoth("valid", "Looks good");

    function setBoth(s: "valid" | "invalid", m: string) {
      setStatus(s);
      setMessage(m);
    }
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "valid") return;
    try {
      await update.mutateAsync({ username });
      setLocation("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to claim username.";
      toast.error(msg);
      setStatus("invalid");
      setMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-32 p-6">
      <Link href="/" className="mb-12 hover:opacity-80 transition-opacity" aria-label="DeployBro home">
        <img src={logoUrl} alt="DeployBro" className="h-8 w-auto" />
      </Link>

      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-center mb-2">Claim your username</h1>
        <p className="text-secondary text-center mb-10">This will be your URL for all deployed apps.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-2xl text-secondary font-mono">@</span>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="pl-12 h-16 text-2xl font-mono bg-surface border-border focus-visible:ring-primary/50"
                placeholder="username"
                autoFocus
              />
              <div className="absolute right-4">
                {status === "valid" && <CheckCircle2 className="w-6 h-6 text-success" />}
                {status === "invalid" && <XCircle className="w-6 h-6 text-error" />}
              </div>
            </div>
            <div className="mt-2 h-6 flex items-center px-1 text-sm font-medium">
              {status === "valid" && <span className="text-success">{message}</span>}
              {status === "invalid" && <span className="text-error">{message}</span>}
            </div>
          </div>

          <Button
            type="submit"
            disabled={status !== "valid" || update.isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-12 text-lg"
          >
            {update.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}

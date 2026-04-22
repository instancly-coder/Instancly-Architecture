import { useState, useEffect } from "react";
import { BoxLogo } from "@/components/box-logo";
import { Link, useLocation } from "wouter";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const RESERVED = ["admin", "api", "www", "dashboard", "explore", "settings", "billing", "support", "instancly", "help"];

export default function SignupUsername() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!username) {
      setStatus("idle");
      setMessage("");
      return;
    }

    const val = username.toLowerCase();
    
    if (val.length < 3) {
      setStatus("invalid");
      setMessage("Username must be at least 3 characters.");
      return;
    }
    if (val.length > 20) {
      setStatus("invalid");
      setMessage("Username must be less than 20 characters.");
      return;
    }
    if (!/^[a-z]/.test(val)) {
      setStatus("invalid");
      setMessage("Must start with a letter.");
      return;
    }
    if (val.endsWith("-")) {
      setStatus("invalid");
      setMessage("Cannot end with a hyphen.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(val)) {
      setStatus("invalid");
      setMessage("Only lowercase letters, numbers, and hyphens allowed.");
      return;
    }
    if (RESERVED.includes(val)) {
      setStatus("invalid");
      setMessage("This username is reserved.");
      return;
    }

    setStatus("valid");
    setMessage("Available");
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "valid") {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-32 p-6">
      <Link href="/" className="mb-12 hover:opacity-80 transition-opacity">
        <BoxLogo className="w-10 h-10 text-primary" />
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
            disabled={status !== "valid"}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-12 text-lg"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}

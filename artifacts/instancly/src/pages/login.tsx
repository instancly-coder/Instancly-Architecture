import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Fake toggle for demo purposes
  const [isNewUser, setIsNewUser] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser) {
      setLocation("/signup/username");
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8 hover:opacity-80 transition-opacity">
        <Flame className="w-10 h-10 text-primary" />
      </Link>
      
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-center mb-6">Log in to Instancly</h1>
        
        <div className="flex flex-col gap-3 mb-6">
          <Button variant="outline" className="w-full border-border bg-background hover:bg-surface-raised font-normal">
            <Github className="w-4 h-4 mr-2" /> Continue with GitHub
          </Button>
          <Button variant="outline" className="w-full border-border bg-background hover:bg-surface-raised font-normal">
            <GoogleIcon className="w-4 h-4 mr-2" /> Continue with Google
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface px-2 text-secondary">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-secondary">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              className="bg-background border-border"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-secondary">Password</Label>
              <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background border-border"
              required
            />
          </div>
          
          {/* Demo toggle hidden visually, click to trigger new user flow for demo */}
          <div className="pt-2 flex items-center gap-2">
            <input type="checkbox" id="demoToggle" checked={isNewUser} onChange={(e) => setIsNewUser(e.target.checked)} className="accent-primary" />
            <label htmlFor="demoToggle" className="text-xs text-secondary">Demo: Next step is Username Selection</label>
          </div>

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-10 mt-2">
            Log in
          </Button>
        </form>
        
        <p className="mt-6 text-center text-sm text-secondary">
          Don't have an account? <Link href="/login" className="text-primary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

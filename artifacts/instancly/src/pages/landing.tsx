import { Code, Database, Zap, Sparkles, Server, ArrowUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const PROMPT_SUGGESTIONS = [
  "Ecommerce",
  "SaaS",
  "Marketplace",
  "Dashboard",
  "Landing page",
  "Internal tool",
  "Mobile app",
  "Blog",
];

const ROTATING_NOUNS = [
  "side project",
  "SaaS",
  "dashboard",
  "internal tool",
  "weekend hack",
  "prototype",
  "MVP",
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [nounIndex, setNounIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNounIndex((i) => (i + 1) % ROTATING_NOUNS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  const submit = () => {
    const value = prompt.trim();
    if (value) {
      try {
        sessionStorage.setItem("instancly:initial-prompt", value);
      } catch {}
    }
    navigate("/login");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="px-6 max-w-5xl mx-auto text-center flex flex-col items-center justify-center min-h-screen -mt-14 pt-14 py-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono mb-8 border border-primary/20">
            <Sparkles className="w-3 h-3" />
            <span>Instancly v2.0 is now live</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-10 leading-[1.05]">
            <span className="block">Ship your next</span>
            <span className="block mt-2">
              <span
                key={nounIndex}
                className="inline-block text-primary animate-rotate-in"
                style={{
                  textShadow: "0 0 40px rgba(0,255,238,0.45)",
                }}
              >
                {ROTATING_NOUNS[nounIndex]}
              </span>{" "}
              <span className="text-foreground">before</span>
            </span>
            <span className="block mt-2">your coffee gets cold.</span>
          </h1>

          <div className="max-w-2xl mx-auto">
            <div className="relative rounded-xl border border-border bg-surface focus-within:border-primary/60 transition-colors shadow-2xl shadow-black/40">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Describe an app, e.g. a habit tracker with streaks and a weekly chart..."
                rows={3}
                className="w-full resize-none bg-transparent px-5 py-4 pr-14 text-base text-foreground placeholder:text-muted outline-none rounded-xl"
              />
              <button
                type="button"
                onClick={submit}
                aria-label="Generate"
                className="absolute right-3 bottom-3 h-9 w-9 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={!prompt.trim()}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="px-3 py-1.5 rounded-full text-xs text-secondary border border-border bg-surface/60 hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 border-y border-border bg-surface/30">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { text: "Instancly replaced our entire staging environment. The Neon DB integration is flawless.", author: "Sarah J., Lead Engineer" },
              { text: "I built a complete internal CRM in 45 minutes. It would have taken 2 weeks manually.", author: "Mark T., Founder" },
              { text: "The cleanest AI code output I've seen. Next.js + Tailwind + Drizzle just works.", author: "Elena R., Indie Hacker" }
            ].map((quote, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="flex text-primary">
                  {[...Array(5)].map((_, j) => <Sparkles key={j} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-secondary italic">"{quote.text}"</p>
                <p className="text-sm font-medium">{quote.author}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hero Visual - Mini Builder Component */}
        <section className="py-16 md:py-24 px-4 md:px-6 max-w-6xl mx-auto">
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-2xl">
            <div className="h-10 border-b border-border flex items-center px-3 md:px-4 gap-2 bg-surface-raised">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-border/50"></div>
                <div className="w-3 h-3 rounded-full bg-border/50"></div>
                <div className="w-3 h-3 rounded-full bg-border/50"></div>
              </div>
              <div className="mx-auto px-3 md:px-24 py-1 text-[10px] md:text-xs font-mono text-secondary bg-background rounded border border-border truncate max-w-full">
                <span className="hidden sm:inline">johndoe/crm-app • Claude Sonnet 4.5</span>
                <span className="sm:hidden">crm-app</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row h-auto md:h-[400px]">
              {/* Left Panel - Chat */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-border bg-surface p-4 flex flex-col">
                <div className="flex-1 space-y-4 font-mono text-xs text-secondary overflow-hidden relative min-h-[120px]">
                  <div className="flex gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>Planning architecture...</span>
                  </div>
                  <div className="flex gap-2">
                    <Database className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Provisioning Neon Postgres...</span>
                  </div>
                  <div className="flex gap-2">
                    <Code className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Writing src/app/page.tsx...</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface to-transparent"></div>
                </div>
                <div className="mt-4 p-2 bg-background border border-border rounded text-sm text-muted">
                  Add a dashboard view with a chart...
                </div>
              </div>
              {/* Right Panel - Preview */}
              <div className="w-full md:w-2/3 h-48 md:h-auto bg-black flex items-center justify-center p-4 md:p-8 relative">
                 <div className="w-full h-full bg-white rounded flex items-center justify-center text-black/50 font-medium border border-border text-sm md:text-base text-center px-2">
                    Live Preview Rendering...
                 </div>
                 <div className="absolute bottom-2 md:bottom-4 text-[10px] md:text-xs font-mono text-secondary/50 truncate max-w-[90%] text-center">
                    crm-app-johndoe.instancly.app
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-surface border-t border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Everything you need to ship.</h2>
              <p className="text-secondary">We abstract away the DevOps, but give you full access to the code and database when you need it.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 border border-border rounded-lg bg-background hover-elevate">
                <Server className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Instant Neon Database</h3>
                <p className="text-sm text-secondary">Every project gets a real, dedicated Serverless Postgres database via Neon. No mock data, no JSON files.</p>
              </div>
              <div className="p-6 border border-border rounded-lg bg-background hover-elevate">
                <Zap className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Choose your AI Model</h3>
                <p className="text-sm text-secondary">Switch between Claude 3.5 Sonnet, GPT-4o, and Gemini on the fly depending on your speed and intelligence needs.</p>
              </div>
              <div className="p-6 border border-border rounded-lg bg-background hover-elevate">
                <Globe className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">Live in Seconds</h3>
                <p className="text-sm text-secondary">Your app is instantly deployed to an instancly.app subdomain, ready to share with users or connect to a custom domain.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-6 text-center border-t border-border">
          <h2 className="text-4xl font-bold mb-6 tracking-tight">Ready to build?</h2>
          <p className="text-xl text-secondary mb-8 max-w-xl mx-auto">Join thousands of developers shipping faster with Instancly.</p>
          <Link href="/login">
            <Button size="lg" className="bg-primary text-primary-foreground h-14 px-10 text-lg">
              Start building for free
            </Button>
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function Globe(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
}

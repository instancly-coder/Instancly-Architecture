import { Flame, ArrowRight, Github, Code, Database, Zap, Sparkles, Server, Terminal, Lock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg tracking-tight">instancly</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-secondary">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <Link href="/explore" className="hover:text-foreground transition-colors">Explore</Link>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-foreground text-secondary transition-colors hidden sm:block">
            Log in
          </Link>
          <Link href="/login">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              Start building
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-32 pb-24 px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-mono mb-8 border border-primary/20">
            <Sparkles className="w-3 h-3" />
            <span>Instancly v2.0 is now live</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Build and deploy real<br />web apps with AI.
          </h1>
          <p className="text-xl text-secondary mb-10 max-w-2xl mx-auto">
            Real Postgres. Real URL. No DevOps. Just describe what you want, and Instancly builds a full-stack Next.js application in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base">
                Start building for free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base border-border bg-transparent hover:bg-surface-raised">
              <Terminal className="mr-2 w-4 h-4" /> Read the docs
            </Button>
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
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-2xl">
            <div className="h-10 border-b border-border flex items-center px-4 gap-2 bg-surface-raised">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-border/50"></div>
                <div className="w-3 h-3 rounded-full bg-border/50"></div>
                <div className="w-3 h-3 rounded-full bg-border/50"></div>
              </div>
              <div className="mx-auto px-24 py-1 text-xs font-mono text-secondary bg-background rounded border border-border">
                johndoe/crm-app • Claude Sonnet 4.5
              </div>
            </div>
            <div className="flex h-[400px]">
              {/* Left Panel - Chat */}
              <div className="w-1/3 border-r border-border bg-surface p-4 flex flex-col">
                <div className="flex-1 space-y-4 font-mono text-xs text-secondary overflow-hidden relative">
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
              <div className="w-2/3 bg-black flex items-center justify-center p-8 relative">
                 <div className="w-full h-full bg-white rounded flex items-center justify-center text-black/50 font-medium border border-border">
                    Live Preview Rendering...
                 </div>
                 <div className="absolute bottom-4 text-xs font-mono text-secondary/50">
                    Deployed to crm-app-johndoe.instancly.app
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

      <footer className="border-t border-border py-12 px-6 text-center bg-surface">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-primary" />
          <span className="font-bold tracking-tight">instancly</span>
        </div>
        <p className="text-sm text-secondary">© {new Date().getFullYear()} Instancly. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Globe(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
}

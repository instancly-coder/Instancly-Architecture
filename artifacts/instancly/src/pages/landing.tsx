import { Sparkles, ArrowUp, Lightbulb, Wand2, Rocket, ArrowRight } from "lucide-react";
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
  "online shop",
  "SaaS",
  "dashboard",
  "wedding site",
  "weekend hack",
  "dream app",
];

const STEPS = [
  {
    icon: Lightbulb,
    title: "Start with an idea",
    body: "Describe the app or website you want — in plain English. Got screenshots, sketches, or a Notion doc? Drop those in too.",
  },
  {
    icon: Wand2,
    title: "Watch it come to life",
    body: "See your vision become a working prototype in real-time. The AI writes the code, sets up the database, and wires it all up while you sip your coffee.",
  },
  {
    icon: Rocket,
    title: "Refine and ship",
    body: "Tweak it with simple chat feedback — \"make the button bigger\", \"add a login\". When it's right, hit publish and share it with the world.",
  },
];

const TEMPLATES = [
  { name: "Personal portfolio", desc: "Show off your work, your way", tag: "Portfolio" },
  { name: "Pitch deck slides", desc: "Code-powered presentations", tag: "Slides" },
  { name: "Architect studio site", desc: "Firm showcase & gallery", tag: "Agency" },
  { name: "Fashion blog", desc: "Minimal, playful, scrollable", tag: "Blog" },
  { name: "Event platform", desc: "Find, register, host events", tag: "Marketplace" },
  { name: "Personal blog", desc: "Muted, intimate, reader-first", tag: "Blog" },
  { name: "Lifestyle magazine", desc: "Sophisticated long-form", tag: "Editorial" },
  { name: "Ecommerce store", desc: "Premium product showcase", tag: "Shop" },
];

const STATS = [
  { value: "36M+", label: "projects built on Instancly" },
  { value: "200K+", label: "projects shipped per day" },
  { value: "300M", label: "daily visits to Instancly apps" },
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
        <section className="px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center justify-center min-h-[88vh] pt-10 pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-mono mb-8">
            <Sparkles className="w-3 h-3" />
            <span>Instancly v2.0 — now with one-click publish</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            <span className="block">Build your</span>
            <span className="block mt-2">
              <span
                key={nounIndex}
                className="inline-block text-primary animate-rotate-in"
                style={{ textShadow: "0 0 40px rgba(0,255,238,0.45)" }}
              >
                {ROTATING_NOUNS[nounIndex]}
              </span>
            </span>
            <span className="block mt-2">in the time it takes to make tea.</span>
          </h1>

          <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto mb-10">
            No code. No DevOps. No "how do I deploy this?" anxiety. Just type
            what you want and watch Instancly build it for you.
          </p>

          <div className="w-full max-w-2xl mx-auto">
            <div className="relative rounded-xl border border-border bg-surface focus-within:border-primary/60 transition-colors shadow-2xl shadow-black/10 dark:shadow-black/40">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask Instancly to create a landing page for my..."
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

        {/* How it works */}
        <section id="how" className="py-20 md:py-28 px-4 sm:px-6 border-t border-border bg-surface/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-mono mb-4">
                Meet Instancly
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Three steps. That's it.
              </h2>
              <p className="text-secondary">
                You don't need to know what a "framework" is. You just need an
                idea — we'll handle the rest.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="relative p-6 md:p-7 rounded-xl border border-border bg-background hover-elevate"
                  >
                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm shadow-lg">
                      {i + 1}
                    </div>
                    <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                    <p className="text-sm text-secondary leading-relaxed">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="py-20 md:py-28 px-4 sm:px-6 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                  Discover templates
                </h2>
                <p className="text-secondary">
                  Don't start from a blank page. Remix one of these.
                </p>
              </div>
              <Link
                href="/explore"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATES.map((t) => (
                <Link
                  key={t.name}
                  href="/login"
                  className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-surface-raised to-background relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-primary/60 text-xs font-mono uppercase tracking-wider">
                      {t.tag}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase">
                      {t.tag}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-xs text-secondary">{t.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 md:py-28 px-4 sm:px-6 border-t border-border bg-surface/40">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Instancly in numbers
            </h2>
            <p className="text-secondary mb-12 max-w-xl mx-auto">
              Millions of builders are already turning ideas into reality.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-background p-8"
                >
                  <div className="text-4xl md:text-5xl font-bold text-primary mb-2 tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-sm text-secondary">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 px-4 sm:px-6 text-center border-t border-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-mono mb-6">
            <Sparkles className="w-3 h-3" />
            AI App Builder
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Ready to build?
          </h2>
          <p className="text-lg text-secondary mb-10 max-w-xl mx-auto">
            Free to start. No credit card. No "schedule a demo" nonsense.
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 text-lg font-semibold"
            >
              Start building for free
            </Button>
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

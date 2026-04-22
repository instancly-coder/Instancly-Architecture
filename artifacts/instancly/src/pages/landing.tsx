import {
  Sparkles,
  ArrowUp,
  ArrowRight,
  Star,
  Database,
  Shield,
  Globe,
  BarChart3,
  CreditCard,
  Cpu,
  Quote,
  Check,
} from "lucide-react";
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
    step: "01",
    title: "Start with an idea",
    body: "Describe the app you want in plain English. Drop in a screenshot, a Notion doc, or a half-baked sketch — anything goes.",
    chat: [
      { who: "you", text: "I want a recipe site where I can save meals and rate them" },
      { who: "ai", text: "Got it. Building a recipe collection with ratings and tags…" },
    ],
  },
  {
    step: "02",
    title: "Watch it come to life",
    body: "Real components, a real database, a real preview — all wired up live while the AI works. No mocks, no toy apps.",
    files: ["app.tsx", "recipes.tsx", "schema.sql", "api/save.ts"],
  },
  {
    step: "03",
    title: "Refine and ship",
    body: "Tweak it with simple feedback — \"make the hero bigger\", \"add login\". When it's right, hit Publish. You get a real URL in seconds.",
    url: "recipes.instancly.app",
  },
];

const FEATURES = [
  { icon: Database, title: "Real Postgres", body: "Every project gets a serverless database. Branch, restore, query." },
  { icon: Shield, title: "Auth, built in", body: "Email, Google, Apple — toggle on. No SDK juggling." },
  { icon: Globe, title: "One-click publish", body: "Live on the web in seconds. Custom domain when you're ready." },
  { icon: BarChart3, title: "Live analytics", body: "Page views, signups, revenue — without dropping a script." },
  { icon: CreditCard, title: "Payments-ready", body: "Stripe wired up so you can charge for what you ship." },
  { icon: Cpu, title: "Pick your model", body: "Claude, GPT, Gemini. Switch any time. Cost shown live." },
];

const TESTIMONIALS = [
  {
    quote: "I built and shipped a paid SaaS in a weekend. I don't even know what React is.",
    name: "Maya R.",
    role: "Yoga teacher · maya-flow.app",
  },
  {
    quote: "Replaced six contractors with Instancly. We ship 3x faster and the code is actually nice.",
    name: "Daniel K.",
    role: "Founder, Plotly Studio",
  },
  {
    quote: "My nephew built our family reunion site in 20 minutes. He's nine. Nine.",
    name: "Priya S.",
    role: "Aunt, very impressed",
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
        <section className="relative overflow-hidden">
          {/* Decorative background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_70%)]" />
            <div
              className="absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
                maskImage:
                  "radial-gradient(ellipse at center, black 40%, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at center, black 40%, transparent 75%)",
              }}
            />
          </div>

          <div className="px-4 sm:px-6 max-w-5xl mx-auto text-center flex flex-col items-center justify-center min-h-[88vh] pt-10 pb-16">
          <a
            href="/changelog"
            className="group inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-8 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 hover:text-foreground hover:border-primary/40 transition-colors shadow-sm"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Instancly v2.0 — now with one-click publish</span>
            <ArrowRight className="w-3 h-3 opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.02]">
            <span className="block">Ship your</span>
            <span className="block mt-2">
              <span
                key={nounIndex}
                className="inline-block text-primary animate-rotate-in"
                style={{ textShadow: "0 0 40px rgba(242,98,7,0.45)" }}
              >
                {ROTATING_NOUNS[nounIndex]}
              </span>
            </span>
            <span className="block mt-2">before your coffee gets cold.</span>
          </h1>

          <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto mb-10">
            Describe it. Watch Instancly build it live. Publish to a real URL —
            no code, no DevOps, no excuses.
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

            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-secondary">
              <div className="flex -space-x-1.5">
                {["#f26207", "#7c3aed", "#0ea5e9", "#10b981"].map((c) => (
                  <span
                    key={c}
                    className="w-5 h-5 rounded-full border-2 border-background"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3 h-3 fill-primary text-primary"
                  />
                ))}
              </div>
              <span>Loved by 36M+ builders</span>
            </div>
          </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="border-y border-border bg-surface/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-2 items-center">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  {s.value}
                </div>
                <div className="text-xs text-secondary mt-1">{s.label}</div>
              </div>
            ))}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <div className="text-xs text-secondary">4.9/5 · 12K reviews</div>
            </div>
          </div>
        </section>

        {/* How it works — visual zig-zag */}
        <section id="how" className="py-20 md:py-32 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-5 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
                <Sparkles className="w-3 h-3 text-primary" />
                Meet Instancly
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                From "wouldn't it be cool if…"<br />
                to <span className="text-primary">live in production.</span>
              </h2>
              <p className="text-secondary text-base md:text-lg">
                Three moves. Each one is a single sentence. No frameworks to learn.
              </p>
            </div>

            <div className="space-y-20 md:space-y-28">
              {STEPS.map((s, i) => {
                const reverse = i % 2 === 1;
                return (
                  <div
                    key={s.step}
                    className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center ${
                      reverse ? "md:[&>*:first-child]:order-2" : ""
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono text-primary mb-3">
                        STEP {s.step}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
                        {s.title}
                      </h3>
                      <p className="text-secondary text-base md:text-lg leading-relaxed">
                        {s.body}
                      </p>
                    </div>

                    {/* Visual mock per step */}
                    <div className="relative">
                      <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full -z-10" />
                      {i === 0 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 p-4 space-y-3">
                          {s.chat?.map((m, j) => (
                            <div
                              key={j}
                              className={`flex ${m.who === "you" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                                  m.who === "you"
                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                    : "bg-surface-raised text-foreground rounded-bl-sm border border-border"
                                }`}
                              >
                                {m.text}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-2 text-xs text-secondary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Building…
                          </div>
                        </div>
                      )}

                      {i === 1 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-surface-raised">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                            <span className="ml-3 text-xs font-mono text-secondary">
                              recipes.app — building
                            </span>
                          </div>
                          <div className="grid grid-cols-[140px_1fr] text-xs font-mono">
                            <div className="border-r border-border p-3 space-y-1.5 bg-surface-raised/40">
                              {s.files?.map((f, j) => (
                                <div
                                  key={f}
                                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded ${
                                    j === 1
                                      ? "bg-primary text-primary-foreground"
                                      : "text-secondary"
                                  }`}
                                >
                                  <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                                  <span className="truncate">{f}</span>
                                </div>
                              ))}
                            </div>
                            <div className="p-3 space-y-1.5 leading-relaxed">
                              <div><span className="text-primary">export</span> <span className="text-foreground">function</span> <span className="text-foreground/80">Recipes()</span> {"{"}</div>
                              <div className="pl-3 text-secondary">const recipes = useRecipes();</div>
                              <div className="pl-3"><span className="text-foreground/80">return</span> <span className="text-secondary">(</span></div>
                              <div className="pl-6 text-foreground/80">&lt;Grid items={"{recipes}"} /&gt;</div>
                              <div className="pl-3 text-secondary">);</div>
                              <div>{"}"}</div>
                              <div className="pt-2 text-primary flex items-center gap-1">
                                <Check className="w-3 h-3" /> 4 files written
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {i === 2 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-raised">
                            <Globe className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-mono text-secondary truncate">
                              https://{s.url}
                            </span>
                            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/15 text-success">
                              LIVE
                            </span>
                          </div>
                          <div className="p-5 bg-surface-raised/30">
                            <div className="h-3 w-1/3 rounded bg-foreground/10 mb-3" />
                            <div className="h-2 w-2/3 rounded bg-foreground/10 mb-2" />
                            <div className="h-2 w-1/2 rounded bg-foreground/10 mb-5" />
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3].map((n) => (
                                <div
                                  key={n}
                                  className="aspect-square rounded bg-gradient-to-br from-primary/30 to-foreground/5"
                                />
                              ))}
                            </div>
                          </div>
                          <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-xs">
                            <Check className="w-3 h-3 text-primary" />
                            <span className="text-secondary">Deployed in 4.2s</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bento features */}
        <section className="py-20 md:py-28 px-4 sm:px-6 border-t border-border bg-surface/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Everything's in the box.
              </h2>
              <p className="text-secondary">
                You don't bolt things on. Database, auth, payments, analytics —
                they just work. Toggle and go.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                const big = i === 0;
                return (
                  <div
                    key={f.title}
                    className={`group relative rounded-2xl border border-border bg-background hover-elevate p-6 md:p-7 overflow-hidden ${
                      big ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""
                    }`}
                  >
                    <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className={`font-bold mb-2 ${big ? "text-2xl" : "text-lg"}`}>
                      {f.title}
                    </h3>
                    <p className="text-sm text-secondary leading-relaxed">{f.body}</p>
                    {big && (
                      <div className="mt-6 rounded-lg border border-border bg-surface p-4 font-mono text-xs">
                        <div className="text-secondary mb-2">// schema.sql</div>
                        <div><span className="text-primary">create table</span> <span className="text-foreground">recipes</span> (</div>
                        <div className="pl-3 text-secondary">id <span className="text-primary">uuid</span> primary key,</div>
                        <div className="pl-3 text-secondary">title <span className="text-primary">text</span> not null,</div>
                        <div className="pl-3 text-secondary">rating <span className="text-primary">int</span></div>
                        <div>);</div>
                      </div>
                    )}
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
                  Or start from a template.
                </h2>
                <p className="text-secondary">
                  Remix something proven. Customize from there.
                </p>
              </div>
              <Link
                href="/templates"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATES.map((t, i) => (
                <Link
                  key={t.name}
                  href="/login"
                  className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-surface-raised to-background relative overflow-hidden p-3">
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase z-10">
                      {t.tag}
                    </div>
                    {/* mini UI mock per card */}
                    <div className="absolute inset-3 rounded bg-background/80 backdrop-blur-sm border border-border/50 p-2 flex flex-col gap-1.5 transition-transform group-hover:scale-[1.02]">
                      <div className="h-1.5 w-1/3 rounded bg-foreground/30" />
                      <div className="h-1 w-2/3 rounded bg-foreground/15" />
                      <div className="grid grid-cols-3 gap-1 mt-1 flex-1">
                        <div className={`rounded ${i % 3 === 0 ? "bg-primary/60" : "bg-foreground/15"}`} />
                        <div className="rounded bg-foreground/15" />
                        <div className={`rounded ${i % 3 === 1 ? "bg-primary/60" : "bg-foreground/15"}`} />
                        <div className="rounded bg-foreground/15" />
                        <div className={`rounded ${i % 3 === 2 ? "bg-primary/60" : "bg-foreground/15"}`} />
                        <div className="rounded bg-foreground/15" />
                      </div>
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

        {/* Testimonials */}
        <section className="py-20 md:py-28 px-4 sm:px-6 border-t border-border bg-surface/40">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                People are shipping wild things.
              </h2>
              <p className="text-secondary">
                A teacher with a SaaS. A founder cutting agency bills. A nine-year-old.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl border border-border bg-background p-6 flex flex-col"
                >
                  <Quote className="w-5 h-5 text-primary mb-4" />
                  <p className="text-base text-foreground leading-relaxed mb-6 flex-1">
                    {t.quote}
                  </p>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-secondary">{t.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 px-4 sm:px-6 text-center border-t border-border">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
            <Sparkles className="w-3 h-3 text-primary" />
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

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
import React, { useEffect, useState, type KeyboardEvent } from "react";
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

// Brand-themed integration marks. Inline SVGs so we don't depend on an
// external icon set; each picks up `currentColor` from its themed wrapper.
const INTEGRATIONS: Array<{
  name: string;
  tag: string;
  desc: string;
  color: string;
  Logo: () => React.ReactElement;
}> = [
  {
    name: "Neon",
    tag: "Database",
    desc: "Serverless Postgres. A fresh branch for every project, instantly.",
    color: "#00E599",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M0 4.8C0 2.149 2.149 0 4.8 0h14.4C21.851 0 24 2.149 24 4.8v10.62c0 2.985-3.81 4.227-5.567 1.815L13.6 10.5v8.7A4.8 4.8 0 0 1 8.8 24H4.8A4.8 4.8 0 0 1 0 19.2V4.8Zm4.8-1.2A1.2 1.2 0 0 0 3.6 4.8v14.4a1.2 1.2 0 0 0 1.2 1.2h4a1.2 1.2 0 0 0 1.2-1.2V8.4a1.2 1.2 0 0 1 2.16-.72l6.96 9.28c.293.4.88.176.88-.32V4.8a1.2 1.2 0 0 0-1.2-1.2H4.8Z" />
      </svg>
    ),
  },
  {
    name: "Stripe",
    tag: "Payments",
    desc: "Take payments in any currency, day one. Subscriptions, one-offs, marketplaces.",
    color: "#635BFF",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.42-.977 1.661 0 3.385.708 4.567 1.302l.671-4.119C16.687 3.83 15.064 3.4 12.972 3.4c-1.738 0-3.184.45-4.215 1.297-1.073.886-1.629 2.165-1.629 3.703 0 2.789 1.706 3.978 4.485 4.989 1.79.636 2.39 1.087 2.39 1.793 0 .682-.586 1.067-1.652 1.067-1.355 0-3.585-.659-5.043-1.51l-.692 4.182c1.246.71 3.557 1.421 5.957 1.421 1.834 0 3.366-.435 4.398-1.252 1.155-.911 1.749-2.252 1.749-3.948 0-2.86-1.749-4.05-4.241-4.959z" />
      </svg>
    ),
  },
  {
    name: "Vercel",
    tag: "Hosting",
    desc: "Edge-deployed, every push. Custom domains and TLS in two clicks.",
    color: "#FFFFFF",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2 24 22H0L12 2Z" />
      </svg>
    ),
  },
  {
    name: "Anthropic",
    tag: "AI · Claude",
    desc: "Sonnet 4.5 powers the builder. Long-context reasoning, on tap.",
    color: "#D97757",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M14.5 3h3.8L24 21h-3.8l-1.2-3.4h-6.5L11.3 21H7.5L14.5 3Zm-1.4 11.4h4.5L15.3 7.6l-2.2 6.8ZM0 21l7-18h3.6L3.7 21H0Z" />
      </svg>
    ),
  },
  {
    name: "OpenAI",
    tag: "AI · GPT",
    desc: "Swap to GPT-4o or 4o-mini for cheaper iterations. One toggle, zero rewiring.",
    color: "#10A37F",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
      </svg>
    ),
  },
  {
    name: "Google",
    tag: "AI · Gemini",
    desc: "Gemini 2.5 Pro and Flash for fast, multimodal generations.",
    color: "#4285F4",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2 9.5 8.5 3 11l6.5 2.5L12 20l2.5-6.5L21 11l-6.5-2.5L12 2Z" />
      </svg>
    ),
  },
  {
    name: "Postgres",
    tag: "SQL",
    desc: "Battle-tested SQL with full-text search, JSONB, and pgvector built in.",
    color: "#4169E1",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M16.808 0c-1.371 0-2.69.279-3.857.732l.027.018c.86.331 1.53.79 2.044 1.343 1.027-.371 2.181-.59 3.413-.59C23.146 1.503 24 5.06 24 8.07c0 4.014-1.78 8.106-3.42 8.106-.522 0-.99-.302-1.376-.842l.244-.072c.328-.097.687-.39.687-1.296 0-.737-.13-1.927-.13-3.05 0-2.61.45-3.704.45-5.18 0-1.43-.598-2.63-1.832-3.16C17.93.255 17.346.165 16.808.165 14.27.165 12.41 1.94 12 4.4c-.41-2.46-2.27-4.235-4.808-4.235-.538 0-1.122.09-1.815.412C4.143 1.107 3.545 2.307 3.545 3.737c0 1.476.45 2.57.45 5.18 0 1.123-.13 2.313-.13 3.05 0 .906.36 1.2.687 1.296l.244.072c-.386.54-.854.842-1.376.842C1.78 14.176 0 10.084 0 6.07 0 3.06.854-.497 5.565.503c1.232 0 2.386.219 3.413.59C9.493.539 10.163.08 11.022-.25l.027-.018C9.882-.721 8.563-1 7.192-1z" />
      </svg>
    ),
  },
  {
    name: "shadcn/ui",
    tag: "Components",
    desc: "54 polished, accessible primitives — the same set the AI builds with.",
    color: "#A1A1AA",
    Logo: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M22 12 12 22" />
        <path d="M19 4 4 19" />
      </svg>
    ),
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
  const [integrationsExpanded, setIntegrationsExpanded] = useState(false);

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

          {/* iOS-style glass announcement pill */}
          <div className="relative z-10 flex justify-center pt-10 pb-4">
            <Link
              href="/explore"
              className="glass-pill group inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium text-foreground/90 transition-transform hover:-translate-y-px"
            >
              Introducing Instancly v2
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center justify-center min-h-[80vh] pt-2 pb-16">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.02]">
            <span className="block">Ship your</span>
            <span className="block mt-2">
              <span
                key={nounIndex}
                className="inline-block text-primary animate-rotate-in italic"
                style={{ textShadow: "0 0 40px hsl(215 100% 60% / 0.55)" }}
              >
                {ROTATING_NOUNS[nounIndex]}
              </span>
            </span>
            <span className="block mt-2">in an afternoon.</span>
          </h1>

          <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto mb-10">
            Describe it. Watch Instancly build it live. Publish to a real URL —
            no code, no DevOps, no excuses.
          </p>

          <div className="w-full max-w-2xl mx-auto">
            <div className="prompt-glow rounded-[14px] border border-border bg-background text-left focus-within:border-primary focus-within:shadow-[0_0_0_1px_hsl(var(--primary))] transition-shadow">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask Instancly to create a landing page for my..."
                rows={3}
                className="w-full min-h-[88px] max-h-[220px] bg-transparent p-4 text-base text-foreground placeholder:text-muted outline-none resize-none"
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    type="button"
                    className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11px] font-mono text-secondary hover:text-foreground hover:bg-surface-raised transition-colors min-w-0"
                    title="Choose model"
                  >
                    <Cpu className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Claude Sonnet 4.5</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={submit}
                  aria-label="Generate"
                  disabled={!prompt.trim()}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
                  title="Send"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="px-3 py-1.5 rounded-full text-xs text-secondary border border-border bg-surface/60 hover:text-foreground hover:border-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-10 flex items-center justify-center gap-2 text-xs text-secondary">
              <div className="flex -space-x-1.5">
                {["#3b82f6", "#7c3aed", "#0ea5e9", "#10b981"].map((c) => (
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-2 items-center">
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

        {/* Integrations — every project gets these wired in */}
        <section id="integrations" className="py-20 md:py-28 px-4 sm:px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-secondary mb-3">
                The stack, included
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
                <span className="block sm:inline">Best-in-class tools,</span>{" "}
                <span className="block sm:inline">
                  <span className="text-primary">already wired up.</span>
                </span>
              </h2>
              <p className="text-base text-secondary leading-relaxed">
                No SDK juggling. No env-var scavenger hunts. Every Instancly app
                ships with the tools the pros use — pre-configured, on day one.
              </p>
            </div>

            <div className="relative">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${
                  integrationsExpanded
                    ? ""
                    : "[&>*:nth-child(n+4)]:hidden sm:[&>*:nth-child(n+4)]:grid"
                }`}
              >
                {INTEGRATIONS.map((it) => (
                  <div
                    key={it.name}
                    className="group relative rounded-xl border border-border bg-surface/40 p-5 overflow-hidden transition-all hover:-translate-y-0.5"
                    style={{
                      boxShadow: `inset 0 1px 0 0 ${it.color}10`,
                    }}
                  >
                    {/* Themed glow */}
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none"
                      style={{ background: it.color }}
                    />
                    <div className="relative flex items-start gap-3 mb-2">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center border shrink-0"
                        style={{
                          background: `${it.color}18`,
                          borderColor: `${it.color}40`,
                          color: it.color,
                        }}
                      >
                        <it.Logo />
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-wrap pt-1.5">
                        <h3 className="font-bold tracking-tight text-foreground leading-none">
                          {it.name}
                        </h3>
                        <span
                          className="text-[10px] font-mono uppercase tracking-wider leading-none"
                          style={{ color: it.color }}
                        >
                          {it.tag}
                        </span>
                      </div>
                    </div>
                    <p className="relative text-xs text-secondary leading-relaxed">
                      {it.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Mobile-only fade + reveal control. Hidden once expanded
                  and on sm+ where we already show the full grid. */}
              {!integrationsExpanded && (
                <div
                  aria-hidden="true"
                  className="sm:hidden pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent"
                />
              )}
            </div>

            {!integrationsExpanded && (
              <div className="sm:hidden mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIntegrationsExpanded(true)}
                  className="glass-pill inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium text-foreground/90 transition-transform active:translate-y-px"
                >
                  Show all {INTEGRATIONS.length}
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 rotate-90" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* How it works — visual zig-zag */}
        <section id="how" className="py-20 md:py-32 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
                <span className="block sm:inline">From "wouldn't it be cool if…"</span>{" "}
                <span className="block sm:inline">
                  to <span className="text-primary">live in production.</span>
                </span>
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
                                    ? "bg-primary/15 text-primary rounded-br-sm border border-primary/25"
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
                                      ? "bg-primary/15 text-primary"
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
          <div className="max-w-7xl mx-auto">
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
          <div className="max-w-7xl mx-auto">
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
          <div className="max-w-7xl mx-auto">
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
        <section className="py-24 md:py-32 px-4 sm:px-6 border-t border-border">
          <div className="max-w-7xl mx-auto text-center">
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
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

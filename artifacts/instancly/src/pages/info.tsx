import { type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

function Shell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="px-4 sm:px-6 max-w-4xl mx-auto pt-16 pb-10">
          {eyebrow && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-mono mb-5">
              {eyebrow}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {title}
          </h1>
          {intro && (
            <p className="text-lg text-secondary max-w-2xl">{intro}</p>
          )}
        </section>
        <section className="px-4 sm:px-6 max-w-4xl mx-auto pb-24">
          {children}
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-3 tracking-tight">{title}</h2>
      <div className="text-secondary leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function CTA() {
  return (
    <div className="mt-12 rounded-xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-bold mb-1">Got an idea? Build it now.</h3>
        <p className="text-sm text-secondary">Free to start. No card required.</p>
      </div>
      <Link href="/login">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          Start building <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </div>
  );
}

/* ------------------------------- Pages ------------------------------- */

export function Docs() {
  const sections = [
    {
      title: "Getting started",
      items: ["Create an account", "Write your first prompt", "Publish your project"],
    },
    {
      title: "The builder",
      items: ["Tabs and navigation", "Live preview & devices", "Files and code"],
    },
    {
      title: "Database",
      items: ["Connecting Postgres", "Querying tables", "Backups & rollback"],
    },
    {
      title: "Deployment",
      items: ["instancly.app subdomains", "Custom domains", "Environment variables"],
    },
  ];
  return (
    <Shell
      eyebrow="Docs"
      title="Documentation"
      intro="Everything you need to take an idea from prompt to production."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-border bg-surface p-5 hover-elevate"
          >
            <h3 className="font-bold mb-3">{s.title}</h3>
            <ul className="space-y-2 text-sm">
              {s.items.map((i) => (
                <li key={i}>
                  <a
                    href="#"
                    className="text-secondary hover:text-primary transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowRight className="w-3 h-3" /> {i}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <CTA />
    </Shell>
  );
}

export function Changelog() {
  const entries = [
    {
      version: "v2.0",
      date: "April 22, 2026",
      title: "One-click publish & light mode",
      bullets: [
        "Added a polished light mode with persistent preference.",
        "Refreshed the brand accent — meet electric cyan.",
        "Builder now supports dynamic tabs with browser-style URL controls.",
      ],
    },
    {
      version: "v1.8",
      date: "March 4, 2026",
      title: "Smarter model routing",
      bullets: [
        "Pick between Claude, GPT, and Gemini per build.",
        "Cost shown live as the agent works.",
      ],
    },
    {
      version: "v1.6",
      date: "January 12, 2026",
      title: "Build history & rollbacks",
      bullets: [
        "Every build is restorable from the History tab.",
        "Diff viewer for changed files.",
      ],
    },
  ];
  return (
    <Shell
      eyebrow="Changelog"
      title="What's new"
      intro="A running log of everything we ship. New things land every week."
    >
      <div className="space-y-6">
        {entries.map((e) => (
          <div
            key={e.version}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-xs font-mono">
                {e.version}
              </span>
              <span className="text-xs text-secondary font-mono">{e.date}</span>
            </div>
            <h3 className="text-lg font-bold mb-3">{e.title}</h3>
            <ul className="space-y-2">
              {e.bullets.map((b) => (
                <li key={b} className="text-sm text-secondary flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function Templates() {
  const templates = [
    { name: "Personal portfolio", desc: "Personal work showcase", tag: "Portfolio" },
    { name: "Pitch deck slides", desc: "Code-powered presentations", tag: "Slides" },
    { name: "Architect studio site", desc: "Firm website & gallery", tag: "Agency" },
    { name: "Fashion blog", desc: "Minimal, playful design", tag: "Blog" },
    { name: "Event platform", desc: "Find, register, host events", tag: "Marketplace" },
    { name: "Personal blog", desc: "Muted, intimate design", tag: "Blog" },
    { name: "Lifestyle magazine", desc: "Sophisticated long-form", tag: "Editorial" },
    { name: "Ecommerce store", desc: "Premium product showcase", tag: "Shop" },
    { name: "SaaS landing page", desc: "Conversion-tuned hero", tag: "Marketing" },
    { name: "Internal admin", desc: "Tables, forms, charts", tag: "Tooling" },
    { name: "Recipe collection", desc: "Tag, search, share", tag: "Lifestyle" },
    { name: "Wedding website", desc: "RSVP, gallery, schedule", tag: "Personal" },
  ];
  return (
    <Shell
      eyebrow="Templates"
      title="Start from a template"
      intro="Skip the blank page. Remix one of these and make it yours in minutes."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Link
            key={t.name}
            href="/login"
            className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-surface-raised to-background relative">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase">
                {t.tag}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-medium mb-1 group-hover:text-primary transition-colors">
                {t.name}
              </h3>
              <p className="text-xs text-secondary">{t.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

export function Status() {
  const services = [
    { name: "Builder API", status: "operational" as const },
    { name: "Live preview", status: "operational" as const },
    { name: "Postgres provisioning", status: "operational" as const },
    { name: "Publishing pipeline", status: "operational" as const },
    { name: "Custom domains", status: "operational" as const },
    { name: "Auth", status: "operational" as const },
  ];
  return (
    <Shell
      eyebrow="Status"
      title="All systems go"
      intro="Live status for every Instancly service. Updated continuously."
    >
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {services.map((s, i) => (
          <div
            key={s.name}
            className={`flex items-center justify-between px-5 py-4 ${
              i < services.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="font-medium">{s.name}</span>
            <span className="inline-flex items-center gap-2 text-sm text-success">
              <span className="w-2 h-2 rounded-full bg-success" />
              Operational
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-secondary mt-4 font-mono">
        Last checked just now · Subscribe to incident updates →
      </p>
    </Shell>
  );
}

export function Blog() {
  const posts = [
    {
      title: "Why we rebuilt the builder around tabs",
      date: "April 18, 2026",
      excerpt: "A small UX shift that unlocked a much faster workflow.",
    },
    {
      title: "The case for serverless Postgres for every app",
      date: "March 30, 2026",
      excerpt: "Cold starts, branching, and why \"local-first\" is overrated.",
    },
    {
      title: "Prompting an app: tips from power users",
      date: "March 12, 2026",
      excerpt: "What separates a one-shot build from a 10-minute polish job.",
    },
    {
      title: "Shipping v2.0: the redesign behind the scenes",
      date: "February 28, 2026",
      excerpt: "Light mode, electric cyan, and 12,000 design decisions.",
    },
  ];
  return (
    <Shell
      eyebrow="Blog"
      title="Notes from the team"
      intro="Builder stories, product thinking, and the occasional rant."
    >
      <div className="space-y-4">
        {posts.map((p) => (
          <a
            key={p.title}
            href="#"
            className="block rounded-xl border border-border bg-surface p-6 hover-elevate"
          >
            <div className="text-xs text-secondary font-mono mb-2">{p.date}</div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
              {p.title}
            </h3>
            <p className="text-sm text-secondary">{p.excerpt}</p>
          </a>
        ))}
      </div>
    </Shell>
  );
}

export function About() {
  return (
    <Shell
      eyebrow="About"
      title="We're building the fastest path from idea to live app."
      intro="Instancly started as a side project. Now millions of builders use it to ship real software without writing a line of code."
    >
      <Section title="Our mission">
        <p>
          Software should be as easy to make as a tweet. We're not there yet —
          but we're closer than anyone has been. Every week we cut another step
          out of the way between you and your idea.
        </p>
      </Section>
      <Section title="The team">
        <p>
          A small, fully remote team of designers, engineers, and infrastructure
          nerds. We hire people who care more about the user than the stack.
        </p>
      </Section>
      <Section title="Our values">
        <ul className="space-y-2">
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
            <span><strong className="text-foreground">Ship daily.</strong> Small things, often.</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
            <span><strong className="text-foreground">Real software, not demos.</strong> What you build is yours and runs on real infra.</span>
          </li>
          <li className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
            <span><strong className="text-foreground">Talk to users.</strong> Every engineer reads the inbox.</span>
          </li>
        </ul>
      </Section>
      <CTA />
    </Shell>
  );
}

export function Careers() {
  const roles = [
    { title: "Senior Product Engineer", team: "Builder", location: "Remote" },
    { title: "Design Engineer", team: "Marketing site", location: "Remote" },
    { title: "Infrastructure Engineer", team: "Platform", location: "Remote" },
    { title: "Developer Advocate", team: "Community", location: "Remote" },
    { title: "Customer Operations Lead", team: "Support", location: "Remote" },
  ];
  return (
    <Shell
      eyebrow="Careers"
      title="Come build with us."
      intro="We're a small team, fully remote, with a soft spot for craft. If shipping fast and helping millions of people make things sounds fun, you'll fit right in."
    >
      <h2 className="text-xl font-bold mb-4 tracking-tight">Open roles</h2>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {roles.map((r, i) => (
          <a
            key={r.title}
            href="#"
            className={`flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors ${
              i < roles.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-secondary">{r.team} · {r.location}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-secondary" />
          </a>
        ))}
      </div>
      <p className="text-xs text-secondary mt-4">
        Don't see your role? Email <span className="text-primary font-mono">careers@instancly.app</span>.
      </p>
    </Shell>
  );
}

export function Privacy() {
  return (
    <Shell
      eyebrow="Privacy"
      title="Privacy policy"
      intro="The short version: we collect what we need to make Instancly work, and we don't sell your data. Ever."
    >
      <Section title="What we collect">
        <p>Account info (email, name, profile photo), the projects and prompts you write on Instancly, and basic usage analytics so we can make the product better.</p>
      </Section>
      <Section title="How we use it">
        <p>To run the service, deliver the app you asked us to build, and improve features. We don't train foundation models on your private projects.</p>
      </Section>
      <Section title="Sharing">
        <p>We share data only with infrastructure providers needed to operate Instancly (Postgres host, AI model providers, payments). Each is bound by strict data agreements.</p>
      </Section>
      <Section title="Your rights">
        <p>Export, delete, or restrict any data we hold about you at any time from the settings page. Email <span className="text-primary font-mono">privacy@instancly.app</span> for help.</p>
      </Section>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell
      eyebrow="Terms"
      title="Terms of service"
      intro="Plain-English summary above each section. The legal language follows."
    >
      <Section title="Using Instancly">
        <p>You can use Instancly for any lawful purpose. Don't use it to build anything illegal, abusive, or designed to harm people.</p>
      </Section>
      <Section title="Your projects">
        <p>You own everything you build on Instancly — the code, the data, the design. We just store and run it for you.</p>
      </Section>
      <Section title="Billing">
        <p>Free tier is free forever. Paid plans renew monthly or annually and you can cancel any time. Refunds within 14 days, no questions asked.</p>
      </Section>
      <Section title="Termination">
        <p>You can delete your account whenever. We'll only suspend an account for serious violations and we'll email you first.</p>
      </Section>
      <Section title="Liability">
        <p>Instancly is provided "as is". We're not liable for anything beyond what you've paid us in the past 12 months.</p>
      </Section>
    </Shell>
  );
}

export function Community() {
  const channels = [
    { name: "Discord", desc: "Live chat with builders and the team", cta: "Join Discord" },
    { name: "GitHub", desc: "Issues, examples, and open source plugins", cta: "Open GitHub" },
    { name: "X / Twitter", desc: "Daily showcases and product updates", cta: "Follow us" },
  ];
  return (
    <Shell
      eyebrow="Community"
      title="Find your people."
      intro="Builders helping builders. Drop in, share your work, and steal ideas shamelessly."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {channels.map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-surface p-6 hover-elevate flex flex-col">
            <Circle className="w-5 h-5 text-primary mb-3" />
            <h3 className="font-bold mb-1">{c.name}</h3>
            <p className="text-sm text-secondary mb-4 flex-1">{c.desc}</p>
            <a href="#" className="text-sm font-medium text-primary inline-flex items-center gap-1">
              {c.cta} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </Shell>
  );
}

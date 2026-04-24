import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Book,
  GitCommit,
  LayoutTemplate,
  Activity as ActivityIcon,
  Newspaper,
  Building2,
  Briefcase,
  Lock,
  Scale,
  Users,
  Compass,
  ShieldAlert,
  Cookie,
  FileLock2,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

const MARKETING_LINKS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/docs", label: "Docs", icon: Book },
  { href: "/changelog", label: "Changelog", icon: GitCommit },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/status", label: "Status", icon: ActivityIcon },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/about", label: "About", icon: Building2 },
  { href: "/careers", label: "Careers", icon: Briefcase },
  { href: "/community", label: "Community", icon: Users },
  { href: "/privacy", label: "Privacy", icon: Lock },
  { href: "/terms", label: "Terms", icon: Scale },
  { href: "/aup", label: "Acceptable use", icon: ShieldAlert },
  { href: "/cookies", label: "Cookies", icon: Cookie },
  { href: "/dpa", label: "Data processing", icon: FileLock2 },
];

export function SideNav() {
  const [loc] = useLocation();
  return (
    <nav className="lg:sticky lg:top-24 lg:self-start space-y-1 text-sm">
      <div className="text-[10px] uppercase tracking-wider font-mono text-secondary px-3 py-2">
        Resources
      </div>
      {MARKETING_LINKS.map(({ href, label, icon: Icon }) => {
        const active = loc === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              active
                ? "bg-primary/15 text-primary border border-primary/25"
                : "text-secondary hover:text-foreground hover:bg-surface"
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({
  eyebrow,
  title,
  intro,
  children,
  prose = false,
  headerActions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  prose?: boolean;
  headerActions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full pt-12 pb-24 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-14">
          <aside className="hidden lg:block">
            <SideNav />
          </aside>
          <div className="min-w-0">
            <header className="mb-10 pb-8 border-b border-border">
              {eyebrow && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-5 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {eyebrow}
                </div>
              )}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="min-w-0">
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                    {title}
                  </h1>
                  {intro && (
                    <p className="text-lg text-secondary max-w-2xl">{intro}</p>
                  )}
                </div>
                {headerActions && (
                  <div className="shrink-0">{headerActions}</div>
                )}
              </div>
            </header>
            <div className={prose ? "max-w-3xl" : ""}>{children}</div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-3 tracking-tight">{title}</h2>
      <div className="text-secondary leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export function CTA() {
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

const LEGAL_EFFECTIVE = "April 1, 2026";

function LegalMeta({ effective = LEGAL_EFFECTIVE }: { effective?: string }) {
  return (
    <div className="mb-10 rounded-lg border border-border bg-surface/60 p-4 text-xs font-mono text-secondary flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
      <span>Effective: {effective}</span>
      <span className="hidden sm:inline">·</span>
      <span>Version 2.0</span>
      <span className="hidden sm:inline">·</span>
      <span>Governing law: State of Delaware, USA</span>
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
      items: ["deploybro.app subdomains", "Custom domains", "Environment variables"],
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
      intro="Live status for every DeployBro service. Updated continuously."
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
      intro="DeployBro started as a side project. Now millions of builders use it to ship real software without writing a line of code."
      prose
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
        Don't see your role? Email <span className="text-primary font-mono">careers@deploybro.app</span>.
      </p>
    </Shell>
  );
}

export function Privacy() {
  return (
    <Shell
      eyebrow="Privacy"
      title="Privacy policy"
      intro="The short version: we collect what we need to make DeployBro work, and we don't sell your data. Ever. The long version follows."
      prose
    >
      <LegalMeta />

      <Section title="1. Who we are">
        <p>
          DeployBro is operated by DeployBro, Inc., a Delaware corporation
          ("DeployBro", "we", "us", or "our") with its principal place of
          business in San Francisco, California. This Privacy Policy explains
          how we collect, use, disclose, and protect personal data when you
          visit our marketing site, sign in to your account, build apps with
          our AI builder, publish projects to deploybro.app, or otherwise
          interact with our products and services (collectively, the
          "Services").
        </p>
        <p>
          For users in the European Economic Area, United Kingdom, and
          Switzerland, DeployBro acts as the data controller for personal
          data we collect about you in connection with our marketing site
          and your DeployBro account. When you use the builder to create
          apps and store user data inside those apps, DeployBro acts as a
          data processor on your behalf — see the Data Processing Addendum.
        </p>
      </Section>

      <Section title="2. The personal data we collect">
        <p>We collect personal data in three ways: information you provide to us, information we collect automatically, and information we receive from third parties.</p>
        <p><strong className="text-foreground">Information you provide.</strong> This includes your name, email address, profile photo, password (hashed), authentication provider identifiers (e.g. Google, GitHub, Apple), billing details (payment method token, billing address, tax ID), the prompts and instructions you submit to the builder, the source code, assets, and database content of the apps you create, support requests, and any other content you choose to upload.</p>
        <p><strong className="text-foreground">Information collected automatically.</strong> When you use the Services, we and our infrastructure providers automatically log device data (IP address, browser type and version, operating system, viewport size), event data (pages viewed, buttons clicked, builds started, errors encountered, build durations, model usage), session identifiers, and approximate location derived from IP. We use first-party cookies, similar technologies, and a small number of carefully chosen third-party analytics providers — see our Cookie Policy for the full list.</p>
        <p><strong className="text-foreground">Information from third parties.</strong> If you sign in with Google, GitHub, or another identity provider, that provider sends us the basic profile data you have authorized. If you connect a Stripe account, GitHub repository, or other integration, the integration provider sends us tokens and metadata necessary to make the connection work. We do not buy lists of personal data from data brokers.</p>
      </Section>

      <Section title="3. Why we use your data (and the legal basis)">
        <p>We process personal data to deliver the Services, secure them against abuse, comply with our legal obligations, and improve the product. Specifically:</p>
        <ul className="space-y-2 list-disc ml-5">
          <li><strong className="text-foreground">To provide the Services</strong> — running your account, executing AI builds, hosting the apps you publish, processing payments, sending transactional emails. Legal basis: performance of a contract.</li>
          <li><strong className="text-foreground">To keep the Services secure</strong> — detecting fraud, abuse, and policy violations; rate limiting; preserving evidence of incidents. Legal basis: legitimate interest in protecting users and infrastructure.</li>
          <li><strong className="text-foreground">To improve the Services</strong> — diagnosing bugs, measuring feature usage, understanding which onboarding flows work. Legal basis: legitimate interest in product improvement, balanced against your privacy.</li>
          <li><strong className="text-foreground">To communicate with you</strong> — service announcements, security alerts, billing receipts, and (with your opt-in) product newsletters. Legal basis: performance of contract or, for marketing, your consent.</li>
          <li><strong className="text-foreground">To comply with the law</strong> — tax records, fraud reporting, responding to lawful government requests. Legal basis: legal obligation.</li>
        </ul>
        <p>We do not use your private project content to train foundation models. Aggregated, de-identified usage signals (e.g. "users on average start 2.3 builds per session") may be used internally and shared in product reporting.</p>
      </Section>

      <Section title="4. Sharing and disclosure">
        <p>We share personal data only with the categories of recipients below, and only as needed:</p>
        <ul className="space-y-2 list-disc ml-5">
          <li><strong className="text-foreground">Infrastructure subprocessors</strong> — our cloud host, our managed Postgres provider, our edge/CDN, our model providers (Anthropic, OpenAI, Google), our email delivery provider, our payment processor (Stripe), our error and analytics providers. Each is bound by a written data processing agreement.</li>
          <li><strong className="text-foreground">Professional advisors</strong> — auditors, lawyers, and tax accountants, under confidentiality.</li>
          <li><strong className="text-foreground">Government and law enforcement</strong> — only when we believe disclosure is necessary to comply with valid legal process, protect the rights, property, or safety of users or the public, or enforce our Terms.</li>
          <li><strong className="text-foreground">Business transfers</strong> — in the event of a merger, acquisition, financing, or sale of assets, your data may transfer to the surviving entity, subject to this Policy.</li>
        </ul>
        <p>We do not sell or rent personal data, and we do not engage in cross-context behavioral advertising. We do not share your data with advertising networks.</p>
      </Section>

      <Section title="5. International transfers">
        <p>
          We are headquartered in the United States and use infrastructure
          providers in the United States and the European Union. When personal
          data of EEA, UK, or Swiss residents is transferred to the United
          States or another country without an adequacy decision, we rely on
          the European Commission's Standard Contractual Clauses (and the UK
          IDTA where applicable), supplemented by additional technical and
          organizational measures including encryption in transit and at rest,
          access controls, and a transfer impact assessment.
        </p>
      </Section>

      <Section title="6. How long we keep data">
        <p>We keep personal data only as long as needed for the purposes described above. Default retention periods are:</p>
        <ul className="space-y-2 list-disc ml-5">
          <li>Account and profile data — for as long as your account is active, plus 30 days after deletion.</li>
          <li>Project source, prompts, and build history — for the lifetime of the project, plus 30 days after the project is deleted.</li>
          <li>Billing records and tax records — 7 years, as required by tax law.</li>
          <li>Security and audit logs — 18 months.</li>
          <li>Support conversations — 24 months from last contact.</li>
        </ul>
        <p>You can shorten any of these periods (other than legally mandated ones) by deleting the underlying objects, your account, or by emailing privacy@deploybro.app.</p>
      </Section>

      <Section title="7. Security">
        <p>
          We use industry-standard safeguards: TLS 1.2+ in transit, AES-256
          at rest, hardware-backed key management, single sign-on and 2FA for
          all employees, principle-of-least-privilege access, code review on
          every change, automated dependency and vulnerability scanning, and
          annual third-party penetration tests. We are SOC 2 Type II audited.
          No system is perfectly secure, and we ask you to use a strong,
          unique password and enable two-factor authentication.
        </p>
      </Section>

      <Section title="8. Your rights">
        <p>Depending on where you live, you may have rights to access, correct, port, restrict, or delete your personal data, to object to certain processing, and to withdraw consent at any time. EEA, UK, Swiss, and California residents have additional rights under GDPR, the UK GDPR, and the CCPA/CPRA.</p>
        <p>You can exercise the most common rights (export, delete) directly from the settings page in your account. For everything else, email privacy@deploybro.app and we will respond within 30 days. You also have the right to lodge a complaint with your supervisory authority.</p>
        <p>We do not knowingly discriminate against users for exercising any privacy right.</p>
      </Section>

      <Section title="9. Children">
        <p>The Services are not directed to children under 13 (or under 16 in the EEA), and we do not knowingly collect personal data from them. If you believe a child has given us personal data, contact privacy@deploybro.app and we will delete it.</p>
      </Section>

      <Section title="10. Changes to this Policy">
        <p>We may update this Policy from time to time. If we make a material change we will notify you by email or with a prominent in-product notice at least 14 days before the change takes effect. The "Effective" date at the top of this page reflects the most recent revision.</p>
      </Section>

      <Section title="11. Contacting us">
        <p>For privacy questions, requests, or complaints, email <span className="text-primary font-mono">privacy@deploybro.app</span>. Postal mail: DeployBro, Inc., Attn: Privacy, 548 Market St #84321, San Francisco, CA 94104, USA. EU representative: Instally Compliance Services B.V., Herengracht 282, 1016 BX Amsterdam, Netherlands. UK representative: Compliance UK Ltd., 71-75 Shelton Street, London WC2H 9JQ.</p>
      </Section>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell
      eyebrow="Terms"
      title="Terms of service"
      intro="Plain-English summary at the top of each section, with the full legal text underneath. By using DeployBro you agree to these Terms."
      prose
    >
      <LegalMeta />

      <Section title="1. Acceptance of these Terms">
        <p><em>Plain English: by using DeployBro you agree to these rules.</em></p>
        <p>These Terms of Service ("Terms") form a binding contract between you and DeployBro, Inc. ("DeployBro", "we", "us") and govern your access to and use of the marketing site, the AI builder, the hosting platform, and any related products and services (collectively, the "Services"). By creating an account, clicking "I agree", or otherwise using the Services, you represent that you have read, understood, and agreed to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Services.</p>
        <p>If you are using the Services on behalf of an organization, you represent that you have authority to bind that organization, and "you" refers to both you personally and the organization.</p>
      </Section>

      <Section title="2. Eligibility & accounts">
        <p><em>Plain English: you have to be 13+ (or 16+ in the EU), tell us the truth about who you are, and keep your password safe.</em></p>
        <p>You must be at least 13 years old (16 in the EEA) to use the Services. If you are under 18, you confirm that a parent or guardian has agreed to these Terms on your behalf. You must provide accurate registration information and keep it current. You are responsible for all activity on your account, for safeguarding your credentials, and for promptly notifying us at security@deploybro.app of any suspected unauthorized use.</p>
      </Section>

      <Section title="3. The Services">
        <p><em>Plain English: we host an AI tool that builds apps, and the apps you publish run on our infrastructure.</em></p>
        <p>DeployBro provides an AI-assisted application builder, an integrated runtime, managed Postgres databases, asset hosting, custom domains, and related developer tools. The Services rely on third-party AI models, cloud hosting, and other subprocessors that we engage to deliver the platform. We may add, remove, or change features at any time, and we may impose reasonable usage limits.</p>
      </Section>

      <Section title="4. Acceptable use">
        <p><em>Plain English: don't break the law, harm people, or abuse the platform. We have a separate full Acceptable Use Policy.</em></p>
        <p>Your use of the Services is also subject to our Acceptable Use Policy ("AUP"), which is incorporated into these Terms by reference. Without limiting the AUP, you agree not to: (a) violate any applicable law or third-party right; (b) generate or distribute content that is illegal, defamatory, harassing, sexually exploitative of minors, or that infringes intellectual property; (c) attempt to gain unauthorized access to the Services or to any user's account; (d) probe, scan, or test the vulnerability of the Services without our written permission; (e) interfere with or disrupt the Services, including through distributed denial-of-service attacks, automated request floods, or crypto-mining; (f) use the Services to develop a competing product; (g) reverse engineer, decompile, or attempt to extract the source code of any DeployBro component; (h) misrepresent the source of content or attempt to evade abuse filters; (i) use any automated method to register accounts or scrape data without our written permission.</p>
      </Section>

      <Section title="5. Your content & licenses">
        <p><em>Plain English: you own what you build. You give us only the permissions we need to actually run it.</em></p>
        <p>"Your Content" means everything you upload, generate through the builder, or store inside an app you create — including source code, assets, and end-user data. As between you and DeployBro, you retain all right, title, and interest in Your Content. You grant DeployBro a worldwide, non-exclusive, royalty-free license to host, copy, transmit, display, and process Your Content solely as necessary to operate, maintain, secure, and improve the Services and to provide them to you. You also grant DeployBro the right to display the public projects you mark as "explore" or otherwise publicly listed.</p>
        <p>You represent and warrant that you own or have the necessary rights to Your Content and that processing it as contemplated by these Terms does not violate any law or third-party right.</p>
        <p>We may scan Your Content for malware, illegal material, and AUP violations using automated systems. We do not access the contents of your private projects manually except (i) with your permission (e.g. when you ask Support for help), (ii) to investigate a credible security or AUP issue, or (iii) where required by law.</p>
      </Section>

      <Section title="6. AI output">
        <p><em>Plain English: AI output isn't perfect. Read the code before you ship it.</em></p>
        <p>The builder uses third-party large language models to generate code, prose, and other output ("Output"). Output may be inaccurate, may overlap with output produced for other users for similar prompts, and is not guaranteed to be original or non-infringing. You are responsible for reviewing Output and for confirming that it is suitable, lawful, and accurate before relying on it. DeployBro assigns to you, to the extent permitted by law and the underlying model providers, all of its rights in Output produced specifically in response to your prompts.</p>
      </Section>

      <Section title="7. Free, paid plans, and billing">
        <p><em>Plain English: free is free. Paid plans renew until you cancel. Refunds within 14 days, no fuss.</em></p>
        <p>The free tier is offered for free, subject to usage limits we publish on our pricing page. Paid plans are billed in advance on a monthly or annual basis through Stripe and renew automatically until cancelled. Fees are exclusive of taxes; you are responsible for all applicable sales, use, VAT, GST, and similar taxes. You may cancel at any time and your subscription will continue through the end of the current billing period. We will issue a full refund of the most recent payment if you request it within 14 days of that charge for any reason. Beyond that window, refunds are at our discretion. We may change prices with at least 30 days' prior notice; price changes apply to the next billing cycle.</p>
      </Section>

      <Section title="8. Third-party services & integrations">
        <p><em>Plain English: if you connect outside services, those services have their own rules.</em></p>
        <p>The Services may interoperate with third-party platforms (e.g. GitHub, Stripe, Anthropic, Google). Your use of those third-party services is governed by their own terms, and DeployBro is not responsible for them. You are responsible for any costs you incur with third-party providers.</p>
      </Section>

      <Section title="9. Intellectual property">
        <p><em>Plain English: our code, brand, and platform are ours. Yours is yours.</em></p>
        <p>The Services (other than Your Content and Output) are owned by DeployBro and its licensors and are protected by copyright, trademark, and other laws. We grant you a limited, non-exclusive, non-transferable, non-sublicensable license to access and use the Services in accordance with these Terms. The DeployBro name, logo, and brand are our trademarks; you may not use them without our prior written consent except for fair, factual references.</p>
      </Section>

      <Section title="10. Feedback">
        <p>If you give us suggestions, ideas, or feedback about the Services, you grant us a perpetual, irrevocable, worldwide, royalty-free license to use them without restriction or compensation.</p>
      </Section>

      <Section title="11. Suspension & termination">
        <p><em>Plain English: you can leave any time. We only kick people out for serious problems, and we'll usually warn you first.</em></p>
        <p>You may stop using the Services and delete your account at any time from settings. We may suspend or terminate your access if (a) you materially breach these Terms or the AUP, (b) we are required to do so by law, (c) your account remains unpaid after notice, or (d) continued provision of the Services to you would create a security or legal risk to DeployBro or other users. Where reasonably possible, we will give notice and an opportunity to cure. On termination, we will delete Your Content within 30 days, except for backups and records we are required to retain by law. Sections 5–6, 9–10, and 12–18 survive termination.</p>
      </Section>

      <Section title="12. Disclaimer of warranties">
        <p>EXCEPT AS EXPRESSLY STATED IN THESE TERMS, THE SERVICES AND ALL OUTPUT ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, OR THAT OUTPUT WILL BE ACCURATE, RELIABLE, OR FREE FROM ERROR. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES, IN WHICH CASE THE ABOVE EXCLUSION MAY NOT APPLY TO YOU.</p>
      </Section>

      <Section title="13. Limitation of liability">
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, DEPLOYBRO AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, GOODWILL, OR DATA, WHETHER INCURRED DIRECTLY OR INDIRECTLY, ARISING OUT OF OR IN CONNECTION WITH THE SERVICES, EVEN IF DEPLOYBRO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. DEPLOYBRO'S AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID DEPLOYBRO IN THE TWELVE MONTHS BEFORE THE EVENT GIVING RISE TO THE LIABILITY OR (B) ONE HUNDRED U.S. DOLLARS (US$100). THESE LIMITATIONS APPLY TO THE MAXIMUM EXTENT PERMITTED BY LAW, EVEN IF ANY REMEDY FAILS OF ITS ESSENTIAL PURPOSE.</p>
      </Section>

      <Section title="14. Indemnification">
        <p>You will defend, indemnify, and hold DeployBro and its affiliates harmless from and against any third-party claims, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to (a) Your Content, (b) your use of the Services in breach of these Terms or the AUP, or (c) your violation of any law or third-party right.</p>
      </Section>

      <Section title="15. Governing law & dispute resolution">
        <p>These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. The exclusive venue for any dispute that is not subject to arbitration will be the state and federal courts located in New Castle County, Delaware, and each party consents to that jurisdiction.</p>
        <p><strong className="text-foreground">Arbitration (US users only).</strong> Any dispute, claim, or controversy arising out of or related to these Terms or the Services will be resolved by binding individual arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, and not in a class, consolidated, or representative action. You may opt out of this arbitration agreement by emailing legal@deploybro.app within 30 days of first accepting these Terms. Either party may bring qualifying claims in small-claims court.</p>
      </Section>

      <Section title="16. Changes to these Terms">
        <p>We may modify these Terms from time to time. Material changes will take effect no sooner than 30 days after we post the updated Terms or send notice, whichever is later. Your continued use of the Services after that date constitutes acceptance of the updated Terms. If you do not agree, you must stop using the Services.</p>
      </Section>

      <Section title="17. General">
        <p>These Terms, together with the Privacy Policy, the AUP, the Cookie Policy, and (where applicable) the Data Processing Addendum, constitute the entire agreement between you and DeployBro regarding the Services and supersede any prior agreements. If any provision is found unenforceable, the remaining provisions will remain in full force. Our failure to enforce any right is not a waiver of that right. You may not assign these Terms without our written consent; we may assign these Terms in connection with a merger, acquisition, or sale of assets. Notices to you may be sent by email to the address on file or by in-product notice; notices to us must be sent to legal@deploybro.app and to our postal address below.</p>
      </Section>

      <Section title="18. Contact">
        <p>DeployBro, Inc., Attn: Legal, 548 Market St #84321, San Francisco, CA 94104, USA. Email: <span className="text-primary font-mono">legal@deploybro.app</span>.</p>
      </Section>
    </Shell>
  );
}

export function AcceptableUse() {
  return (
    <Shell
      eyebrow="Acceptable use"
      title="Acceptable Use Policy"
      intro="What you can — and absolutely can't — build and host on DeployBro. We keep this short on purpose, but we enforce it strictly."
      prose
    >
      <LegalMeta />

      <Section title="1. Purpose">
        <p>This Acceptable Use Policy ("AUP") describes activities that are prohibited on DeployBro. It applies to anyone who accesses the Services, including all end users of apps you publish on DeployBro. Violation of this AUP is a material breach of our Terms of Service and may result in suspension, termination, removal of content, and reporting to law enforcement.</p>
      </Section>

      <Section title="2. Prohibited content">
        <p>You may not use the Services to host, generate, store, or transmit content that:</p>
        <ul className="space-y-2 list-disc ml-5">
          <li>Sexually exploits or endangers minors in any way (CSAM), including AI-generated material. We report this to NCMEC and to law enforcement worldwide and do not give second chances.</li>
          <li>Promotes, incites, or facilitates violence, terrorism, self-harm, or genocide.</li>
          <li>Promotes or organizes hatred, harassment, or discrimination against people based on race, ethnicity, national origin, religion, gender, sexual orientation, disability, or other protected characteristics.</li>
          <li>Infringes intellectual property rights or misappropriates trade secrets.</li>
          <li>Constitutes non-consensual intimate imagery, doxxing, or revenge porn.</li>
          <li>Defames, libels, or threatens any person.</li>
          <li>Impersonates another person, organization, or DeployBro itself.</li>
          <li>Misleads users about the source of an app, or that an app is officially affiliated with DeployBro.</li>
          <li>Distributes malware, viruses, ransomware, spyware, or any code intended to disable or harm devices, networks, or data.</li>
        </ul>
      </Section>

      <Section title="3. Prohibited conduct">
        <p>You may not use the Services to:</p>
        <ul className="space-y-2 list-disc ml-5">
          <li>Send spam, unsolicited bulk email, SMS, push notifications, or to operate phishing campaigns.</li>
          <li>Run cryptocurrency mining, proof-of-work workloads, or other resource-abusive computation that is not the intended purpose of an end-user app.</li>
          <li>Operate unlawful gambling, unregistered securities offerings, multi-level marketing schemes, or pyramid schemes.</li>
          <li>Operate command-and-control infrastructure for malware, botnets, or credential-stuffing.</li>
          <li>Conduct unauthorized vulnerability research, scanning, or penetration testing against the Services or any third party.</li>
          <li>Circumvent rate limits, abuse free trials, create fake accounts, or evade bans.</li>
          <li>Train machine-learning models on Output or Services behavior in violation of these Terms or the AUP.</li>
          <li>Use the Services in violation of US, EU, UK, or other applicable export controls or economic sanctions.</li>
        </ul>
      </Section>

      <Section title="4. Apps that handle sensitive data">
        <p>If your app processes regulated data (PHI, PCI cardholder data, biometric data, government IDs, or personal data of children) you are responsible for any additional compliance obligations. The DeployBro free and standard plans are not certified to host PHI under HIPAA. Contact <span className="text-primary font-mono">compliance@deploybro.app</span> if you need a Business Associate Agreement or PCI-scope review.</p>
      </Section>

      <Section title="5. Reporting abuse">
        <p>If you see something on a DeployBro-hosted app that violates this AUP, please report it to <span className="text-primary font-mono">abuse@deploybro.app</span>. Include the URL, a description of the issue, and any evidence. We act on credible reports quickly. For child safety reports we operate a 24/7 escalation channel.</p>
      </Section>

      <Section title="6. Enforcement">
        <p>We may, in our sole discretion, remove or disable access to content, suspend or terminate accounts, throttle resource usage, or take any other action we believe is appropriate to enforce this AUP, with or without notice. Where we believe a serious or imminent risk to people exists, we may act immediately and without notice. Repeat infringers will lose access to the Services.</p>
      </Section>

      <Section title="7. Changes">
        <p>We may update this AUP at any time. Material changes will be announced at least 14 days in advance. Continued use of the Services after the change constitutes acceptance.</p>
      </Section>
    </Shell>
  );
}

export function CookiePolicy() {
  const cookies = [
    { name: "deploybro_session", purpose: "Keeps you signed in to your account.", category: "Strictly necessary", duration: "Session" },
    { name: "deploybro_csrf", purpose: "Prevents cross-site request forgery on form submissions.", category: "Strictly necessary", duration: "Session" },
    { name: "deploybro_theme", purpose: "Remembers your light/dark mode preference.", category: "Functional", duration: "1 year" },
    { name: "deploybro_consent", purpose: "Records your cookie consent choices.", category: "Strictly necessary", duration: "1 year" },
    { name: "_ph_*", purpose: "First-party product analytics — anonymous usage patterns.", category: "Analytics", duration: "13 months" },
    { name: "_stripe_*", purpose: "Set by Stripe to detect fraud during checkout.", category: "Strictly necessary", duration: "1 year" },
  ];
  return (
    <Shell
      eyebrow="Cookies"
      title="Cookie policy"
      intro="A short list of the cookies we set, why we set them, and how to turn them off."
      prose
    >
      <LegalMeta />

      <Section title="1. What is a cookie?">
        <p>A cookie is a small text file that a website stores on your device to remember information between visits. We also use related technologies — local storage, session storage, and pixel tags — and refer to all of them collectively as "cookies" in this policy.</p>
      </Section>

      <Section title="2. The cookies we set">
        <p>We aim to use as few cookies as possible. The current list is:</p>
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs font-mono uppercase tracking-wider text-secondary border-b border-border">
            <div className="col-span-3">Name</div>
            <div className="col-span-5">Purpose</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Duration</div>
          </div>
          {cookies.map((c, i) => (
            <div
              key={c.name}
              className={`grid grid-cols-12 gap-2 px-5 py-3 text-sm ${i < cookies.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="col-span-3 font-mono text-foreground">{c.name}</div>
              <div className="col-span-5 text-secondary">{c.purpose}</div>
              <div className="col-span-2 text-secondary">{c.category}</div>
              <div className="col-span-2 text-secondary">{c.duration}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="3. Third-party cookies">
        <p>We avoid third-party cookies on our marketing site. Stripe sets its own cookies during checkout to detect fraud, in accordance with the <a href="https://stripe.com/cookies-policy/legal" className="text-primary hover:underline">Stripe Cookies Policy</a>. We do not use cookies for advertising and we do not participate in any cross-site advertising network.</p>
      </Section>

      <Section title="4. Your choices">
        <p>You can refuse non-essential cookies via the consent banner shown on first visit, or change your preferences any time from the cookie preferences link in the footer. You can also block or delete cookies in your browser settings. Note that strictly necessary cookies cannot be disabled, because the site will not function without them. We honor the Global Privacy Control (GPC) signal: when GPC is set, we treat your visit as a "do not sell or share" request.</p>
      </Section>

      <Section title="5. Cookies inside your published apps">
        <p>When you publish an app on deploybro.app, that app may set its own cookies under your project's subdomain. Those cookies are controlled by you, the app owner, and you are responsible for disclosing them in your own app's privacy notice.</p>
      </Section>

      <Section title="6. Changes">
        <p>If we add or remove cookies we will update this page. The "Effective" date at the top reflects the latest revision.</p>
      </Section>
    </Shell>
  );
}

export function DPA() {
  return (
    <Shell
      eyebrow="Data processing"
      title="Data Processing Addendum"
      intro="The DPA that governs DeployBro's processing of personal data on your behalf when you use the Services to build and operate apps for your end users."
      prose
    >
      <LegalMeta />

      <Section title="1. How this DPA works">
        <p>This Data Processing Addendum ("DPA") is incorporated into and forms part of the agreement between you ("Controller") and DeployBro, Inc. ("Processor") for the use of the DeployBro Services (the "Agreement"). It applies to the extent that DeployBro processes Personal Data (as defined in applicable Data Protection Laws) on your behalf in connection with the Services. By accepting our Terms of Service you also accept this DPA. If you require a counter-signed copy, email <span className="text-primary font-mono">dpa@deploybro.app</span>.</p>
      </Section>

      <Section title="2. Definitions">
        <p>"Data Protection Laws" means the EU General Data Protection Regulation 2016/679 ("GDPR"), the UK GDPR, the Swiss Federal Act on Data Protection, the California Consumer Privacy Act as amended by the CPRA, and other applicable data protection or privacy laws. "Personal Data", "Processing", "Controller", "Processor", "Sub-processor", "Data Subject", and "Supervisory Authority" have the meanings given in the GDPR.</p>
      </Section>

      <Section title="3. Roles & scope">
        <p>For Personal Data submitted to the Services in connection with apps built on DeployBro, you are the Controller and DeployBro is the Processor. The subject matter of the Processing is the operation of the Services. The duration is the term of the Agreement plus any deletion period. Categories of Data Subjects and types of Personal Data are determined by you and may include end users of your apps, their identifiers, profile data, content, and usage data.</p>
      </Section>

      <Section title="4. DeployBro's obligations">
        <p>DeployBro will: (a) process Personal Data only on your documented instructions, including with regard to international transfers, unless otherwise required by law; (b) ensure that personnel authorized to process Personal Data are subject to confidentiality obligations; (c) implement appropriate technical and organizational measures (see Annex II) to ensure a level of security appropriate to the risk; (d) assist you, taking into account the nature of the Processing, in fulfilling your obligations to respond to Data Subject requests and to conduct data protection impact assessments and prior consultations; (e) notify you without undue delay (and in any event within 72 hours) after becoming aware of a Personal Data breach; and (f) at your choice, delete or return all Personal Data after the end of the provision of the Services, save to the extent we are required to retain copies by law.</p>
      </Section>

      <Section title="5. Sub-processors">
        <p>You authorize DeployBro to engage Sub-processors to provide the Services, subject to a written agreement imposing data protection obligations no less protective than those in this DPA. Our current list of Sub-processors is published at <span className="text-primary font-mono">deploybro.app/subprocessors</span> and includes our cloud host, our managed Postgres provider, our edge/CDN, our model providers, our payment processor, and our email and observability providers. We will provide at least 30 days' notice of any new Sub-processor by email or in-product notice. You may object on reasonable, documented data-protection grounds, in which case we will work with you in good faith on a resolution and, failing one, you may terminate the affected Service.</p>
      </Section>

      <Section title="6. International transfers">
        <p>Where Personal Data of Data Subjects in the EEA, UK, or Switzerland is transferred to a country without an adequacy decision, the parties agree that the EU Standard Contractual Clauses (Module 2: Controller-to-Processor) issued by the European Commission Decision 2021/914 are incorporated by reference and apply to such transfer, with the optional docking clause selected and the United Kingdom IDTA applied where the UK GDPR is engaged. Annex I.A (Parties), Annex I.B (Description of Transfer), Annex I.C (Competent Supervisory Authority), Annex II (Security Measures), and Annex III (Sub-processors) of the SCCs are deemed completed using the information provided in the Agreement, this DPA, and the linked Sub-processor list.</p>
      </Section>

      <Section title="7. Security measures (Annex II summary)">
        <ul className="space-y-2 list-disc ml-5">
          <li>Encryption of Personal Data in transit (TLS 1.2+) and at rest (AES-256).</li>
          <li>Hardware-backed key management with regular key rotation.</li>
          <li>Logical isolation of Customer environments and per-tenant credentials.</li>
          <li>Role-based access control with single sign-on, mandatory 2FA, and least-privilege provisioning.</li>
          <li>Centralized audit logging with retention of at least 18 months.</li>
          <li>Continuous vulnerability scanning, dependency monitoring, and quarterly patch reviews.</li>
          <li>Annual third-party penetration test and SOC 2 Type II audit.</li>
          <li>Documented incident-response plan with tabletop exercises at least annually.</li>
          <li>Background checks for personnel with access to production systems, where lawful.</li>
          <li>Secure SDLC with mandatory peer review and automated testing on every change.</li>
        </ul>
      </Section>

      <Section title="8. Audits">
        <p>You may, on reasonable prior written notice and no more than once per year (except after a confirmed Personal Data breach), audit DeployBro's compliance with this DPA. Audits will be conducted during business hours, in a way that does not unreasonably interfere with our operations, subject to confidentiality, and at your expense. To minimize disruption, we will first provide our most recent SOC 2 Type II report and ISO-aligned controls documentation, which should satisfy most audit requirements.</p>
      </Section>

      <Section title="9. Liability">
        <p>Each party's liability under this DPA is subject to the limitations and exclusions of liability set out in the Agreement. Nothing in this DPA limits a Data Subject's rights under applicable Data Protection Laws.</p>
      </Section>

      <Section title="10. Term & termination">
        <p>This DPA takes effect on the date you accept it (or, if later, the date Personal Data is first processed under the Agreement) and continues until the Agreement ends or DeployBro stops processing Personal Data on your behalf, whichever is later. Sections 4, 6, 9, and 11 survive termination.</p>
      </Section>

      <Section title="11. Order of precedence & contact">
        <p>If there is a conflict between this DPA and the Agreement, this DPA controls with respect to the Processing of Personal Data. If there is a conflict between this DPA and the Standard Contractual Clauses, the Clauses control. Questions: <span className="text-primary font-mono">dpa@deploybro.app</span>.</p>
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

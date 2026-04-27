import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  GitCommit,
  LayoutTemplate,
  Activity as ActivityIcon,
  Building2,
  Briefcase,
  Lock,
  Scale,
  Compass,
  ShieldAlert,
  Cookie,
  FileLock2,
  CheckCircle2,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";

const MARKETING_LINKS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/how-it-works", label: "How it works", icon: LayoutTemplate },
  { href: "/changelog", label: "Changelog", icon: GitCommit },
  { href: "/status", label: "Status", icon: ActivityIcon },
  { href: "/about", label: "About", icon: Building2 },
  { href: "/careers", label: "Careers", icon: Briefcase },
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

export function HowItWorks() {
  return (
    <Shell
      eyebrow="How it works"
      title="How DeployBro works"
      intro="A simple path from prompt to published app."
    >
      <div className="space-y-6">
        {[
          ["Describe the app", "Tell DeployBro what you want in plain English."],
          ["Watch it build", "The editor, preview, and data layer appear together."],
          ["Publish it", "DeployBro provisions everything and gives you a live URL."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-bold mb-2">{title}</h3>
            <p className="text-secondary">{body}</p>
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
      date: "April 27, 2026",
      version: "v2.0",
      items: [
        "Auto-screenshots for every published project on Explore and the homepage.",
        "Public/private visibility toggle on dashboard project cards.",
        "Full-width dashboard pages and a tighter Resources sidebar.",
      ],
    },
    {
      date: "April 12, 2026",
      version: "v1.9",
      items: [
        "Affiliate earnings dashboard with payouts in £.",
        "One-click publish to deploybro.app subdomains with Postgres provisioned.",
      ],
    },
    {
      date: "March 28, 2026",
      version: "v1.8",
      items: [
        "Builder navigation refresh with sticky preview toolbar.",
        "Anthropic Claude Sonnet upgraded for faster first turn.",
      ],
    },
  ];
  return (
    <Shell
      eyebrow="Changelog"
      title="What's new"
      intro="Recent updates to the DeployBro builder, runtime, and dashboard."
    >
      <div className="space-y-8">
        {entries.map((e) => (
          <div key={e.version} className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-sm font-mono text-primary">{e.version}</span>
              <span className="text-xs text-secondary">{e.date}</span>
            </div>
            <ul className="space-y-2 text-sm text-secondary">
              {e.items.map((it) => (
                <li key={it} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function Status() {
  const services = [
    { name: "Builder API", status: "Operational" },
    { name: "AI generation", status: "Operational" },
    { name: "Deployments", status: "Operational" },
    { name: "Database provisioning", status: "Operational" },
    { name: "Web app", status: "Operational" },
  ];
  return (
    <Shell
      eyebrow="Status"
      title="System status"
      intro="Real-time health of the DeployBro platform."
    >
      <div className="rounded-xl border border-border bg-surface p-6 mb-8 flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="font-medium">All systems operational</span>
      </div>
      <div className="rounded-xl border border-border bg-surface divide-y divide-border">
        {services.map((s) => (
          <div key={s.name} className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm">{s.name}</span>
            <span className="inline-flex items-center gap-2 text-xs font-mono text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function About() {
  return (
    <Shell
      eyebrow="About"
      title="About DeployBro"
      intro="We help anyone ship real software from a single prompt."
    >
      <Section title="Our mission">
        <p>
          Building software should feel like writing — not configuring. DeployBro
          turns plain English into working apps, complete with auth, a Postgres
          database, and a live URL, so you can spend your time on the idea
          rather than the plumbing.
        </p>
      </Section>
      <Section title="How we got here">
        <p>
          DeployBro started as a weekend experiment in 2025 and grew into a
          full-stack AI builder used by indie hackers, founders, and product
          teams to ship MVPs in hours instead of weeks.
        </p>
      </Section>
      <CTA />
    </Shell>
  );
}

export function Careers() {
  return (
    <Shell
      eyebrow="Careers"
      title="Work with us"
      intro="A small, remote team building tools that turn ideas into shipped products."
    >
      <Section title="What we value">
        <p>
          Taste, speed, and a bias for shipping. We sweat the details so our
          users don't have to.
        </p>
      </Section>
      <Section title="Open roles">
        <p>
          We're not actively hiring right now, but we always want to meet
          thoughtful builders. Drop us a line at{" "}
          <a className="text-primary hover:underline" href="mailto:hello@deploybro.app">
            hello@deploybro.app
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}

export function Privacy() {
  return (
    <Shell eyebrow="Privacy" title="Privacy policy" prose>
      <LegalMeta />
      <Section title="What we collect">
        <p>
          Account information you provide (email, username), the prompts and
          files you create in the builder, and basic usage telemetry needed to
          run and improve the service.
        </p>
      </Section>
      <Section title="How we use it">
        <p>
          To operate the builder, deploy your projects, bill you correctly,
          provide support, and improve the product. We don't sell your data.
        </p>
      </Section>
      <Section title="Your rights">
        <p>
          You can export or delete your data at any time from your account
          settings, or by emailing{" "}
          <a className="text-primary hover:underline" href="mailto:privacy@deploybro.app">
            privacy@deploybro.app
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell eyebrow="Terms" title="Terms of service" prose>
      <LegalMeta />
      <Section title="Use of the service">
        <p>
          You may use DeployBro to build, deploy, and operate your own
          applications. You're responsible for the content you create and for
          complying with our acceptable use policy.
        </p>
      </Section>
      <Section title="Plans & billing">
        <p>
          Paid plans are billed in £ on a recurring basis until cancelled. You
          can change or cancel your plan at any time from the billing page.
        </p>
      </Section>
      <Section title="Liability">
        <p>
          DeployBro is provided "as is" without warranties of any kind to the
          maximum extent permitted by law.
        </p>
      </Section>
    </Shell>
  );
}

export function AcceptableUse() {
  return (
    <Shell eyebrow="Acceptable use" title="Acceptable use policy" prose>
      <LegalMeta />
      <Section title="Don't">
        <p>
          Build or host content that's illegal, infringes others' rights,
          targets minors, distributes malware, scrapes or attacks third-party
          services, or harasses other users.
        </p>
      </Section>
      <Section title="Do">
        <p>
          Use DeployBro to ship real, useful software. If you're unsure whether
          something is allowed, ask us at{" "}
          <a className="text-primary hover:underline" href="mailto:trust@deploybro.app">
            trust@deploybro.app
          </a>
          .
        </p>
      </Section>
    </Shell>
  );
}

export function CookiePolicy() {
  return (
    <Shell eyebrow="Cookies" title="Cookie policy" prose>
      <LegalMeta />
      <Section title="What we use cookies for">
        <p>
          Keeping you signed in, remembering your preferences (theme, sidebar
          state), and basic anonymous analytics so we can see which features
          are actually used.
        </p>
      </Section>
      <Section title="Managing cookies">
        <p>
          You can clear or block cookies in your browser settings. Some parts
          of DeployBro (notably sign-in) won't work without them.
        </p>
      </Section>
    </Shell>
  );
}

export function DPA() {
  return (
    <Shell eyebrow="Data processing" title="Data processing addendum" prose>
      <LegalMeta />
      <Section title="Scope">
        <p>
          This DPA applies when DeployBro processes personal data on behalf of
          a customer in connection with the service.
        </p>
      </Section>
      <Section title="Subprocessors">
        <p>
          We rely on a small set of trusted infrastructure providers (hosting,
          database, email, payments). The current list is available on
          request from{" "}
          <a className="text-primary hover:underline" href="mailto:privacy@deploybro.app">
            privacy@deploybro.app
          </a>
          .
        </p>
      </Section>
      <Section title="Security">
        <p>
          All data is transmitted over TLS, secrets are encrypted at rest, and
          access is restricted to the engineers who need it for support.
        </p>
      </Section>
    </Shell>
  );
}

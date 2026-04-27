import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
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
  Book,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";
import { useTemplates } from "@/lib/api";

const MARKETING_LINKS = [
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/how-it-works", label: "How it works", icon: LayoutTemplate },
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
  return null;
}
export function Templates() {
  return null;
}
export function Status() {
  return null;
}
export function Blog() {
  return null;
}
export function About() {
  return null;
}
export function Careers() {
  return null;
}
export function Privacy() {
  return null;
}
export function Terms() {
  return null;
}
export function Community() {
  return null;
}
export function AcceptableUse() {
  return null;
}
export function CookiePolicy() {
  return null;
}
export function DPA() {
  return null;
}

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

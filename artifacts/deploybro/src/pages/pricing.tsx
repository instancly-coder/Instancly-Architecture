import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Coins,
  Shield,
  ChevronDown,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Button } from "@/components/ui/button";
// Pricing tiers + the visual TierCard live in `tier-card.tsx` so the
// onboarding flow can render the same cards without duplicating the
// price tables. Edit prices/features there, not here.
import { TierCard, TIERS, type Cadence } from "@/components/tier-card";

const TOPUP_PACKS = [
  { amount: 10, label: "Topper", description: "Finish the project you're mid-flow on." },
  { amount: 25, label: "Sprint", description: "A full weekend of Sonnet generation.", highlight: true },
  { amount: 50, label: "Builder", description: "For heavy iteration weeks and rebuilds." },
];

const STRATEGIC_NOTES = [
  {
    icon: Sparkles,
    title: "Smart model routing",
    body: "Free uses Haiku 4.5 for cheap, fast iteration. Paid plans unlock Sonnet and Opus for complex generations — automatically routed by task complexity.",
  },
  {
    icon: Coins,
    title: "A balance that doesn't disappear",
    body: "Pro carries up to $10 of unused balance into the following month. No more racing the clock at the end of a billing cycle.",
  },
  {
    icon: Zap,
    title: "Top up any time",
    body: "Run out mid-build? Buy a $10, $25, or $50 top-up on demand. No plan upgrade, no friction, no waiting.",
  },
  {
    icon: Shield,
    title: "Annual saves you 20%",
    body: "Pay yearly and Pro drops to $16/month — billed $192 once. We'd rather give you a discount than chase you with renewal emails.",
  },
];

const FAQS = [
  {
    q: "How does usage-based billing work?",
    a: "Your monthly plan includes a dollar amount of usage (Free: $2.50, Pro: $20). Every generation deducts from that balance at our pass-through model rate. A typical generation on Haiku costs $0.001–0.005, on Sonnet $0.05–0.30, and on Opus $0.20–1.00 depending on length and context.",
  },
  {
    q: "What happens if I use up my monthly balance?",
    a: "Generations pause until you top up or your monthly allotment refreshes. Your projects stay live, your code stays yours, nothing is deleted.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard and you'll keep Pro access through the end of your current billing period. We refund within 14 days, no questions asked.",
  },
  {
    q: "Do you offer discounts for students or open source?",
    a: "Yes. Email hello@deploybro.app from your .edu address or with a link to your maintained OSS project and we'll get you sorted.",
  },
  {
    q: "Will my unused balance roll over forever?",
    a: "Pro accounts roll over up to $10 of unused balance per month. Anything beyond $10 expires — keeps the system honest without punishing busy months.",
  },
  {
    q: "When do Teams plans launch?",
    a: "Q3 2026. Join the waitlist and we'll get you in early with founder pricing locked in.",
  },
];

function CadenceToggle({ value, onChange }: { value: Cadence; onChange: (v: Cadence) => void }) {
  return (
    <div className="inline-flex items-center p-1 rounded-full border border-border bg-surface/60 text-sm">
      <button
        onClick={() => onChange("monthly")}
        className={`px-4 py-1.5 rounded-full transition-colors ${
          value === "monthly"
            ? "bg-foreground text-background"
            : "text-secondary hover:text-foreground"
        }`}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange("annual")}
        className={`px-4 py-1.5 rounded-full transition-colors inline-flex items-center gap-2 ${
          value === "annual"
            ? "bg-foreground text-background"
            : "text-secondary hover:text-foreground"
        }`}
      >
        Annual
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            value === "annual"
              ? "bg-background/20 text-background"
              : "bg-primary/15 text-primary"
          }`}
        >
          -20%
        </span>
      </button>
    </div>
  );
}

function FaqItem({ q, a, id }: { q: string; a: string; id: string }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-panel-${id}`;
  const buttonId = `faq-button-${id}`;
  return (
    <div className="border-b border-border">
      <button
        id={buttonId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="font-medium group-hover:text-primary transition-colors">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-secondary shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="pb-5 text-sm text-secondary leading-relaxed"
        >
          {a}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: ReactNode }) {
  return (
    <div className="text-center mb-12">
      {eyebrow && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-4 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {eyebrow}
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h2>
      {intro && (
        <p className="mt-4 text-secondary max-w-2xl mx-auto">{intro}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const [cadence, setCadence] = useState<Cadence>("monthly");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.04] [background-size:32px_32px]"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-14 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6 backdrop-blur-md bg-foreground/[0.04] dark:bg-foreground/[0.06] border border-border/80 text-foreground/80 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Pricing
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5">
              Pay for what you ship.
              <br />
              <span className="text-primary italic font-black">Nothing else.</span>
            </h1>
            <p className="text-lg text-secondary max-w-2xl mx-auto mb-8">
              Transparent usage-based pricing in plain dollars. Top up when you
              need to. Cancel any time. No seat tax, no overage surprises.
            </p>
            <div className="flex justify-center">
              <CadenceToggle value={cadence} onChange={setCadence} />
            </div>
          </div>
        </section>

        {/* Tiers */}
        <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5">
            {TIERS.map((tier) => (
              <TierCard key={tier.id} tier={tier} cadence={cadence} />
            ))}
          </div>
          <p className="text-center text-xs font-mono text-secondary mt-8">
            All prices in USD. Taxes calculated at checkout.
          </p>
        </section>

        {/* Top-ups */}
        <section className="border-t border-border bg-surface/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-20">
            <SectionHeader
              eyebrow="Top-ups"
              title="Need more usage? Buy a top-up."
              intro="Available on every plan, including Free. No subscription change required — the balance is added instantly and never expires."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              {TOPUP_PACKS.map((pack) => (
                <div
                  key={pack.amount}
                  className={`relative rounded-xl border p-6 text-center ${
                    pack.highlight
                      ? "border-primary/40 bg-surface shadow-lg shadow-primary/10"
                      : "border-border bg-surface/60"
                  }`}
                >
                  {pack.highlight && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary text-primary-foreground">
                      Best value
                    </div>
                  )}
                  <div className="text-xs font-mono uppercase tracking-wider text-secondary mb-2">
                    {pack.label}
                  </div>
                  <div className="text-4xl font-bold tracking-tight mb-1">${pack.amount}</div>
                  <div className="text-xs font-mono text-primary mb-4">+${pack.amount} of usage</div>
                  <p className="text-sm text-secondary">{pack.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategic notes */}
        <section className="px-4 sm:px-8 py-20 max-w-7xl mx-auto w-full">
          <SectionHeader
            eyebrow="Why our pricing works"
            title="Built so you don't get burned."
            intro="We've all been on the wrong end of a usage-based bill. These four design choices keep that from happening here."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {STRATEGIC_NOTES.map((note) => {
              const Icon = note.icon;
              return (
                <div
                  key={note.title}
                  className="rounded-xl border border-border bg-surface/60 p-6"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{note.title}</h3>
                  <p className="text-sm text-secondary leading-relaxed">{note.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-surface/40">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-20">
            <SectionHeader eyebrow="FAQ" title="Common questions." />
            <div>
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} id={String(i)} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 sm:px-8 py-20 max-w-5xl mx-auto w-full">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-10 sm:p-14 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_70%)]" />
            <div className="relative">
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Start free. Ship today.
              </h3>
              <p className="text-secondary mb-7 max-w-xl mx-auto">
                $2.50 of usage the moment you sign up. No card required.
                Upgrade only when your projects start paying for themselves.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/login">
                    Start building <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-border">
                  <Link href="/docs">Read the docs</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

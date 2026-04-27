import { Link } from "wouter";
import {
  Check,
  Minus,
  ArrowRight,
  Sparkles,
  Zap,
  Users,
  Coins,
  Layers,
  Globe,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type Cadence = "monthly" | "annual";

export type Tier = {
  id: "free" | "pro" | "teams";
  name: string;
  tagline: string;
  priceMonthly: number;
  priceAnnual: number;
  priceSuffix: string;
  cta: { label: string; href: string };
  highlight?: boolean;
  comingSoon?: boolean;
  customPrice?: string;
  features: { label: string; sub?: string; icon?: LucideIcon }[];
};

// Single source of truth for the three plan tiers. Both the marketing
// pricing page (/pricing) and the post-signup onboarding flow render
// from this list so the two stay visually + economically in sync.
// If you change a price here, change it everywhere by changing it ONCE
// here.
export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Kick the tires. Build a side project. Ship a weekend prototype.",
    priceMonthly: 0,
    priceAnnual: 0,
    priceSuffix: "forever",
    cta: { label: "Start free", href: "/login" },
    features: [
      { label: "$2.50 of usage each month", icon: Coins },
      { label: "1 active project", icon: Layers },
      { label: "Claude Haiku 4.5", sub: "Fast model, great for iterating", icon: Sparkles },
      { label: "Community support", icon: Users },
      { label: "No third-party integrations", icon: Minus },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For builders shipping real apps with real users.",
    priceMonthly: 20,
    priceAnnual: 16,
    priceSuffix: "per month",
    cta: { label: "Upgrade to Pro", href: "/login" },
    highlight: true,
    features: [
      { label: "$20 of usage each month", sub: "Unused balance rolls over up to $10", icon: Coins },
      { label: "Unlimited projects", icon: Layers },
      { label: "Claude Sonnet 4.5 + Opus", sub: "Smartest models for complex tasks", icon: Sparkles },
      { label: "One-click Vercel deployment", icon: Zap },
      { label: "Neon Postgres integration", icon: Globe },
      { label: "GitHub sync", icon: Globe },
      { label: "Custom domain", icon: Globe },
      { label: "Priority support", icon: Shield },
    ],
  },
  {
    id: "teams",
    name: "Teams",
    tagline: "Built for design partners, agencies, and product squads.",
    priceMonthly: 49,
    priceAnnual: 49,
    priceSuffix: "per seat / month",
    customPrice: "$49–59",
    cta: { label: "Join the waitlist", href: "/login" },
    comingSoon: true,
    features: [
      { label: "Everything in Pro", icon: Check },
      { label: "Shared project workspace", icon: Users },
      { label: "Pooled team balance", icon: Coins },
      { label: "Role-based access control", icon: Shield },
      { label: "SSO / SAML", icon: Shield },
      { label: "Per-seat usage analytics", icon: Globe },
      { label: "Dedicated support", icon: Shield },
    ],
  },
];

type TierCardProps = {
  tier: Tier;
  cadence: Cadence;
  // When `selectable`, the entire card becomes a clickable button (used
  // by the onboarding flow to pick a plan). The CTA link at the bottom
  // is suppressed in that mode and the caller controls highlight via
  // `selected`. The visual styling otherwise stays identical to the
  // marketing pricing card.
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

export function TierCard({ tier, cadence, selectable, selected, onSelect }: TierCardProps) {
  const price = cadence === "annual" ? tier.priceAnnual : tier.priceMonthly;
  const showAnnualNote = cadence === "annual" && tier.priceAnnual !== tier.priceMonthly;

  // Compose the wrapper className. `selected` overrides the highlight
  // styling so the user's pick reads as "this one" regardless of which
  // tier is the marketing default.
  const wrapperClass = [
    "relative flex flex-col rounded-2xl border p-5 sm:p-7 text-left transition-all",
    tier.highlight
      ? "border-primary/40 bg-surface shadow-2xl shadow-primary/10"
      : "border-border bg-surface/60",
    selectable ? "cursor-pointer hover:border-primary/60 hover:bg-surface" : "",
    selected ? "border-primary bg-surface ring-2 ring-primary/40" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Top badge: "Selected" beats "Most popular" beats "Coming soon".
  const badge = selected ? (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary text-primary-foreground inline-flex items-center gap-1">
      <Check className="w-3 h-3" /> Selected
    </div>
  ) : tier.highlight ? (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary text-primary-foreground">
      Most popular
    </div>
  ) : tier.comingSoon ? (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-surface-raised border border-border text-secondary">
      Coming soon
    </div>
  ) : null;

  const body = (
    <>
      {badge}

      <div className="mb-5">
        <h3 className="text-xl font-bold">{tier.name}</h3>
        <p className="mt-2 text-sm text-secondary leading-relaxed min-h-[40px]">
          {tier.tagline}
        </p>
      </div>

      <div className="mb-6 pb-6 border-b border-border">
        <div className="flex items-baseline gap-1.5">
          {tier.customPrice ? (
            <span className="text-4xl font-bold tracking-tight">{tier.customPrice}</span>
          ) : (
            <>
              <span className="text-5xl font-bold tracking-tight">${price}</span>
              <span className="text-sm text-secondary">
                {price === 0 ? tier.priceSuffix : "/ mo"}
              </span>
            </>
          )}
        </div>
        {showAnnualNote && (
          <p className="mt-2 text-xs font-mono text-primary">
            Billed ${tier.priceAnnual * 12} annually · Save ${(tier.priceMonthly - tier.priceAnnual) * 12}/yr
          </p>
        )}
        {!showAnnualNote && tier.id === "pro" && cadence === "monthly" && (
          <p className="mt-2 text-xs font-mono text-secondary">
            Or save 20% with annual billing
          </p>
        )}
        {tier.id === "teams" && (
          <p className="mt-2 text-xs font-mono text-secondary">{tier.priceSuffix}</p>
        )}
      </div>

      <ul className="space-y-3 mb-7 flex-1">
        {tier.features.map((feat) => {
          const Icon = feat.icon ?? Check;
          const muted = Icon === Minus;
          return (
            <li key={feat.label} className="flex items-start gap-3 text-sm">
              <span
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  muted
                    ? "bg-surface-raised text-secondary"
                    : tier.highlight
                    ? "bg-primary/15 text-primary"
                    : "bg-foreground/[0.06] text-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
              </span>
              <div className={muted ? "text-secondary" : ""}>
                <div className={muted ? "" : "text-foreground"}>{feat.label}</div>
                {feat.sub && (
                  <div className="text-xs text-secondary mt-0.5">{feat.sub}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!selectable && (
        <Button
          asChild
          className={`w-full ${
            tier.highlight
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : tier.comingSoon
              ? "bg-surface-raised text-foreground hover:bg-surface-raised/80 border border-border"
              : "bg-foreground text-background hover:bg-foreground/90"
          }`}
        >
          <Link href={tier.cta.href}>
            {tier.cta.label}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      )}
    </>
  );

  if (selectable) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={wrapperClass}
      >
        {body}
      </button>
    );
  }

  return <div className={wrapperClass}>{body}</div>;
}

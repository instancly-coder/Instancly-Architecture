import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Palette,
  ClipboardList,
  GraduationCap,
  Hammer,
  MoreHorizontal,
  Search,
  Twitter,
  Youtube,
  MessageSquareHeart,
  Users as UsersIcon,
  Rocket,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMe, useCompleteOnboarding, type CompleteOnboardingBody } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TIERS, TierCard } from "@/components/tier-card";

// Slug unions are sourced from the generated zod schema so the option
// lists below stay in lock-step with the API's allowlist (and a typo
// here is a TS error, not a runtime 400).
type RoleSlug = CompleteOnboardingBody["role"];
type SourceSlug = CompleteOnboardingBody["signupSource"];
type PlanSlug = CompleteOnboardingBody["plan"];

type RoleOption = { value: RoleSlug; label: string; icon: LucideIcon };
type SourceOption = { value: SourceSlug; label: string; icon: LucideIcon };

const ROLES: RoleOption[] = [
  { value: "developer", label: "Developer", icon: Code2 },
  { value: "entrepreneur", label: "Entrepreneur", icon: Rocket },
  { value: "designer", label: "Designer", icon: Palette },
  { value: "product_manager", label: "Product Manager", icon: ClipboardList },
  { value: "student", label: "Student", icon: GraduationCap },
  { value: "hobbyist", label: "Hobbyist", icon: Hammer },
  { value: "other", label: "Something else", icon: MoreHorizontal },
];

// Acquisition source options. Slugs come from the generated body type
// (see RoleSlug/SourceSlug above) so they stay in lock-step with the
// API's allowlist.
const SOURCES: SourceOption[] = [
  { value: "google", label: "Google", icon: Search },
  { value: "twitter", label: "Twitter / X", icon: Twitter },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "reddit", label: "Reddit", icon: MessageSquareHeart },
  { value: "producthunt", label: "Product Hunt", icon: Rocket },
  { value: "friend", label: "From a friend", icon: UsersIcon },
  { value: "word_of_mouth", label: "Word of mouth", icon: MessageSquareHeart },
  { value: "other", label: "Somewhere else", icon: MoreHorizontal },
];

const TOTAL_STEPS = 4;

// Multi-step welcome flow shown after the user claims a username.
// One question per "page", arrows + dot indicators along the bottom,
// final step picks a plan (free / pro / teams) and submits everything
// in a single POST. Free → /dashboard. Pro → /dashboard/billing so
// the user can finish the actual subscription via Stripe.
export default function Onboarding() {
  const [, navigate] = useLocation();
  const { data: me, isLoading } = useMe();
  const submit = useCompleteOnboarding();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  // null = unanswered. We can't use "" because the slugs are strict
  // unions now; null sidesteps that and lets `stepValid` express the
  // "must pick one" rule cleanly.
  const [role, setRole] = useState<RoleSlug | null>(null);
  const [source, setSource] = useState<SourceSlug | null>(null);
  const [plan, setPlan] = useState<PlanSlug>("free");

  // Prefill from `me` when it arrives. We also short-circuit out of the
  // flow if the user is already onboarded — useful for someone who hits
  // /onboarding directly via a stale tab or from a deep link.
  useEffect(() => {
    if (!me) return;
    setName((cur) => (cur.length === 0 ? me.displayName ?? "" : cur));
    if (me.onboardedAt) navigate("/dashboard");
  }, [me, navigate]);

  // Per-step validity. Forward arrow uses this to enable/disable.
  const stepValid = (() => {
    switch (step) {
      case 0:
        return name.trim().length >= 1 && name.trim().length <= 60;
      case 1:
        return role !== null;
      case 2:
        return source !== null;
      case 3:
        return plan.length > 0;
      default:
        return false;
    }
  })();

  const finish = async () => {
    if (role === null || source === null) return; // Belt-and-braces; stepValid blocks Finish first.
    try {
      await submit.mutateAsync({
        displayName: name.trim() || undefined,
        role,
        signupSource: source,
        plan,
      });
      // Land Pro pickers on billing so they can pay; everything else
      // goes to the dashboard. The plan column on the user row stays
      // unchanged — Stripe is the source of truth there.
      navigate(plan === "pro" ? "/dashboard/billing" : "/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save your answers.";
      toast.error(msg);
    }
  };

  const next = () => {
    if (!stepValid) return;
    if (step === TOTAL_STEPS - 1) {
      void finish();
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  if (isLoading || !me) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-secondary text-sm">
        Loading…
      </div>
    );
  }

  const titles = [
    "What should we call you?",
    "Which best describes you?",
    "How did you hear about us?",
    "Pick a plan to get started",
  ];

  return (
    <div className="relative min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Subtle radial backdrop so the page reads as "moment" rather
          than "form". Sits behind everything else (-z-10). */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.18) 0%, transparent 70%)",
        }}
      />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-3xl">
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-secondary text-center mb-2 sm:mb-3">
            Welcome to DeployBro
          </p>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-center mb-6 sm:mb-8 px-2">
            {titles[step]}
          </h1>

          <div className="sm:min-h-[300px]">
            {step === 0 && (
              <div className="max-w-md mx-auto">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-lg bg-surface border-border focus-visible:ring-primary/50"
                  placeholder="Your name"
                  autoFocus
                  maxLength={60}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && stepValid) {
                      e.preventDefault();
                      next();
                    }
                  }}
                />
                <p className="mt-2 text-xs text-secondary text-center">
                  Shows up on your profile and inside the apps you build.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const isSel = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      aria-pressed={isSel}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-5 transition-all ${
                        isSel
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                          : "border-border bg-surface/60 hover:border-primary/60 hover:bg-surface"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${isSel ? "text-primary" : "text-foreground"}`}
                      />
                      <span className="text-sm font-medium">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
                {SOURCES.map((s) => {
                  const Icon = s.icon;
                  const isSel = source === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSource(s.value)}
                      aria-pressed={isSel}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                        isSel
                          ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                          : "border-border bg-surface/60 hover:border-primary/60 hover:bg-surface"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${isSel ? "text-primary" : "text-foreground"}`}
                      />
                      <span className="text-xs font-medium text-center">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 3 && (
              // On small screens the three TierCards become a horizontal
              // snap-scrolling carousel ("swipeable"); on sm+ they fall
              // back to the same 3-column grid the pricing page uses.
              // The mobile scroller needs `pt-5` so the badges that sit
              // at `-top-3` on each card stay visible — `overflow-x-auto`
              // forces vertical overflow to clip too, so anything above
              // the card's top edge gets cut off without the padding.
              <div className="-mx-4 sm:mx-0 sm:px-0">
                {/* Mobile carousel: cards are 80vw wide with snap-center,
                    so the scroll track needs `px-[10vw]` of internal
                    padding for the FIRST and LAST cards to land in the
                    middle of the viewport at rest — without it the first
                    card sits flush-left at scroll-x=0 and reads as
                    "broken alignment". The padding is collapsed back to
                    zero at sm+ where the layout switches to a 3-col grid
                    that doesn't need horizontal scrolling. */}
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pt-5 pb-3 px-[10vw] sm:px-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:pt-3 sm:pb-0">
                  {TIERS.map((tier) => (
                    <div
                      key={tier.id}
                      className="snap-center shrink-0 w-[80vw] max-w-sm sm:w-auto sm:max-w-none flex"
                    >
                      <div className="w-full">
                        <TierCard
                          tier={tier}
                          cadence="monthly"
                          selectable
                          selected={plan === tier.id}
                          onSelect={() => setPlan(tier.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-secondary mt-4">
                  Swipe to compare · You can change this any time from billing.
                </p>
              </div>
            )}
          </div>

          {/* Footer: back arrow · dot indicators · forward arrow.
              Dots are clickable to jump back to a previous step (handy
              if the user wants to fix an answer); jumping forward past
              an unfilled step is blocked. */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              disabled={step === 0 || submit.isPending}
              className="border-border bg-surface/60 disabled:opacity-30"
              aria-label="Previous step"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div
              className="flex items-center gap-2"
              role="tablist"
              aria-label="Onboarding progress"
            >
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Go to step ${i + 1}`}
                    onClick={() => {
                      if (i <= step) setStep(i);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      active
                        ? "w-8 bg-primary"
                        : done
                        ? "w-2 bg-primary/60 hover:bg-primary/80"
                        : "w-2 bg-border"
                    }`}
                  />
                );
              })}
            </div>

            <Button
              type="button"
              onClick={next}
              disabled={!stepValid || submit.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px]"
              aria-label={step === TOTAL_STEPS - 1 ? "Finish onboarding" : "Next step"}
            >
              {submit.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === TOTAL_STEPS - 1 ? (
                <>
                  Finish <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

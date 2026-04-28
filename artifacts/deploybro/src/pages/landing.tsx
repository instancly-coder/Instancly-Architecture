import {
  ArrowUp,
  ArrowRight,
  Globe,
  Cpu,
  Check,
  Plus,
  Image as ImageIcon,
  Link2,
  ListTodo,
  ChevronDown,
  X,
  Database,
  Lock,
  Eye,
  Rocket,
  Sparkles,
  History,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { useTemplates, useMe } from "@/lib/api";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HOME_MODELS: { name: string; key: "haiku" | "sonnet" | "opus"; note: string; isPro?: boolean }[] = [
  { name: "Economy Bro", key: "haiku",  note: "Fast & cheap"   },
  { name: "Smart Bro",   key: "sonnet", note: "Balanced (recommended)", isPro: true },
  { name: "Power Bro",   key: "opus",   note: "Most capable",            isPro: true },
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

/**
 * Bolt-inspired feature grid. Each card has:
 *   - small icon + short title at the top
 *   - one-sentence punchline below
 *   - a chunky hero visual element occupying the bottom half.
 *
 * The visual is the focal point — bolt's grid mixes a 3D infinity
 * loop, a big "100" SEO dial, a glowing padlock, and a chunky
 * "Publish" button. We do the same here with pure CSS + SVG (no
 * image assets, no new deps), each visual hand-tuned to its
 * feature: chat-composer mock for the AI builder, live-preview
 * browser frame, layered DB stack, glowing padlock with light
 * rays, URL chip with LIVE badge, gradient Publish button.
 *
 * `key` selects the visual in the renderer below. Keep it stable
 * if you add new entries — the renderer's switch matches on it.
 */
const FEATURES: { key: string; icon: typeof Sparkles; title: string; body: string }[] = [
  { key: "ai",       icon: Sparkles,  title: "AI builder",        body: "Describe it in plain English. Watch Claude write real React, wired to a real database, in real time." },
  { key: "preview",  icon: Eye,       title: "Live preview",      body: "Every keystroke renders. No reload. No deploy step. The preview is the source of truth." },
  { key: "db",       icon: Database,  title: "Postgres on tap",   body: "One click provisions a dedicated Neon branch for your project. No connection strings to copy around." },
  { key: "auth",     icon: Lock,      title: "Auth, built in",    body: "Google, GitHub, Apple sign-in wired up the moment you ask for it. Sessions, tokens, the lot." },
  { key: "domains",  icon: Globe,     title: "Custom domains",    body: "Bring your own domain. SSL is automatic. Or ship to a free deploybro.app subdomain in seconds." },
  { key: "publish",  icon: Rocket,    title: "One-click publish", body: "A real Vercel deployment behind a real URL. No DevOps. No yaml. No \"works on my machine.\"" },
];

/**
 * Per-feature hero visual. Pure CSS + lucide icons — no image
 * assets. Sized to fit ~h-44 inside each card.
 */
function FeatureVisual({ k }: { k: string }) {
  if (k === "ai") {
    // Code editor preview: a stylised App.tsx getting written by the
    // AI in real time, with syntax-coloured tokens and a blinking
    // caret at the cursor position. Reads "real" enough to convey
    // "this writes actual React" instead of "this generates toy code".
    return (
      <div className="absolute inset-x-0 bottom-0 h-48 px-4 pb-4">
        <div className="relative h-full rounded-xl border border-border bg-[hsl(220_15%_8%)] overflow-hidden shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.45)]">
          <div aria-hidden className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-black/30">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400/70" />
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
              <span className="ml-2 text-[9px] font-mono text-secondary">App.tsx</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-primary">
              <Sparkles className="w-2.5 h-2.5" />
              writing
            </div>
          </div>
          <pre className="px-3 py-2.5 text-[10.5px] leading-[1.55] font-mono text-foreground/90">
{`export `}<span className="text-[#c792ea]">function</span>{` `}<span className="text-[#82aaff]">App</span>{`() {
  `}<span className="text-[#c792ea]">return</span>{` (
    `}<span className="text-secondary">&lt;</span><span className="text-[#82aaff]">Recipes</span>{` `}<span className="text-[#ffcb6b]">rated</span><span className="text-secondary">/&gt;</span><span className="inline-block align-[-2px] w-1.5 h-3.5 bg-primary ml-px animate-pulse" />
{`  )
}`}
          </pre>
        </div>
      </div>
    );
  }

  if (k === "preview") {
    // Browser frame rendering an actual-looking landing page (eyebrow
    // pill, hero h1 lines, CTA button). Includes a tiny "edited 1s ago"
    // chip in the header to land the "every keystroke renders" idea.
    return (
      <div className="absolute inset-x-0 bottom-0 h-48 px-4 pb-4">
        <div className="relative h-full rounded-xl border border-border bg-background overflow-hidden shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border bg-surface-raised">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
            <span className="ml-1.5 flex-1 px-2 py-0.5 rounded bg-background/80 text-[8.5px] font-mono text-secondary truncate">recipes.deploybro.app</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[8px] font-mono">
              <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
              edited 1s ago
            </span>
          </div>
          <div className="px-4 pt-3.5 flex flex-col items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded-full border border-border text-[7.5px] font-mono uppercase tracking-wider text-secondary">New</div>
            <div className="h-2 w-3/4 rounded-full bg-foreground/45" />
            <div className="h-2 w-1/2 rounded-full bg-foreground/30" />
            <div className="h-1 w-2/3 rounded-full bg-foreground/15 mt-0.5" />
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-[9px] font-bold cursor-default"
            >
              Try it now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (k === "db") {
    // Neon-style branch diagram: a "main" trunk with a glowing
    // dashed connector to a child branch DB. Maps directly to what
    // the product actually does (provisions a Neon branch per project).
    return (
      <div className="absolute inset-x-0 bottom-0 h-48 flex items-center justify-center">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -m-10 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.35)_0%,transparent_60%)] blur-xl" />
          <svg viewBox="0 0 200 130" className="relative w-48 h-32">
            <defs>
              <linearGradient id="db-trunk" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            {/* Parent (main) DB */}
            <ellipse cx="55" cy="22" rx="34" ry="7.5" fill="url(#db-trunk)" stroke="hsl(var(--primary))" strokeOpacity="0.7" />
            <path d="M21 22 L21 60 A34 7.5 0 0 0 89 60 L89 22" fill="hsl(var(--surface-raised))" stroke="hsl(var(--border))" />
            <ellipse cx="55" cy="40" rx="34" ry="7.5" fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
            <ellipse cx="55" cy="60" rx="34" ry="7.5" fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
            <text x="55" y="80" textAnchor="middle" fontSize="7.5" fill="hsl(var(--foreground))" opacity="0.65" fontFamily="monospace">main</text>
            {/* Branch connector — dashed, animated flow */}
            <path d="M89 40 Q120 40 130 70 Q140 95 156 95" stroke="hsl(var(--primary))" strokeOpacity="0.7" strokeWidth="1.5" fill="none" strokeDasharray="4 3">
              <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.4s" repeatCount="indefinite" />
            </path>
            {/* Child branch DB */}
            <ellipse cx="160" cy="78" rx="22" ry="5" fill="url(#db-trunk)" stroke="hsl(var(--primary))" strokeOpacity="0.6" />
            <path d="M138 78 L138 105 A22 5 0 0 0 182 105 L182 78" fill="hsl(var(--surface-raised))" stroke="hsl(var(--border))" />
            <ellipse cx="160" cy="91" rx="22" ry="5" fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
            <ellipse cx="160" cy="105" rx="22" ry="5" fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
            <text x="160" y="123" textAnchor="middle" fontSize="6.5" fill="hsl(var(--secondary))" fontFamily="monospace">your-app</text>
          </svg>
        </div>
      </div>
    );
  }

  if (k === "auth") {
    // Big chunky padlock tile with a clean upward beam of light (no
    // conic-gradient mess). Provider chips sit below as proof-of-work.
    return (
      <div className="absolute inset-x-0 bottom-0 h-48 flex items-end justify-center pb-4">
        <div className="relative flex flex-col items-center">
          {/* Beam of light rising from the lock */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -top-8 w-32 h-32 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.55)_0%,hsl(var(--primary)/0.18)_30%,transparent_65%)] blur-md"
          />
          <div aria-hidden className="absolute -inset-3 rounded-full bg-primary/25 blur-2xl" />
          <div className="relative w-[88px] h-[88px] rounded-2xl bg-gradient-to-br from-[hsl(220_30%_18%)] via-[hsl(220_30%_12%)] to-[hsl(220_30%_8%)] border border-primary/40 flex items-center justify-center shadow-[0_18px_50px_-10px_hsl(var(--primary)/0.7),inset_0_1px_0_0_hsl(0_0%_100%/0.12)]">
            <Lock
              className="w-10 h-10 text-primary [filter:drop-shadow(0_0_10px_hsl(var(--primary)/0.9))]"
              strokeWidth={2.5}
            />
          </div>
          <div className="relative mt-4 flex items-center gap-1.5 text-[9.5px] font-mono text-secondary">
            <span className="px-1.5 py-0.5 rounded-md bg-surface-raised border border-border">Google</span>
            <span className="px-1.5 py-0.5 rounded-md bg-surface-raised border border-border">GitHub</span>
            <span className="px-1.5 py-0.5 rounded-md bg-surface-raised border border-border">Apple</span>
          </div>
        </div>
      </div>
    );
  }

  if (k === "domains") {
    // Wireframe globe with a glowing URL chip floating above it.
    // Single iconic focal element (not a list of stacked rows).
    return (
      <div className="absolute inset-x-0 bottom-0 h-48 flex items-end justify-center pb-3">
        <div className="relative flex flex-col items-center">
          {/* URL chip floating above the globe */}
          <div className="relative z-10 mb-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/40 bg-surface-raised shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.7)] whitespace-nowrap">
            <Lock className="w-2.5 h-2.5 text-success shrink-0" />
            <span className="text-[10.5px] font-mono text-foreground/90">yoursite.com</span>
            <span className="ml-1 px-1 py-px rounded bg-success/15 text-success text-[7.5px] font-mono uppercase tracking-wider">SSL</span>
          </div>
          <div aria-hidden className="absolute inset-x-0 top-8 h-24 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.35)_0%,transparent_70%)] blur-xl" />
          <svg viewBox="0 0 100 100" className="relative w-28 h-28">
            <circle cx="50" cy="50" r="42" fill="hsl(var(--surface)/0.4)" stroke="hsl(var(--primary))" strokeOpacity="0.7" strokeWidth="1.4" />
            {/* Latitudes */}
            <ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="0.9" />
            <ellipse cx="50" cy="50" rx="42" ry="28" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.3" strokeWidth="0.9" />
            {/* Meridians */}
            <line x1="50" y1="8" x2="50" y2="92" stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="0.9" />
            <ellipse cx="50" cy="50" rx="22" ry="42" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.32" strokeWidth="0.9" />
            <ellipse cx="50" cy="50" rx="40" ry="42" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.18" strokeWidth="0.9" />
            {/* Pinpoint dot */}
            <circle cx="68" cy="36" r="2.2" fill="hsl(var(--primary))">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
      </div>
    );
  }

  if (k === "publish") {
    // Big floating Publish button + a Build → Deploy → Live status
    // strip below to give a sense of "this actually does something".
    return (
      <div className="absolute inset-x-0 bottom-0 h-48 flex flex-col items-center justify-end gap-3 pb-4">
        <div className="relative">
          <div aria-hidden className="absolute -inset-8 bg-primary/35 blur-3xl rounded-full" />
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="relative inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-b from-[hsl(215_100%_60%)] via-primary to-[hsl(215_100%_40%)] text-primary-foreground font-bold text-base tracking-tight ring-1 ring-white/40 shadow-[0_22px_45px_-10px_hsl(var(--primary)/0.85),inset_0_1px_0_0_hsl(0_0%_100%/0.5),inset_0_-1px_0_0_hsl(220_50%_20%/0.4)] cursor-default"
          >
            <Rocket className="w-4 h-4" strokeWidth={2.5} />
            Publish
          </button>
        </div>
        <div className="relative flex items-center gap-1.5 text-[9px] font-mono text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.8)]" />
          <span>Build</span>
          <span className="w-3 h-px bg-border" />
          <span className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.8)]" />
          <span>Deploy</span>
          <span className="w-3 h-px bg-border" />
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_10px_hsl(var(--success))]" />
          <span className="text-success">Live</span>
        </div>
      </div>
    );
  }

  return null;
}

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
  },
  {
    step: "03",
    title: "Refine and ship",
    body: "Tweak it with simple feedback — \"make the hero bigger\", \"add login\". When it's right, hit Publish. You get a real URL in seconds.",
    url: "recipes.deploybro.app",
  },
];

export default function Landing() {
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [nounIndex, setNounIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState<string>("Economy Bro");
  const [planMode, setPlanMode] = useState<boolean>(false);
  const [refUrls, setRefUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [attachNotice, setAttachNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: templates = [], isLoading } = useTemplates();
  const { data: me } = useMe();
  // Match the in-builder gate (`builder.tsx`): plan defaults to "Free"
  // for logged-out visitors so the marketing surface mirrors the locked
  // experience they'll see after signing up. Anyone on a plan other
  // than Free unlocks the Pro-only models.
  const isFreePlan = (me?.plan ?? "Free").toLowerCase() === "free";

  useEffect(() => {
    const id = window.setInterval(() => {
      setNounIndex((i) => (i + 1) % ROTATING_NOUNS.length);
    }, 1800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (me) navigate("/dashboard");
  }, [me, navigate]);

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
    const valid = Array.from(files).filter((f) => ALLOWED.has(f.type));
    setImageFiles((prev) => [...prev, ...valid].slice(0, 5));
  };

  const addUrl = () => {
    const raw = urlDraft.trim();
    if (!raw) return;
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(candidate);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      setRefUrls((prev) =>
        prev.includes(u.toString()) ? prev : [...prev, u.toString()].slice(0, 5),
      );
      setUrlDraft("");
      setUrlError("");
      setAddOpen(false);
    } catch {
      setUrlError("Please enter a valid http(s) URL");
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<{ name: string; type: string; dataUrl: string }>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error ?? new Error("read failed"));
      r.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(r.result ?? "") });
      r.readAsDataURL(file);
    });

  const goAfterSubmit = () => navigate("/build/new");

  const submit = async () => {
    const value = prompt.trim();
    if (value) {
      try { sessionStorage.setItem("deploybro:initial-prompt", value); }
      catch {}
    }
    try {
      const modelKey = HOME_MODELS.find((m) => m.name === selectedModel)?.key ?? "haiku";
      const baseSettings: Record<string, unknown> = { model: modelKey, planMode };
      if (refUrls.length > 0) baseSettings.urls = refUrls;
      let imagesPayload: { name: string; type: string; dataUrl: string }[] | null = null;
      if (imageFiles.length > 0) {
        const imgs = await Promise.all(
          imageFiles.slice(0, 5).map((f) => fileToDataUrl(f).catch(() => null)),
        );
        imagesPayload = imgs.filter((x): x is { name: string; type: string; dataUrl: string } => x != null);
      }
      const tryStore = (payload: Record<string, unknown>) => {
        sessionStorage.setItem("deploybro:initial-settings", JSON.stringify(payload));
      };
      if (imagesPayload && imagesPayload.length > 0) {
        try {
          tryStore({ ...baseSettings, images: imagesPayload });
        } catch {
          try { tryStore(baseSettings); } catch {}
          try {
            sessionStorage.setItem(
              "deploybro:attach-warning",
              `${imagesPayload.length} image${imagesPayload.length === 1 ? "" : "s"} were too large to carry over. Please re-attach them in the editor.`,
            );
          } catch {}
          setAttachNotice(
            "Images are too large to carry into the editor — please re-attach them once you're in.",
          );
          setTimeout(goAfterSubmit, 2500);
          return;
        }
      } else {
        try { tryStore(baseSettings); } catch {}
      }
    } catch {}
    goAfterSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* Background-only stack: kept on -z-10 so the hero content
              paints over it. Holds the soft top halo + the faint flat
              grid on the upper half. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {/* Soft top glow — keeps the hero's primary-tinted halo */}
            <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_70%)]" />
            {/* Faint flat grid in the upper portion — trimmed so it
                doesn't fight with the perspective grid below. */}
            <div className="absolute inset-x-0 top-0 h-1/2 opacity-[0.18] dark:opacity-[0.12]" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)" }} />
          </div>
          {/* Perspective grid — lives outside the -z-10 wrapper so it
              can't be hidden behind any opaque ancestor background. The
              `pointer-events-none` on the wrapper class keeps it from
              swallowing clicks on the hero's interactive elements. */}
          <div aria-hidden className="perspective-grid">
            <div className="perspective-grid__plane" />
          </div>
          <div className="relative z-10 flex justify-center pt-10 pb-4">
            <Link href="https://deploybro.com/explore" className="glass-pill group inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium text-foreground/90 transition-transform hover:-translate-y-px">
              Introducing DeployBro v2
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
          <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center justify-center min-h-[80vh] pt-2 pb-16">
            <h1 className="flex flex-col items-center text-4xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none gap-3 sm:gap-4 md:gap-5">
              <span>Ship your</span>
              <span key={nounIndex} className="inline-block text-primary animate-rotate-in italic font-black text-5xl sm:text-6xl md:text-8xl leading-none tracking-tight" style={{ textShadow: "0 0 50px hsl(215 100% 60% / 0.6)" }}>
                {ROTATING_NOUNS[nounIndex]}
              </span>
              <span>in an afternoon.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-normal max-w-xl mx-auto mb-10">
              Describe it. Watch DeployBro build it live. <span className="whitespace-nowrap">Publish to a real URL.</span>
            </p>
            <div className="w-full max-w-2xl mx-auto">
              {attachNotice && (
                <div role="status" className="mb-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-left">
                  {attachNotice}
                </div>
              )}
              <div className="prompt-glow rounded-[14px] border border-border bg-background text-left focus-within:border-primary focus-within:shadow-[0_0_0_1px_hsl(var(--primary))] transition-shadow">
                {(imageFiles.length > 0 || refUrls.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 p-3 pb-0">
                    {imageFiles.map((f, i) => (
                      <span key={`img-${i}`} className="inline-flex items-center gap-1.5 max-w-[200px] px-2 py-1 rounded-md bg-surface-raised border border-border text-xs text-foreground">
                        <ImageIcon className="w-3 h-3 text-secondary shrink-0" />
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => setImageFiles((prev) => prev.filter((_, j) => j !== i))} className="text-secondary hover:text-foreground" aria-label="Remove image">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {refUrls.map((u, i) => {
                      let host = u;
                      try { host = new URL(u).host; } catch {}
                      return (
                        <span key={`url-${i}`} className="inline-flex items-center gap-1.5 max-w-[220px] px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-xs text-foreground" title={u}>
                          <Link2 className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">{host}</span>
                          <button type="button" onClick={() => setRefUrls((prev) => prev.filter((_, j) => j !== i))} className="text-secondary hover:text-foreground" aria-label="Remove URL">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={onKeyDown} placeholder={refUrls.length > 0 ? "Tell DeployBro how to redesign these references..." : planMode ? "Plan first, then build... describe your idea" : "Ask DeployBro to create a landing page for my..."} rows={3} className="w-full min-h-[88px] max-h-[220px] bg-transparent p-4 text-base text-foreground placeholder:text-muted outline-none resize-none" />
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <div className="flex items-center gap-1 min-w-0 flex-wrap">
                    <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { onPickFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }} />
                    <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setUrlError(""); }}>
                      <PopoverTrigger asChild>
                        <button type="button" className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors shrink-0" title="Attach image or add a URL" aria-label="Attach image or add a URL">
                          <Plus className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="top" className="w-72 p-1 border-border">
                        <button type="button" onClick={() => { setAddOpen(false); fileInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-2 py-2 rounded text-left text-xs text-foreground hover:bg-surface-raised transition-colors">
                          <ImageIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">Upload image</div>
                            <div className="text-[10px] text-secondary">PNG, JPG, WEBP or GIF — up to 5</div>
                          </div>
                        </button>
                        <div className="h-px bg-border my-1" />
                        <div className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Link2 className="w-3.5 h-3.5 text-secondary" />
                            <span className="text-[11px] font-medium text-foreground">Redesign a website</span>
                          </div>
                          <div className="text-[10px] text-secondary mb-2 leading-snug">Paste any public URL — the AI fetches it as a starting point.</div>
                          <div className="flex gap-1">
                            <input type="url" value={urlDraft} onChange={(e) => { setUrlDraft(e.target.value); setUrlError(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} placeholder="stripe.com" className="flex-1 min-w-0 h-7 px-2 rounded-md border border-border bg-background text-[11px] focus:outline-none focus:border-primary" autoFocus />
                            <button type="button" onClick={addUrl} disabled={!urlDraft.trim()} className="h-7 px-2 rounded-md text-[11px] font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors">Add</button>
                          </div>
                          {urlError && <div className="mt-1 text-[10px] text-red-500">{urlError}</div>}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover open={modelOpen} onOpenChange={setModelOpen}>
                      <PopoverTrigger asChild>
                        <button type="button" className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs font-mono text-secondary hover:text-foreground hover:bg-surface-raised transition-colors min-w-0" title="Choose model">
                          <Cpu className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{selectedModel}</span>
                          {HOME_MODELS.find((m) => m.name === selectedModel)?.isPro && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                              Pro
                            </span>
                          )}
                          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="top" className="w-64 p-1 border-border">
                        <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-mono text-secondary">Model</div>
                        {HOME_MODELS.map((m) => {
                          const active = m.name === selectedModel;
                          // Mirrors the in-builder model menu: Pro-only
                          // entries stay visible so free users know what
                          // they're missing, but clicking one bounces to
                          // billing instead of switching the model. The
                          // Pro pill sits on the right of the row, paired
                          // with the active-check, so the model name
                          // column stays clean and aligned.
                          const locked = isFreePlan && !!m.isPro;
                          return (
                            <button
                              key={m.name}
                              type="button"
                              onClick={() => {
                                if (locked) {
                                  setModelOpen(false);
                                  toast.message("Pro plan required", {
                                    description:
                                      "Smart Bro and Power Bro are available on the Pro plan.",
                                    action: {
                                      label: "Upgrade",
                                      onClick: () => navigate("/dashboard/billing"),
                                    },
                                  });
                                  return;
                                }
                                setSelectedModel(m.name);
                                setModelOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                                locked
                                  ? "text-secondary hover:bg-surface-raised"
                                  : "text-foreground hover:bg-surface-raised"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{m.name}</div>
                                <div className="text-[10px] text-secondary font-mono">{m.note}</div>
                              </div>
                              {m.isPro && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                                  Pro
                                </span>
                              )}
                              {active && !locked && (
                                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => setPlanMode(!planMode)} className={`h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs transition-colors ${planMode ? "bg-primary/15 text-primary border border-primary/30" : "text-secondary hover:text-foreground hover:bg-surface-raised border border-transparent"}`} title={planMode ? "Plan mode is on — AI plans before coding" : "Turn on plan mode"} aria-pressed={planMode}>
                      <ListTodo className="w-3.5 h-3.5 shrink-0" />
                      <span>Plan</span>
                    </button>
                    <button type="button" onClick={() => void submit()} aria-label="Generate" disabled={!prompt.trim()} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors" title="Send">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-secondary">
              <span>Powered by Anthropic Claude</span>
            </div>
          </div>
        </section>
        <section id="how" className="py-20 md:py-32 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              {/* Bolt-style mixed-weight headline: muted-grey lead-in
                  with a stark white emphasis on the verb. Reads as one
                  ribbon at desktop, stacks at mobile. */}
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance leading-[1.1]">
                <span className="text-secondary font-light">From idea to </span>
                <span className="text-foreground">live in production.</span>
              </h2>
              <p className="text-secondary text-base md:text-lg">
                Three moves. Each one is a single sentence. No frameworks to learn.
              </p>
            </div>
            <div className="space-y-20 md:space-y-28">
              {STEPS.map((s, i) => {
                const reverse = i % 2 === 1;
                return (
                  <div key={s.step} className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
                    <div>
                      <div className="text-xs font-mono text-primary mb-3">STEP {s.step}</div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">{s.title}</h3>
                      <p className="text-secondary text-base md:text-lg leading-relaxed">{s.body}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full -z-10" />
                      {i === 0 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 p-4 space-y-3">
                          {s.chat?.map((m, j) => (
                            <div key={j} className={`flex ${m.who === "you" ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${m.who === "you" ? "bg-primary/15 text-primary rounded-br-sm border border-primary/25" : "bg-surface-raised text-foreground rounded-bl-sm border border-border"}`}>
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
                            <span className="ml-3 text-xs font-mono text-secondary truncate">recipes.app — preview</span>
                          </div>
                          <div className="p-5 bg-surface-raised/30 space-y-4">
                            <div className="space-y-2">
                              <div className="h-3 w-1/3 rounded bg-foreground/15" />
                              <div className="h-2 w-2/3 rounded bg-foreground/10" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[1, 2, 3, 4].map((n) => (
                                <div key={n} className="rounded-lg border border-border bg-background p-2.5">
                                  <div className="aspect-[4/3] rounded bg-gradient-to-br from-primary/30 to-foreground/5 mb-2" />
                                  <div className="h-1.5 w-3/4 rounded bg-foreground/15 mb-1" />
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <span key={s} className={`w-1 h-1 rounded-full ${s <= (n % 4) + 2 ? "bg-primary" : "bg-foreground/20"}`} />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-secondary">Adding \"Save recipe\" button…</span>
                          </div>
                        </div>
                      )}
                      {i === 2 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-raised">
                            <Globe className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-mono text-secondary truncate">https://{s.url}</span>
                            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/15 text-success">LIVE</span>
                          </div>
                          <div className="p-5 bg-surface-raised/30">
                            <div className="h-3 w-1/3 rounded bg-foreground/10 mb-3" />
                            <div className="h-2 w-2/3 rounded bg-foreground/10 mb-2" />
                            <div className="h-2 w-1/2 rounded bg-foreground/10 mb-5" />
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3].map((n) => (
                                <div key={n} className="aspect-square rounded bg-gradient-to-br from-primary/30 to-foreground/5" />
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
        {/* "Everything built in" — bolt-style feature grid. Each card
            sells one infrastructure piece DeployBro takes off the
            user's plate, with an inline visual that makes the value
            tangible (badge, mock button, code, etc.) instead of just
            a flat block of copy. */}
        <section id="features" className="py-20 md:py-32 px-4 sm:px-6 border-t border-border bg-gradient-to-b from-background via-surface/30 to-background">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-14 md:mb-20">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-surface text-xs font-mono uppercase tracking-wider text-secondary mb-5">
                <Zap className="w-3 h-3 text-primary" /> Built in
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance leading-[1.1]">
                <span className="text-secondary font-light">Everything you need to ship. </span>
                <span className="text-foreground">Built in.</span>
              </h2>
              <p className="text-secondary text-base md:text-lg">
                Stop stitching together five SaaS products to launch one app. Database, auth, domains, deployments — wired up the moment you create a project.
              </p>
            </div>
            {/* Cards are tall (~h-96) so the hero visual at the bottom
                has room to breathe — bolt's cards do the same. The
                copy block sits in the top half (relative), the visual
                is absolutely positioned to the bottom inside the
                card's `overflow-hidden` clip. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.key}
                    className="group relative rounded-2xl border border-border bg-surface/60 backdrop-blur-sm p-6 md:p-7 overflow-hidden transition-all hover:border-primary/40 hover:bg-surface min-h-[22rem] md:min-h-[24rem]"
                  >
                    <div aria-hidden className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-lg md:text-xl font-semibold tracking-tight">{f.title}</h3>
                      </div>
                      <p className="text-secondary text-sm leading-relaxed">{f.body}</p>
                    </div>
                    <FeatureVisual k={f.key} />
                    {/* Soft fade so the visual blends into the card
                        bottom edge instead of getting clipped hard. */}
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface/80 to-transparent" />
                  </div>
                );
              })}
            </div>
            {/* Big stat ribbon — bolt's "98%" / "1000x" pattern, sized
                so it reads as a punctuation moment between the feature
                grid and the templates that follow. */}
            <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border">
              {[
                { stat: "60s", label: "From prompt to live URL" },
                { stat: "0",   label: "Servers to manage" },
                { stat: "1",   label: "Click to publish" },
              ].map((s) => (
                <div key={s.label} className="bg-surface/60 px-6 py-10 text-center">
                  <div className="text-5xl md:text-6xl font-black tracking-tight text-foreground mb-2 [text-shadow:0_0_40px_hsl(var(--primary)/0.35)]">{s.stat}</div>
                  <div className="text-xs md:text-sm text-secondary uppercase tracking-wider font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="templates" className="py-20 md:py-28 px-4 sm:px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                  Or start from a template.
                </h2>
                <p className="text-secondary">
                  Remix something proven. These are pulled from the live template library.
                </p>
              </div>
              <Link href="/templates" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {isLoading ? (
              <div className="text-sm text-secondary">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-secondary">No templates yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.slice(0, 4).map((t) => (
                  <Link key={t.id} href={`/${t.author}/${t.slug}`} className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col">
                    {/* aspect-[16/10] matches the 1280×800 capture viewport
                        so `object-cover object-top` paints the page header
                        full-width with no side cropping. */}
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 via-surface-raised to-background relative overflow-hidden">
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase z-10">{t.framework}</div>
                      {(t.screenshotUrl ?? t.coverImageUrl) ? (
                        <img
                          src={(t.screenshotUrl ?? t.coverImageUrl)!}
                          alt={t.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover object-top transition-transform group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-3 rounded bg-background/80 backdrop-blur-sm border border-border/50 p-2 flex flex-col gap-1.5 transition-transform group-hover:scale-[1.02]">
                          <div className="h-1.5 w-1/3 rounded bg-foreground/30" />
                          <div className="h-1 w-2/3 rounded bg-foreground/15" />
                          <div className="grid grid-cols-3 gap-1 mt-1 flex-1">
                            <div className="rounded bg-primary/60" />
                            <div className="rounded bg-foreground/15" />
                            <div className="rounded bg-foreground/15" />
                            <div className="rounded bg-foreground/15" />
                            <div className="rounded bg-primary/60" />
                            <div className="rounded bg-foreground/15" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">{t.name}</h3>
                      <p className="text-xs text-secondary">{t.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
        <section className="py-24 md:py-32 px-4 sm:px-6 border-t border-border">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-[1.05]">
              <span className="text-secondary font-light">Ready to </span>
              <span className="text-foreground">build something real?</span>
            </h2>
            <p className="text-lg text-secondary mb-10 max-w-xl mx-auto">
              Free to start. No credit card. No "schedule a demo" nonsense.
            </p>
            <Link href="/login">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 text-lg font-semibold">
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

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
    return (
      <div className="absolute inset-x-0 bottom-0 h-44 px-5 pb-5 pt-2 flex flex-col justify-end gap-2">
        <div className="flex justify-end">
          <div className="px-3 py-1.5 rounded-2xl rounded-br-sm bg-primary/15 border border-primary/30 text-[11px] text-primary max-w-[80%]">a recipe site with ratings</div>
        </div>
        <div className="flex justify-start">
          <div className="px-3 py-1.5 rounded-2xl rounded-bl-sm bg-surface-raised border border-border text-[11px] text-foreground/80 max-w-[80%] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary shrink-0" />
            Building 4 pages, wiring DB…
          </div>
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-secondary font-mono">
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
          <span className="w-1 h-1 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    );
  }
  if (k === "preview") {
    return (
      <div className="absolute inset-x-0 bottom-0 h-44 px-5 pb-5">
        <div className="rounded-lg border border-border bg-background/80 backdrop-blur-sm overflow-hidden h-full flex flex-col">
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-surface-raised">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
            <span className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
            <span className="ml-2 text-[9px] font-mono text-secondary truncate">localhost:3000</span>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-1.5">
            <div className="h-1.5 w-1/3 rounded bg-foreground/30" />
            <div className="h-1 w-2/3 rounded bg-foreground/15" />
            <div className="grid grid-cols-3 gap-1 mt-2 flex-1">
              <div className="rounded bg-gradient-to-br from-primary/40 to-primary/10" />
              <div className="rounded bg-foreground/10" />
              <div className="rounded bg-foreground/10" />
            </div>
            <div className="flex items-center gap-1 pt-1 text-[9px] font-mono text-secondary">
              <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
              live
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (k === "db") {
    return (
      <div className="absolute inset-x-0 bottom-0 h-44 flex items-center justify-center pb-2">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -m-6 rounded-full bg-primary/15 blur-2xl" />
          {/* Stacked DB cylinders. Each disc = ellipse + side rect.
              The top stack pulses softly to suggest "live writes". */}
          <svg viewBox="0 0 120 110" className="relative w-32 h-28">
            <defs>
              <linearGradient id="dbg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {[60, 40, 20].map((y, i) => (
              <g key={y} opacity={1 - i * 0.18}>
                <ellipse cx="60" cy={y + 18} rx="40" ry="9" fill="hsl(var(--surface-raised))" stroke="hsl(var(--border))" />
                <path d={`M20 ${y + 18} L20 ${y + 30} A40 9 0 0 0 100 ${y + 30} L100 ${y + 18}`} fill="hsl(var(--surface))" stroke="hsl(var(--border))" />
              </g>
            ))}
            <ellipse cx="60" cy="20" rx="40" ry="9" fill="url(#dbg)" stroke="hsl(var(--primary))" strokeOpacity="0.6" />
          </svg>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-surface-raised border border-border text-[9px] font-mono text-secondary whitespace-nowrap">postgres://…neon.tech</div>
        </div>
      </div>
    );
  }
  if (k === "auth") {
    return (
      <div className="absolute inset-x-0 bottom-0 h-44 flex items-end justify-center pb-5">
        <div className="relative">
          {/* Light rays behind the lock — same effect bolt uses on
              its "User Management" card. */}
          <div aria-hidden className="absolute -inset-10 bg-[conic-gradient(from_180deg_at_50%_100%,transparent_0deg,hsl(var(--primary)/0.35)_45deg,transparent_90deg,hsl(var(--primary)/0.35)_135deg,transparent_180deg)] blur-md opacity-80" />
          <div aria-hidden className="absolute -inset-4 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-surface-raised to-surface border border-border flex items-center justify-center shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)]">
            <Lock className="w-9 h-9 text-primary" strokeWidth={2.4} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-secondary">
            <span className="px-1.5 py-0.5 rounded bg-surface-raised border border-border">Google</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-raised border border-border">GitHub</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-raised border border-border">Apple</span>
          </div>
        </div>
      </div>
    );
  }
  if (k === "domains") {
    return (
      <div className="absolute inset-x-0 bottom-0 h-44 flex flex-col items-center justify-end gap-2 pb-6">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface-raised shadow-lg w-[85%] max-w-xs">
          <Lock className="w-3 h-3 text-success shrink-0" />
          <span className="text-[11px] font-mono text-foreground/90 truncate">yoursite.com</span>
          <span className="ml-auto px-1.5 py-0.5 rounded bg-success/15 text-success text-[9px] font-mono uppercase tracking-wider">Live</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 bg-surface/60 w-[70%] max-w-[200px] opacity-60">
          <Globe className="w-3 h-3 text-secondary shrink-0" />
          <span className="text-[10px] font-mono text-secondary truncate">app.deploybro.app</span>
        </div>
      </div>
    );
  }
  if (k === "publish") {
    return (
      <div className="absolute inset-x-0 bottom-0 h-44 flex items-center justify-center pb-3">
        <div className="relative">
          <div aria-hidden className="absolute -inset-6 bg-primary/30 blur-3xl rounded-full" />
          {/* Chunky 3D-ish Publish button — bolt's hosting card uses
              an actual screenshot of one. Pure CSS gradient + ring +
              double shadow gives the same depth without an asset. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="relative inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-b from-primary via-primary to-[hsl(215_100%_45%)] text-primary-foreground font-bold text-base tracking-tight ring-1 ring-white/30 shadow-[0_18px_40px_-10px_hsl(var(--primary)/0.7),inset_0_1px_0_0_hsl(0_0%_100%/0.4)] cursor-default"
          >
            <Rocket className="w-4 h-4" strokeWidth={2.5} />
            Publish
          </button>
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

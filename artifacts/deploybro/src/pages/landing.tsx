import {
  ArrowUp,
  ArrowRight,
  Cpu,
  Check,
  Plus,
  Image as ImageIcon,
  Link2,
  ListTodo,
  ChevronDown,
  X,
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


const STEPS = [
  {
    step: "01",
    title: "Start with an idea",
    body: "Describe the app you want in plain English. Drop in a screenshot, a Notion doc, or a half-baked sketch — anything goes.",
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
              paints over it. Holds the soft top halo + a faint flat
              grid that dissolves before it reaches the prompt box. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {/* Soft top glow — keeps the hero's primary-tinted halo */}
            <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_70%)]" />
            {/* Faint flat grid in the upper portion — fades to
                transparent so it doesn't fight with the hero copy. */}
            <div className="absolute inset-x-0 top-0 h-1/2 opacity-[0.18] dark:opacity-[0.12]" style={{ backgroundImage: "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at top, black 30%, transparent 70%)" }} />
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
              {/* Match the in-builder prompt input: same `.prompt-glow`
                  ring + `.builder-chat-input-shell` flat surface, same
                  compact button row. The marketing surface should feel
                  like a continuation of the editor, not a different
                  control. */}
              <div className="prompt-glow builder-chat-input-shell rounded-xl">
                {(imageFiles.length > 0 || refUrls.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 p-2 pb-0">
                    {imageFiles.map((f, i) => (
                      <span key={`img-${i}`} className="inline-flex items-center gap-1.5 max-w-[180px] px-2 py-1 rounded-md bg-surface-raised border border-border text-[11px] text-foreground">
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
                        <span key={`url-${i}`} className="inline-flex items-center gap-1.5 max-w-[200px] px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-[11px] text-foreground" title={u}>
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
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={onKeyDown} placeholder={refUrls.length > 0 ? "Tell DeployBro how to redesign these references..." : planMode ? "Plan first, then build... describe your idea" : "Ask DeployBro to create a landing page for my..."} className="w-full min-h-[60px] max-h-[180px] bg-transparent p-3 text-sm text-foreground placeholder:text-muted focus:outline-none resize-none" />
                <div className="flex items-center justify-between gap-2 px-2 pb-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { onPickFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }} />
                    <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setUrlError(""); }}>
                      <PopoverTrigger asChild>
                        <button type="button" className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors shrink-0" title="Attach image or add a URL" aria-label="Attach image or add a URL">
                          <Plus className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" side="top" className="w-72 p-1 border-border">
                        <button type="button" onClick={() => { setAddOpen(false); fileInputRef.current?.click(); }} className="w-full flex items-center gap-2 px-2 py-2 rounded text-left text-xs text-foreground hover:bg-surface-raised transition-colors">
                          <ImageIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">Upload image</div>
                            <div className="text-[10px] text-secondary">PNG, JPG, WEBP or GIF — up to 5 images</div>
                          </div>
                        </button>
                        <div className="h-px bg-border my-1" />
                        <div className="px-2 py-1.5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Link2 className="w-3.5 h-3.5 text-secondary" />
                            <span className="text-[11px] font-medium text-foreground">Add a website to redesign</span>
                          </div>
                          <div className="text-[10px] text-secondary mb-2 leading-snug">Paste any public site — the AI fetches it and uses it as a starting point.</div>
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
                        <button type="button" className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11px] font-mono text-secondary hover:text-foreground hover:bg-surface-raised transition-colors min-w-0" title="Change model">
                          <Cpu className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{selectedModel}</span>
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
                          // billing instead of switching the model.
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
                                <div className="font-medium truncate flex items-center gap-1.5">
                                  <span className="truncate">{m.name}</span>
                                  {m.isPro && (
                                    <span className="text-[9px] leading-none px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-mono uppercase tracking-wider shrink-0">
                                      Pro
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-secondary font-mono">{m.note}</div>
                              </div>
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
                    <button type="button" onClick={() => setPlanMode(!planMode)} className={`h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11px] font-mono transition-colors ${planMode ? "bg-primary/15 text-primary border border-primary/30" : "text-secondary hover:text-foreground hover:bg-surface-raised border border-transparent"}`} title={planMode ? "Plan mode is on — AI plans before coding" : "Turn on plan mode"} aria-pressed={planMode}>
                      <ListTodo className="w-3.5 h-3.5 shrink-0" />
                      <span>Plan</span>
                    </button>
                    <button type="button" onClick={() => void submit()} aria-label="Generate" disabled={!prompt.trim()} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors" title="Send">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-secondary text-center mt-2">
                Enter to send · Shift+Enter for newline
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
            {/* Three plain cards — same hover-elevate treatment used
                everywhere else on the marketing surface. Replaces the
                previous full-width illustrated panels which made the
                section dominate the page; the simpler cards keep the
                "three quick moves" promise without burying the rest. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-border bg-surface p-6 md:p-7 hover-elevate transition-colors"
                >
                  <div className="text-xs font-mono text-primary mb-3">STEP {s.step}</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-3 tracking-tight">{s.title}</h3>
                  <p className="text-secondary text-sm md:text-base leading-relaxed">{s.body}</p>
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
              <Link href="/explore" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80">
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
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase z-10">{t.category ?? "Other"}</div>
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

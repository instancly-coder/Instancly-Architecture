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
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { useTemplates } from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Mirror the builder's model list so the homepage picker shows the same
// options. Free plan is server-side locked to Economy Bro regardless of choice.
// Plan mode server-side auto-upgrades paid users to Power Bro.
const HOME_MODELS: { name: string; key: "haiku" | "sonnet" | "opus"; note: string }[] = [
  { name: "Economy Bro", key: "haiku",  note: "Fast & cheap"   },
  { name: "Smart Bro",   key: "sonnet", note: "Balanced (recommended)" },
  { name: "Power Bro",   key: "opus",   note: "Most capable"   },
];

const PROMPT_SUGGESTIONS = [
  "Ecommerce",
  "SaaS",
  "Marketplace",
  "Dashboard",
  "Landing page",
  "Internal tool",
  "Mobile app",
  "Blog",
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
  // Prompt-box composer state — mirrors the builder so the experience is
  // continuous when the user lands in the editor.
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

  // We always send the user to `/build/new` regardless of auth state.
  // AuthGate already handles both branches: if the user is signed in
  // it renders the page (which mints a project + opens the builder);
  // if not, it stashes `/build/new` as the post-login destination and
  // redirects to `/login`. After login, AuthGate consumes the stashed
  // path on the next gated mount and lands them back on `/build/new`.
  // This sidesteps the "is the user signed in yet?" race that calling
  // `useUser()` here would introduce (and avoids touching the Stack
  // provider from a page that may render before the provider mounts).
  const goAfterSubmit = () => navigate("/build/new");

  const submit = async () => {
    const value = prompt.trim();
    // The user's typed prompt is the single most important thing to carry
    // over — persist it on its own so a later quota error in the settings
    // block can't take it down with it.
    if (value) {
      try { sessionStorage.setItem("deploybro:initial-prompt", value); }
      catch { /* private mode / quota — fall through, builder will show empty input */ }
    }
    // Persist the entire composer state so the builder can rehydrate it.
    // sessionStorage caps around 5–10MB across browsers, so attaching
    // several multi-MB images via base64 will reliably blow the quota.
    // Strategy: try with images first; if it throws, retry without images
    // and tell the user (in the editor) that they need to re-attach.
    try {
      const modelKey = HOME_MODELS.find((m) => m.name === selectedModel)?.key ?? "haiku";
      const baseSettings: Record<string, unknown> = { model: modelKey, planMode };
      if (refUrls.length > 0) baseSettings.urls = refUrls;

      let imagesPayload:
        | { name: string; type: string; dataUrl: string }[]
        | null = null;
      if (imageFiles.length > 0) {
        const imgs = await Promise.all(
          imageFiles.slice(0, 5).map((f) => fileToDataUrl(f).catch(() => null)),
        );
        imagesPayload = imgs.filter(
          (x): x is { name: string; type: string; dataUrl: string } => x != null,
        );
      }

      const tryStore = (payload: Record<string, unknown>) => {
        sessionStorage.setItem("deploybro:initial-settings", JSON.stringify(payload));
      };

      if (imagesPayload && imagesPayload.length > 0) {
        try {
          tryStore({ ...baseSettings, images: imagesPayload });
        } catch {
          // Most likely QuotaExceededError. Persist everything except images
          // and leave a one-shot notice for the builder to surface.
          try { tryStore(baseSettings); } catch { /* shrug */ }
          try {
            sessionStorage.setItem(
              "deploybro:attach-warning",
              `${imagesPayload.length} image${imagesPayload.length === 1 ? "" : "s"} were too large to carry over. Please re-attach them in the editor.`,
            );
          } catch { /* shrug */ }
          setAttachNotice(
            "Images are too large to carry into the editor — please re-attach them once you're in.",
          );
          // Give the user a real beat to read the inline notice before
          // navigating — 1.2s blew by too fast to register as a warning.
          setTimeout(goAfterSubmit, 2500);
          return;
        }
      } else {
        try { tryStore(baseSettings); } catch { /* shrug */ }
      }
    } catch { /* sessionStorage may be unavailable in private mode — ignore */ }
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
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Decorative background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_70%)]" />
            <div
              className="absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
                maskImage:
                  "radial-gradient(ellipse at center, black 40%, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at center, black 40%, transparent 75%)",
              }}
            />
          </div>

          {/* iOS-style glass announcement pill */}
          <div className="relative z-10 flex justify-center pt-10 pb-4">
            <Link
              href="/explore"
              className="glass-pill group inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium text-foreground/90 transition-transform hover:-translate-y-px"
            >
              Introducing DeployBro v2
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center justify-center min-h-[80vh] pt-2 pb-16">
          {/* Flex column with a single `gap` keeps the three lines visibly
              evenly spaced even though the middle word is much larger and
              has its own line-height. Mixing block + line-heights produces
              uneven white-space on either side of the big word. */}
          <h1 className="flex flex-col items-center text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-none gap-3 sm:gap-4 md:gap-5">
            <span>Ship your</span>
            <span
              key={nounIndex}
              className="inline-block text-primary animate-rotate-in italic font-black text-5xl sm:text-6xl md:text-8xl leading-none tracking-tight"
              style={{ textShadow: "0 0 50px hsl(215 100% 60% / 0.6)" }}
            >
              {ROTATING_NOUNS[nounIndex]}
            </span>
            <span>in an afternoon.</span>
          </h1>

          <p className="text-base sm:text-lg text-secondary max-w-xl mx-auto mb-10">
            Describe it. Watch DeployBro build it live. Publish to a real URL —
            no code, no DevOps, no excuses.
          </p>

          <div className="w-full max-w-2xl mx-auto">
            {attachNotice && (
              <div
                role="status"
                className="mb-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 text-left"
              >
                {attachNotice}
              </div>
            )}
            <div className="prompt-glow rounded-[14px] border border-border bg-background text-left focus-within:border-primary focus-within:shadow-[0_0_0_1px_hsl(var(--primary))] transition-shadow">
              {/* Image + URL chips */}
              {(imageFiles.length > 0 || refUrls.length > 0) && (
                <div className="flex flex-wrap gap-1.5 p-3 pb-0">
                  {imageFiles.map((f, i) => (
                    <span
                      key={`img-${i}`}
                      className="inline-flex items-center gap-1.5 max-w-[200px] px-2 py-1 rounded-md bg-surface-raised border border-border text-xs text-foreground"
                    >
                      <ImageIcon className="w-3 h-3 text-secondary shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setImageFiles((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-secondary hover:text-foreground"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {refUrls.map((u, i) => {
                    let host = u;
                    try { host = new URL(u).host; } catch {}
                    return (
                      <span
                        key={`url-${i}`}
                        className="inline-flex items-center gap-1.5 max-w-[220px] px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-xs text-foreground"
                        title={u}
                      >
                        <Link2 className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{host}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRefUrls((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="text-secondary hover:text-foreground"
                          aria-label="Remove URL"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  refUrls.length > 0
                    ? "Tell DeployBro how to redesign these references..."
                    : planMode
                    ? "Plan first, then build... describe your idea"
                    : "Ask DeployBro to create a landing page for my..."
                }
                rows={3}
                className="w-full min-h-[88px] max-h-[220px] bg-transparent p-4 text-base text-foreground placeholder:text-muted outline-none resize-none"
              />

              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-1 min-w-0 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    onChange={(e) => {
                      onPickFiles(e.target.files);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />

                  {/* "+" menu — image upload or reference URL */}
                  <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setUrlError(""); }}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors shrink-0"
                        title="Attach image or add a URL"
                        aria-label="Attach image or add a URL"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="top"
                      className="w-72 p-1 border-border"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAddOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded text-left text-xs text-foreground hover:bg-surface-raised transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">Upload image</div>
                          <div className="text-[10px] text-secondary">
                            PNG, JPG, WEBP or GIF — up to 5
                          </div>
                        </div>
                      </button>
                      <div className="h-px bg-border my-1" />
                      <div className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Link2 className="w-3.5 h-3.5 text-secondary" />
                          <span className="text-[11px] font-medium text-foreground">
                            Redesign a website
                          </span>
                        </div>
                        <div className="text-[10px] text-secondary mb-2 leading-snug">
                          Paste any public URL — the AI fetches it as a starting point.
                        </div>
                        <div className="flex gap-1">
                          <input
                            type="url"
                            value={urlDraft}
                            onChange={(e) => { setUrlDraft(e.target.value); setUrlError(""); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); addUrl(); }
                            }}
                            placeholder="stripe.com"
                            className="flex-1 min-w-0 h-7 px-2 rounded-md border border-border bg-background text-[11px] focus:outline-none focus:border-primary"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={addUrl}
                            disabled={!urlDraft.trim()}
                            className="h-7 px-2 rounded-md text-[11px] font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                          >
                            Add
                          </button>
                        </div>
                        {urlError && (
                          <div className="mt-1 text-[10px] text-red-500">{urlError}</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Model picker */}
                  <Popover open={modelOpen} onOpenChange={setModelOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs font-mono text-secondary hover:text-foreground hover:bg-surface-raised transition-colors min-w-0"
                        title="Choose model"
                      >
                        <Cpu className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{selectedModel}</span>
                        <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="top"
                      className="w-64 p-1 border-border"
                    >
                      <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-mono text-secondary">
                        Model
                      </div>
                      {HOME_MODELS.map((m) => {
                        const active = m.name === selectedModel;
                        return (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.name);
                              setModelOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-foreground hover:bg-surface-raised transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{m.name}</div>
                              <div className="text-[10px] text-secondary font-mono">
                                {m.note}
                              </div>
                            </div>
                            {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Right action group: Plan toggle sits next to Send so the
                    "what mode am I in / send it" decision lives together. */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlanMode(!planMode)}
                    className={`h-8 px-2.5 rounded-md inline-flex items-center gap-1.5 text-xs transition-colors ${
                      planMode
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-secondary hover:text-foreground hover:bg-surface-raised border border-transparent"
                    }`}
                    title={planMode ? "Plan mode is on — AI plans before coding" : "Turn on plan mode"}
                    aria-pressed={planMode}
                  >
                    <ListTodo className="w-3.5 h-3.5 shrink-0" />
                    <span>Plan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void submit()}
                    aria-label="Generate"
                    disabled={!prompt.trim()}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    title="Send"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Single-line, horizontally scrollable chip slider. Edge fades
                hint that more chips exist off-screen; touchpads/trackpads/
                touchscreens scroll naturally and the bar is hidden. */}
            <div className="relative mt-5 -mx-4 sm:-mx-8">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10" />
              <div className="overflow-x-auto no-scrollbar px-4 sm:px-8">
                <div className="flex flex-nowrap items-center justify-start sm:justify-center gap-2 w-max mx-auto">
                  {PROMPT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPrompt(s)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs text-secondary border border-border bg-surface/60 hover:text-foreground hover:border-primary transition-colors whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-secondary">
              <span>Powered by Anthropic Claude</span>
              <span aria-hidden className="text-border">·</span>
              <span>Real Postgres on Neon</span>
              <span aria-hidden className="text-border">·</span>
              <span>One-click publish to Vercel</span>
            </div>
          </div>
          </div>
        </section>

        {/* How it works — visual zig-zag */}
        <section id="how" className="py-20 md:py-32 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
                <span className="block sm:inline">From "wouldn't it be cool if…"</span>{" "}
                <span className="block sm:inline">
                  to <span className="text-primary">live in production.</span>
                </span>
              </h2>
              <p className="text-secondary text-base md:text-lg">
                Three moves. Each one is a single sentence. No frameworks to learn.
              </p>
            </div>

            <div className="space-y-20 md:space-y-28">
              {STEPS.map((s, i) => {
                const reverse = i % 2 === 1;
                return (
                  <div
                    key={s.step}
                    className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14 items-center ${
                      reverse ? "md:[&>*:first-child]:order-2" : ""
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono text-primary mb-3">
                        STEP {s.step}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
                        {s.title}
                      </h3>
                      <p className="text-secondary text-base md:text-lg leading-relaxed">
                        {s.body}
                      </p>
                    </div>

                    {/* Visual mock per step */}
                    <div className="relative">
                      <div className="absolute -inset-6 bg-primary/10 blur-3xl rounded-full -z-10" />
                      {i === 0 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 p-4 space-y-3">
                          {s.chat?.map((m, j) => (
                            <div
                              key={j}
                              className={`flex ${m.who === "you" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                                  m.who === "you"
                                    ? "bg-primary/15 text-primary rounded-br-sm border border-primary/25"
                                    : "bg-surface-raised text-foreground rounded-bl-sm border border-border"
                                }`}
                              >
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
                          {/* Friendly browser-style preview of the app
                              as it's coming together — no code in sight,
                              so non-technical visitors see the outcome,
                              not the plumbing. */}
                          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-surface-raised">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                            <span className="ml-3 text-xs font-mono text-secondary truncate">
                              recipes.app — preview
                            </span>
                          </div>
                          <div className="p-5 bg-surface-raised/30 space-y-4">
                            <div className="space-y-2">
                              <div className="h-3 w-1/3 rounded bg-foreground/15" />
                              <div className="h-2 w-2/3 rounded bg-foreground/10" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[1, 2, 3, 4].map((n) => (
                                <div
                                  key={n}
                                  className="rounded-lg border border-border bg-background p-2.5"
                                >
                                  <div className="aspect-[4/3] rounded bg-gradient-to-br from-primary/30 to-foreground/5 mb-2" />
                                  <div className="h-1.5 w-3/4 rounded bg-foreground/15 mb-1" />
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <span
                                        key={s}
                                        className={`w-1 h-1 rounded-full ${s <= (n % 4) + 2 ? "bg-primary" : "bg-foreground/20"}`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="px-4 py-2 border-t border-border flex items-center gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-secondary">Adding "Save recipe" button…</span>
                          </div>
                        </div>
                      )}

                      {i === 2 && (
                        <div className="rounded-xl border border-border bg-surface shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-raised">
                            <Globe className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-mono text-secondary truncate">
                              https://{s.url}
                            </span>
                            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/15 text-success">
                              LIVE
                            </span>
                          </div>
                          <div className="p-5 bg-surface-raised/30">
                            <div className="h-3 w-1/3 rounded bg-foreground/10 mb-3" />
                            <div className="h-2 w-2/3 rounded bg-foreground/10 mb-2" />
                            <div className="h-2 w-1/2 rounded bg-foreground/10 mb-5" />
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3].map((n) => (
                                <div
                                  key={n}
                                  className="aspect-square rounded bg-gradient-to-br from-primary/30 to-foreground/5"
                                />
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

        {/* Templates */}
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
              <Link
                href="/templates"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="text-sm text-secondary">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-secondary">
                No templates yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.slice(0, 4).map((t) => (
                  <Link
                    key={t.id}
                    href={`/${t.author}/${t.slug}`}
                    className="group rounded-xl border border-border bg-surface hover-elevate overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 via-surface-raised to-background relative overflow-hidden p-3">
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-mono uppercase z-10">
                        {t.framework}
                      </div>
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
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-xs text-secondary">{t.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 px-4 sm:px-6 border-t border-border">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              Ready to build?
            </h2>
            <p className="text-lg text-secondary mb-10 max-w-xl mx-auto">
              Free to start. No credit card. No "schedule a demo" nonsense.
            </p>
            <Link href="/login">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-10 text-lg font-semibold"
              >
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

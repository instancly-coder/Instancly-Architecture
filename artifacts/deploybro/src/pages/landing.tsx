import {
  ArrowUp,
  ArrowRight,
  Cpu,
  Check,
  Plus,
  Image as ImageIcon,
  Link2,
  ChevronDown,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { SKILLS, buildSkillsPrefix, type Skill } from "@/skills";
import { Link, useLocation } from "wouter";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
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

const HOME_MODELS: { name: string; key: "auto" | "haiku" | "sonnet" | "opus"; note: string }[] = [
  { name: "Auto Bro",    key: "auto",   note: "Picks the right model" },
  { name: "Economy Bro", key: "haiku",  note: "Fast & cheap"   },
  { name: "Smart Bro",   key: "sonnet", note: "Balanced" },
  { name: "Power Bro",   key: "opus",   note: "Most capable" },
];



// Quick-start project ideas surfaced as chips under the homepage prompt
// box. Each entry has a short button label and a fully-fleshed prompt
// that gets handed straight to the builder so the AI has enough to
// scaffold a real first build (not "make a wedding site" but a complete
// brief covering pages, sections, and tone).
const IDEAS: { label: string; prompt: string }[] = [
  {
    label: "Wedding planner",
    prompt:
      "A wedding planning app for a couple. Include a guest list with RSVP tracking, a budget tracker broken down by category (venue, catering, attire, etc.), a vendor contact directory, a week-by-week task checklist, and a wedding-day timeline. Use a soft, romantic visual style with serif headings and warm neutral colors.",
  },
  {
    label: "Online shop",
    prompt:
      "A small online shop. Include a product grid with category filters, product detail pages with an image gallery and add-to-cart, a shopping cart sheet, and a checkout form ready to wire up to Stripe. Clean, minimal layout with product photography front and center.",
  },
  {
    label: "SaaS landing page",
    prompt:
      "A modern SaaS landing page. Include a hero with a strong headline, subhead and primary CTA, a feature grid with icons, a testimonials carousel, a 3-tier pricing table with a most-popular plan, an FAQ accordion, and a final sign-up section. Bold typography, generous whitespace, accent color for CTAs.",
  },
  {
    label: "Portfolio site",
    prompt:
      "A personal portfolio site. Include a hero with my name and a short tagline, an about section, a case-study grid for past projects with detail pages, a writing/blog feed, and a contact form. Confident editorial design with strong typography and lots of breathing room.",
  },
  {
    label: "Restaurant",
    prompt:
      "A restaurant website. Include a hero with the restaurant name and tagline, a full menu organized by category with prices, hours and address with a map embed, a photo gallery of the food and space, and a reservation form. Warm color palette and food-photography-driven layout.",
  },
  {
    label: "Habit tracker",
    prompt:
      "A habit tracking app. Include a daily checklist of habits, a streak counter for each habit, a calendar heat-map view of completions over the year, weekly stats with progress charts, and a place to add or edit habits. Calm, minimal design with rounded cards and a soft accent color.",
  },
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
  const [selectedModel, setSelectedModel] = useState<string>("Auto Bro");
  const [planMode, setPlanMode] = useState<boolean>(false);
  const [refUrls, setRefUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");
  const [attachNotice, setAttachNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  // Pick a random subset of IDEAS to display so the chip row stays
  // capped at ~2 lines on the homepage. The Refresh button reshuffles.
  const VISIBLE_IDEAS = 5;
  const pickIdeas = useCallback(() => {
    const indices = IDEAS.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j]!, indices[i]!];
    }
    return indices.slice(0, VISIBLE_IDEAS);
  }, []);
  const [ideaIndices, setIdeaIndices] = useState<number[]>(() => pickIdeas());
  // Active skills attached to this prompt. Each one prepends its
  // body to the final prompt before it goes to the builder, so the
  // AI knows which "expert hat" to wear. Slash-picker (below) adds
  // them; the chips above the textarea remove them.
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const addSkill = (slug: string) => {
    setActiveSkills((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
  };
  const removeSkill = (slug: string) => {
    setActiveSkills((prev) => prev.filter((s) => s !== slug));
  };
  // Deep-link: `/?skill=foo` (or `/?skills=foo,bar`) pre-attaches the
  // referenced skill(s) and clears the query so the URL stays clean.
  // Any unknown slug is silently ignored. We focus the prompt so the
  // user can immediately type their request after landing here from the
  // /skills page's "+ Add to prompt" buttons.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hadSkillParam =
      params.has("skill") || params.has("skills");
    if (!hadSkillParam) return;
    const raw = params.get("skill") ?? params.get("skills") ?? "";
    const slugs = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => SKILLS.some((sk) => sk.slug === s));
    // Always strip the params so the URL doesn't keep re-triggering this
    // effect on remount and so a stale `?skill=` doesn't sit in the
    // address bar after handling. We do this even when every slug was
    // invalid, otherwise typos would persist visibly.
    params.delete("skill");
    params.delete("skills");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
    if (slugs.length === 0) return;
    setActiveSkills((prev) => {
      const next = [...prev];
      for (const slug of slugs) if (!next.includes(slug)) next.push(slug);
      return next;
    });
    requestAnimationFrame(() => promptRef.current?.focus());
  }, []);
  // Slash-picker: opens when the user's current prompt looks like
  // `/<query>` with no whitespace yet, so it doesn't fire on prose
  // that happens to contain a slash mid-sentence.
  const slashMatch = /^\/([\w-]*)$/.exec(prompt);
  const slashOpen = slashMatch !== null;
  const slashQuery = (slashMatch?.[1] ?? "").toLowerCase();
  const slashResults: Skill[] = slashOpen
    ? SKILLS.filter(
        (s) =>
          !activeSkills.includes(s.slug) &&
          (s.slug.toLowerCase().includes(slashQuery) ||
            s.name.toLowerCase().includes(slashQuery)),
      ).slice(0, 8)
    : [];
  // Highlighted item in the slash picker (for arrow-key navigation).
  // Clamp to the current results length so the user doesn't end up
  // pointing past the end of the array as they type.
  const [slashIndex, setSlashIndex] = useState(0);
  const safeSlashIndex =
    slashResults.length === 0
      ? 0
      : Math.min(slashIndex, slashResults.length - 1);
  const pickSkill = (slug: string) => {
    addSkill(slug);
    setPrompt("");
    setSlashIndex(0);
    requestAnimationFrame(() => promptRef.current?.focus());
  };
  const { data: templates = [], isLoading } = useTemplates();
  const { data: me } = useMe();
  // Match the in-builder gate (`builder.tsx`): plan defaults to "Free"
  // for logged-out visitors so the marketing surface mirrors the locked
  // experience they'll see after signing up. Anyone on a plan other
  // than Free unlocks the Pro-only models.
  const isFreePlan = (me?.plan ?? "Free").toLowerCase() === "free";


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

  // Idea-chip click path: drop the fleshed-out prompt into the box
  // above so the user can tweak it before sending. Only the Send
  // button (or Enter inside the textarea) actually navigates to the
  // builder — chips are an inspiration shortcut, not a redirect.
  const fillPromptFromIdea = (ideaPrompt: string) => {
    setPrompt(ideaPrompt);
    // Focus and drop the cursor at the end so further typing extends
    // the prompt naturally.
    requestAnimationFrame(() => {
      const el = promptRef.current;
      if (!el) return;
      el.focus();
      try {
        el.setSelectionRange(ideaPrompt.length, ideaPrompt.length);
      } catch {}
    });
  };

  const submit = async () => {
    const value = prompt.trim();
    // Guard: a build requires actual user text. Skills alone are
    // just instructions — without a request they'd kick off an
    // empty build. We bail out (and bounce focus back) if the user
    // only attached skills without typing anything.
    if (!value) {
      promptRef.current?.focus();
      return;
    }
    // Skills get prepended as "Apply the following skill instructions
    // to the request below…" so the builder receives one combined
    // prompt. Empty skills array → no prefix, identical to before.
    const finalPrompt = `${buildSkillsPrefix(activeSkills)}${value}`.trim();
    try { sessionStorage.setItem("deploybro:initial-prompt", finalPrompt); }
    catch {}
    try {
      const modelKey = HOME_MODELS.find((m) => m.name === selectedModel)?.key ?? "auto";
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
    // When the slash-picker is open, Enter or Tab confirms the first
    // matching skill instead of submitting the prompt. Esc closes it
    // (by clearing the partial /token).
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        if (slashResults.length > 0) {
          e.preventDefault();
          setSlashIndex((i) => (i + 1) % slashResults.length);
          return;
        }
      }
      if (e.key === "ArrowUp") {
        if (slashResults.length > 0) {
          e.preventDefault();
          setSlashIndex(
            (i) => (i - 1 + slashResults.length) % slashResults.length,
          );
          return;
        }
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (slashResults.length > 0) {
          e.preventDefault();
          pickSkill(slashResults[safeSlashIndex]!.slug);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPrompt("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="relative overflow-hidden -mt-14 pt-14">
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,hsl(var(--primary)/0.18)_0%,transparent_75%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(30%_22%_at_50%_2%,hsl(var(--primary)/0.38)_0%,transparent_70%)]" />
          </div>
          <div className="relative z-10 flex justify-center pt-10 pb-4">
            <Link href="https://deploybro.com/explore" className="glass-pill group inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium text-foreground/90 transition-transform hover:-translate-y-px">
              Introducing DeployBro v2
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
          <div className="px-4 sm:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center justify-center min-h-[80vh] pt-2 pb-16">
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-6 leading-none">
              What will you <span className="text-primary">build</span> today?
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-semibold max-w-xl mx-auto mb-10">
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
              <div className="prompt-glow builder-chat-input-shell rounded-xl relative">
                {activeSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 pb-0">
                    {activeSkills.map((slug) => {
                      const s = SKILLS.find((x) => x.slug === slug);
                      if (!s) return null;
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-[11px] text-foreground"
                          title={s.description}
                        >
                          <Sparkles className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">{s.name}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(slug)}
                            className="text-secondary hover:text-foreground"
                            aria-label={`Remove ${s.name} skill`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {slashOpen && (
                  // Floating skill picker. Positioned above the input
                  // so it doesn't push the layout around as it opens
                  // and closes; capped to 8 results to stay scannable.
                  <div
                    className="absolute left-0 right-0 bottom-full mb-2 z-20 rounded-xl border border-border bg-surface shadow-lg overflow-hidden"
                    role="dialog"
                    aria-label="Skill picker"
                  >
                    <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-secondary border-b border-border">
                      Skills{slashQuery ? ` matching "${slashQuery}"` : ""}
                    </div>
                    {slashResults.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-secondary">
                        No matching skills. Press Esc to dismiss.
                      </div>
                    ) : (
                      <ul
                        className="max-h-72 overflow-y-auto"
                        role="listbox"
                        aria-label="Available skills"
                      >
                        {slashResults.map((s, idx) => (
                          <li key={s.slug} role="option" aria-selected={idx === safeSlashIndex}>
                            <button
                              type="button"
                              onMouseEnter={() => setSlashIndex(idx)}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pickSkill(s.slug);
                              }}
                              className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-raised transition-colors ${
                                idx === safeSlashIndex ? "bg-surface-raised" : ""
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {s.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-secondary">
                                    /{s.slug}
                                  </span>
                                </div>
                                <div className="text-[11px] text-secondary line-clamp-2">
                                  {s.description}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
                <textarea ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={onKeyDown} placeholder={refUrls.length > 0 ? "Tell DeployBro how to redesign these references..." : planMode ? "Plan first, then build... describe your idea" : "Ask DeployBro to create a landing page for my..."} className="w-full min-h-[60px] max-h-[180px] bg-transparent p-3 text-sm text-foreground placeholder:text-muted focus:outline-none resize-none" />
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
                          // All tiers are available to every user —
                          // billing flows per-token from the user's
                          // balance, so the model picker is a UX
                          // choice, not a paywall.
                          return (
                            <button
                              key={m.name}
                              type="button"
                              onClick={() => {
                                setSelectedModel(m.name);
                                setModelOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors text-foreground hover:bg-surface-raised"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate flex items-center gap-1.5">
                                  <span className="truncate">{m.name}</span>
                                  {m.key === "auto" && (
                                    <span className="text-[9px] leading-none px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-mono uppercase tracking-wider shrink-0">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-secondary font-mono">{m.note}</div>
                              </div>
                              {active && (
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
                      {/* Visual checkbox indicator. Mirrors the
                          builder's Plan toggle so the on/off state
                          reads instantly without needing the icon. */}
                      <span
                        aria-hidden="true"
                        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors ${
                          planMode
                            ? "bg-primary border-primary"
                            : "border-secondary/70"
                        }`}
                      >
                        {planMode && (
                          <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                        )}
                      </span>
                      <span>Plan</span>
                    </button>
                    <button type="button" onClick={() => void submit()} aria-label="Generate" disabled={!prompt.trim()} className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors" title="Send">
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {/* Idea chips — quick-start presets that skip the typing
                  step. Each chip carries a fleshed-out prompt over to
                  the builder so the first build has enough context to
                  produce something real, not a stub. */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
                <span className="text-[10px] uppercase tracking-wider font-mono text-secondary mr-1">
                  Or try
                </span>
                {ideaIndices.map((i) => {
                  const idea = IDEAS[i];
                  if (!idea) return null;
                  return (
                    <button
                      key={idea.label}
                      type="button"
                      onClick={() => fillPromptFromIdea(idea.prompt)}
                      className="px-3 py-1.5 rounded-full bg-surface hover:bg-surface-raised text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
                    >
                      {idea.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setIdeaIndices(pickIdeas())}
                  aria-label="Show different ideas"
                  title="Show different ideas"
                  className="p-1.5 rounded-full bg-surface hover:bg-surface-raised text-secondary hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
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
                  className="rounded-xl bg-surface p-6 md:p-7 hover-elevate transition-colors"
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
              <div className="rounded-2xl bg-surface p-8 text-center text-sm text-secondary">No templates yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {templates.slice(0, 4).map((t) => (
                  <Link key={t.id} href={`/${t.author}/${t.slug}`} className="group rounded-xl bg-surface hover-elevate overflow-hidden flex flex-col">
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
                          className="absolute inset-0 w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="absolute inset-3 rounded bg-background/80 backdrop-blur-sm border border-border/50 p-2 flex flex-col gap-1.5">
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

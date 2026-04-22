import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Box,
  ChevronRight,
  FolderTree,
  History,
  Settings as SettingsIcon,
  MoreVertical,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  ExternalLink,
  X,
  Send,
  ChevronDown,
  FileCode2,
  Play,
  Database,
  CreditCard,
  BarChart3,
  MessageSquare,
  Save,
  Trash2,
  Plug,
  Plus,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Search,
  Check,
  ArrowUp,
  Paperclip,
  Cpu,
  Globe,
  ShieldCheck,
  AlertCircle,
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { mockUser, mockModels } from "@/lib/mock-data";
import { toast } from "sonner";

type TabKey =
  | "preview"
  | "files"
  | "database"
  | "analytics"
  | "payments"
  | "integrations"
  | "domains"
  | "history"
  | "settings";

const TAB_META: Record<TabKey, { label: string; icon: any }> = {
  preview: { label: "Preview", icon: Play },
  files: { label: "Files", icon: FolderTree },
  database: { label: "Database", icon: Database },
  analytics: { label: "Analytics", icon: BarChart3 },
  payments: { label: "Payments", icon: CreditCard },
  integrations: { label: "Integrations", icon: Plug },
  domains: { label: "Domains", icon: Globe },
  history: { label: "History", icon: History },
  settings: { label: "Settings", icon: SettingsIcon },
};

const ADDABLE_TABS: TabKey[] = [
  "files",
  "database",
  "analytics",
  "payments",
  "domains",
  "integrations",
  "history",
  "settings",
];

type PastBuild = {
  id: string;
  number: number;
  prompt: string;
  aiMessage: string;
  durationSec: number;
  cost: number;
  filesChanged: number;
  tokensIn: number;
  tokensOut: number;
  model: string;
  ago: string;
};

const PAST_BUILDS: PastBuild[] = [
  {
    id: "b3",
    number: 3,
    prompt: "Add a leaderboard sorted by streak length with weekly reset.",
    aiMessage:
      "Added a leaderboard sorted by streak length. I created a new `/leaderboard` page, wrote a SQL view that recalculates weekly, and wired up a cron-style reset every Monday at 00:00 UTC. Top 10 users now show with rank badges. Have a look — does the layout feel right?",
    durationSec: 142,
    cost: 0.04,
    filesChanged: 6,
    tokensIn: 12_840,
    tokensOut: 4_120,
    model: "Claude Sonnet 4.5",
    ago: "5 mins ago",
  },
  {
    id: "b2",
    number: 2,
    prompt: "Wire the form to Postgres and add zod validation.",
    aiMessage:
      "Wired the signup form to Postgres and added zod validation on both client and server. I also added inline error states under each field and a friendly toast on success. Try submitting an empty email — you should see a clean error.",
    durationSec: 98,
    cost: 0.03,
    filesChanged: 4,
    tokensIn: 8_310,
    tokensOut: 2_640,
    model: "Claude Sonnet 4.5",
    ago: "12 mins ago",
  },
  {
    id: "b1",
    number: 1,
    prompt: "Create a habit tracker with streaks and a weekly chart.",
    aiMessage:
      "Done. I built the initial habit tracker — a daily checklist, automatic streak counter, and a weekly bar chart at the top showing completion. There's also a small celebration animation when you hit a 7-day streak. Tell me what to tweak next.",
    durationSec: 217,
    cost: 0.07,
    filesChanged: 11,
    tokensIn: 24_500,
    tokensOut: 9_800,
    model: "Claude Sonnet 4.5",
    ago: "27 mins ago",
  },
];

const STREAM_STEPS = [
  { phase: "Planning", text: "Sketching component tree and routes" },
  { phase: "Reading", text: "Scanning src/components/ui" },
  { phase: "Writing", text: "Editing src/app/page.tsx" },
  { phase: "Writing", text: "Updating src/lib/db.ts" },
  { phase: "Migrating", text: "Applying Postgres schema" },
  { phase: "Done", text: "Build complete · £0.03 · 4.1s" },
];

export default function Builder() {
  const params = useParams();
  const { username, slug } = params;

  const [openTabs, setOpenTabs] = useState<TabKey[]>(["preview"]);
  const [activeTab, setActiveTab] = useState<TabKey>("preview");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [tabSearch, setTabSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const liveUrl = `https://${slug}-${username}.instancly.app`;
  const [urlValue, setUrlValue] = useState(liveUrl);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setUrlValue(liveUrl);
  }, [liveUrl]);

  const openTab = (key: TabKey) => {
    setOpenTabs((tabs) => (tabs.includes(key) ? tabs : [...tabs, key]));
    setActiveTab(key);
    setAddOpen(false);
    setTabSearch("");
  };

  const closeTab = (key: TabKey) => {
    if (key === "preview") return;
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== key);
      if (activeTab === key) {
        const idx = tabs.indexOf(key);
        const fallback = next[idx - 1] ?? next[0] ?? "preview";
        setActiveTab(fallback);
      }
      return next;
    });
  };

  const availableToAdd = ADDABLE_TABS.filter((k) => !openTabs.includes(k)).filter(
    (k) => TAB_META[k].label.toLowerCase().includes(tabSearch.toLowerCase())
  );

  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [stepIndex, setStepIndex] = useState<number>(-1);
  const [typed, setTyped] = useState("");
  const [activeFile, setActiveFile] = useState<string>("src/app/page.tsx");
  const [openBuildId, setOpenBuildId] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Resizable chat panel (desktop)
  const [chatWidth, setChatWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 400;
    const saved = Number(localStorage.getItem("instancly:chatWidth"));
    return saved >= 280 && saved <= 720 ? saved : 400;
  });
  const draggingRef = useRef(false);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const w = Math.min(720, Math.max(280, e.clientX));
      setChatWidth(w);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem("instancly:chatWidth", String(chatWidth));
      } catch {}
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [chatWidth]);
  const startDrag = () => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Typewriter for current step
  useEffect(() => {
    if (stepIndex < 0 || stepIndex >= STREAM_STEPS.length) return;
    const target = STREAM_STEPS[stepIndex].text;
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(target.slice(0, i));
      if (i >= target.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [stepIndex]);

  const handleSend = () => {
    if (!chatInput.trim() || isStreaming) return;
    setChatInput("");
    setIsStreaming(true);
    setStepIndex(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      if (i >= STREAM_STEPS.length) {
        window.clearInterval(id);
        setIsStreaming(false);
        return;
      }
      setStepIndex(i);
    }, 1200);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(`${slug}-${username}.instancly.app`);
    toast.success("URL copied");
  };

  const copyDbUrl = () => {
    navigator.clipboard.writeText(`postgres://user:pass@ep-cool-db.neon.tech/main`);
    toast.success("Connection string copied");
  };

  const currentStep = stepIndex >= 0 ? STREAM_STEPS[stepIndex] : null;

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden text-foreground">
      {/* Top Navbar */}
      <header className="h-12 border-b border-border bg-surface flex items-center justify-between px-3 md:px-4 shrink-0 relative z-50 gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity shrink-0">
            <Box className="w-5 h-5 text-primary" />
          </Link>
          <div className="w-px h-4 bg-border hidden sm:block"></div>
          <div className="flex items-center text-sm font-mono text-secondary min-w-0">
            <span className="hidden sm:inline">{username}</span>
            <ChevronRight className="w-4 h-4 mx-1 hidden sm:inline" />
            <span className="text-foreground truncate">{slug}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-success ml-1 shrink-0" title="Live" />
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <span className="hidden lg:inline text-xs text-secondary font-mono">
            £0.03 spend
          </span>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 md:px-4 font-medium rounded-md"
              >
                Publish
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border">
              <DropdownMenuItem>Deploy to instancly.app</DropdownMenuItem>
              <DropdownMenuItem>Connect custom domain</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem>Export as ZIP</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <button className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-background border border-border text-xs font-mono font-medium hover:bg-surface-raised transition-colors">
                £{mockUser.balance.toFixed(2)}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-64 border-border p-4"
            >
              <h4 className="font-medium mb-2">Current Balance</h4>
              <div className="text-2xl font-mono mb-4">
                £{mockUser.balance.toFixed(2)}
              </div>
              <Link href="/dashboard/billing">
                <Button className="w-full text-xs" variant="outline">
                  Manage Billing
                </Button>
              </Link>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="md:hidden w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border">
              <DropdownMenuItem>Rules Book</DropdownMenuItem>
              <DropdownMenuItem>Integrations</DropdownMenuItem>
              <DropdownMenuItem>Share link</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem>
                <span className="font-mono text-xs">£{mockUser.balance.toFixed(2)} balance</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel - Chat (desktop) */}
        <aside
          className="hidden md:flex shrink-0 border-r border-border bg-surface flex-col h-full"
          style={{ width: chatWidth }}
        >
          <ChatPanel
            chatInput={chatInput}
            setChatInput={setChatInput}
            isStreaming={isStreaming}
            currentPhase={currentStep?.phase}
            typed={typed}
            onSend={handleSend}
            openBuildId={openBuildId}
            setOpenBuildId={setOpenBuildId}
          />
        </aside>
        {/* Drag handle to resize chat */}
        <div
          onMouseDown={startDrag}
          onDoubleClick={() => setChatWidth(400)}
          className="hidden md:block w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/40 active:bg-primary/60 transition-colors -ml-px relative z-10"
          title="Drag to resize · double-click to reset"
        />

        {/* Right Panel - Tabbed Workspace */}
        <section className="flex-1 flex flex-col bg-background overflow-hidden min-w-0">
          {/* Tab strip */}
          <div className="h-11 border-b border-border bg-surface flex items-center px-2 gap-1 overflow-x-auto shrink-0">
            {openTabs.map((key) => {
              const meta = TAB_META[key];
              const Icon = meta.icon;
              const active = activeTab === key;
              const closeable = key !== "preview";
              return (
                <div
                  key={key}
                  className={`group h-8 pl-3 pr-1 rounded-md text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-secondary hover:text-foreground hover:bg-surface-raised"
                  }`}
                >
                  <button
                    onClick={() => setActiveTab(key)}
                    className="flex items-center gap-2 h-full pr-1"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{meta.label}</span>
                  </button>
                  {closeable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(key);
                      }}
                      className={`w-5 h-5 rounded flex items-center justify-center ml-0.5 transition-colors ${
                        active
                          ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-black/20"
                          : "text-secondary hover:text-foreground hover:bg-background/60"
                      }`}
                      aria-label={`Close ${meta.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="w-1.5" />
                  )}
                </div>
              );
            })}

            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <button
                  className="ml-1 w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors shrink-0"
                  aria-label="Add tab"
                  title="Add tab"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-2 border-border">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-secondary" />
                  <input
                    autoFocus
                    value={tabSearch}
                    onChange={(e) => setTabSearch(e.target.value)}
                    placeholder="Search tabs..."
                    className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {availableToAdd.length === 0 ? (
                    <div className="text-xs text-secondary px-2 py-3 text-center">
                      No tabs match
                    </div>
                  ) : (
                    availableToAdd.map((k) => {
                      const meta = TAB_META[k];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={k}
                          onClick={() => openTab(k)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{meta.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Live URL bar (preview only) */}
          {activeTab === "preview" && (
            <div className="h-10 border-b border-border bg-surface grid grid-cols-[auto_1fr_auto] items-center gap-1 px-2 shrink-0">
              {/* Left: nav controls */}
              <div className="flex items-center gap-0.5">
                <button
                  className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                  title="Back"
                  onClick={() => toast.message("Navigated back")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                  title="Forward"
                  onClick={() => toast.message("Navigated forward")}
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                  title="Refresh"
                  onClick={() => {
                    setIframeKey((k) => k + 1);
                    toast.success("Preview refreshed");
                  }}
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Center: URL input */}
              <div className="flex justify-center min-w-0 px-2">
                <input
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="w-full max-w-[520px] h-7 bg-background border border-border rounded-md px-3 text-xs font-mono text-foreground text-center outline-none focus:ring-1 focus:ring-primary truncate"
                />
              </div>

              {/* Right: viewport dropdown + actions */}
              <div className="flex items-center gap-0.5">
                <ViewportPicker viewport={viewport} setViewport={setViewport} />
                <button
                  onClick={copyUrl}
                  className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                  title="Copy URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative">
            {activeTab === "preview" && (
              <PreviewPane
                key={iframeKey}
                viewport={viewport}
                setViewport={setViewport}
              />
            )}
            {activeTab === "files" && (
              <FilesPane activeFile={activeFile} setActiveFile={setActiveFile} />
            )}
            {activeTab === "database" && <DatabaseView copyDbUrl={copyDbUrl} />}
            {activeTab === "analytics" && <AnalyticsView />}
            {activeTab === "payments" && <PaymentsView />}
            {activeTab === "integrations" && <IntegrationsView />}
            {activeTab === "domains" && <DomainsView />}
            {activeTab === "history" && (
              <HistoryPane
                openBuildId={openBuildId}
                setOpenBuildId={setOpenBuildId}
              />
            )}
            {activeTab === "settings" && <SettingsPane />}
          </div>
        </section>
      </div>

      {/* Mobile Chat Sheet */}
      <button
        onClick={() => setMobileChatOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90"
        aria-label="Open chat"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {mobileChatOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 animate-in fade-in"
          onClick={() => setMobileChatOpen(false)}
        />
      )}
      <div
        className={`md:hidden fixed left-0 right-0 bottom-0 z-50 h-[85vh] bg-surface border-t border-border rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ${
          mobileChatOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-10 h-1 rounded-full bg-border block sm:hidden absolute left-1/2 -translate-x-1/2 top-2" />
            <h3 className="font-bold text-sm">Build chat</h3>
          </div>
          <button
            onClick={() => setMobileChatOpen(false)}
            className="text-secondary hover:text-foreground p-1 rounded hover:bg-surface-raised"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ChatPanel
          chatInput={chatInput}
          setChatInput={setChatInput}
          isStreaming={isStreaming}
          currentPhase={currentStep?.phase}
          typed={typed}
          onSend={handleSend}
          openBuildId={openBuildId}
          setOpenBuildId={setOpenBuildId}
        />
      </div>
    </div>
  );
}

/* ----------------------------- Subcomponents ----------------------------- */

function TabBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-md text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-secondary hover:text-foreground hover:bg-surface-raised"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function ChatPanel({
  chatInput,
  setChatInput,
  isStreaming,
  currentPhase,
  typed,
  onSend,
  openBuildId,
  setOpenBuildId,
}: {
  chatInput: string;
  setChatInput: (v: string) => void;
  isStreaming: boolean;
  currentPhase: string | undefined;
  typed: string;
  onSend: () => void;
  openBuildId: string | null;
  setOpenBuildId: (id: string | null) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(
    mockModels[0]?.name ?? "Claude Sonnet 4.5"
  );
  const [modelOpen, setModelOpen] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)].slice(0, 6));
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* Conversation thread (oldest first, like a chat) */}
        {[...PAST_BUILDS].reverse().map((b) => {
          const open = openBuildId === b.id;
          const mins = Math.floor(b.durationSec / 60);
          const secs = b.durationSec % 60;
          const durationLabel =
            mins < 1
              ? `${b.durationSec}s`
              : secs === 0
              ? `${mins} min`
              : `${mins} min ${secs}s`;
          return (
            <div key={b.id} className="space-y-3">
              {/* User prompt */}
              <div className="flex justify-end">
                <div className="max-w-[88%] px-3.5 py-2 rounded-2xl rounded-br-md bg-primary/15 text-primary text-sm leading-snug">
                  {b.prompt}
                </div>
              </div>

              {/* AI response */}
              <div className="space-y-2">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {b.aiMessage}
                </p>

                {/* Footer: Checkpoint on its own line, then clickable price/time */}
                <div className="pt-1 space-y-1.5 text-xs text-secondary">
                  <button
                    onClick={() =>
                      toast.success(`Restored to checkpoint · Build #${b.number}`)
                    }
                    className="flex items-center gap-1.5 font-mono hover:text-foreground transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span>Checkpoint · {b.ago}</span>
                  </button>
                  <button
                    onClick={() => setOpenBuildId(open ? null : b.id)}
                    className="font-mono inline-flex items-center gap-1 hover:text-primary underline-offset-2 hover:underline transition-colors"
                  >
                    Worked for {durationLabel} · £{b.cost.toFixed(2)}
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded price details */}
                {open && (
                  <div className="mt-2 rounded-lg border border-border bg-surface p-3 space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Model</span>
                      <span className="font-mono text-foreground">{b.model}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Tokens in</span>
                      <span className="font-mono text-foreground">
                        {b.tokensIn.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Tokens out</span>
                      <span className="font-mono text-foreground">
                        {b.tokensOut.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Files changed</span>
                      <span className="font-mono text-foreground">
                        {b.filesChanged}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Duration</span>
                      <span className="font-mono text-foreground">
                        {durationLabel}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 flex items-center justify-between">
                      <span className="font-medium text-foreground">Total</span>
                      <span className="font-mono font-semibold text-primary">
                        £{b.cost.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 border-border mt-1"
                    >
                      Restore this checkpoint
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live streaming status (latest, in-progress turn) */}
        {(isStreaming || currentPhase) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isStreaming && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-[11px] uppercase tracking-wider font-mono text-primary">
                {currentPhase ?? "Working"}
              </span>
            </div>
            <div className="font-mono text-sm text-foreground leading-snug min-h-[1.4em]">
              {typed}
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 align-text-bottom animate-pulse" />
            </div>
          </div>
        )}

        {!isStreaming && !currentPhase && PAST_BUILDS.length === 0 && (
          <div className="text-xs text-secondary text-center py-8">
            Tell the AI what to build. Watch the work happen live.
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-surface shrink-0">
        <div className="rounded-xl border border-border bg-background focus-within:ring-1 focus-within:ring-primary transition-shadow">
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 pb-0">
              {attachments.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 max-w-[180px] px-2 py-1 rounded-md bg-surface-raised border border-border text-[11px] text-foreground"
                >
                  <Paperclip className="w-3 h-3 text-secondary shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="text-secondary hover:text-foreground"
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Describe a change..."
            className="w-full min-h-[60px] max-h-[180px] bg-transparent p-3 text-sm focus:outline-none resize-none"
          />

          {/* Action row: attach + model picker (left), send (right) */}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  handleFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors shrink-0"
                title="Attach files"
                aria-label="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11px] font-mono text-secondary hover:text-foreground hover:bg-surface-raised transition-colors min-w-0"
                    title="Change model"
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
                  {mockModels.map((m) => {
                    const active = m.name === selectedModel;
                    return (
                      <button
                        key={m.name}
                        onClick={() => {
                          setSelectedModel(m.name);
                          setModelOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-foreground hover:bg-surface-raised transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{m.name}</div>
                          <div className="text-[10px] text-secondary font-mono">
                            {m.costRange}
                          </div>
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

            <button
              onClick={onSend}
              disabled={!chatInput.trim() || isStreaming}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0"
              title="Send"
              aria-label="Send"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-[10px] text-secondary text-center mt-2">
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider font-mono text-secondary">
        {label}
      </div>
      <div className="font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}

/* -------------------------------- Panels -------------------------------- */

function PreviewPane({
  viewport,
  setViewport,
}: {
  viewport: "desktop" | "tablet" | "mobile";
  setViewport: (v: "desktop" | "tablet" | "mobile") => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-surface-raised">
      <div className="flex-1 p-3 md:p-8 flex items-center justify-center overflow-hidden">
        <div
          className="bg-white w-full h-full flex flex-col transition-all duration-200 ease-in-out rounded-md overflow-hidden shadow-2xl"
          style={{
            maxWidth:
              viewport === "desktop"
                ? "100%"
                : viewport === "tablet"
                ? "768px"
                : "390px",
            maxHeight: viewport === "mobile" ? "844px" : "100%",
          }}
        >
          <div className="border-b border-gray-200 px-4 py-2 flex items-center shadow-sm">
            <div className="font-bold text-black text-sm">Todo App</div>
          </div>
          <div className="flex-1 p-6 bg-gray-50 flex justify-center text-black overflow-y-auto">
            <div className="w-full max-w-md bg-white p-6 rounded shadow-sm border border-gray-200 h-fit">
              <h2 className="text-xl font-bold mb-4">Tasks</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add task"
                />
                <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors">
                  Add
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 border-b">
                  <input type="checkbox" defaultChecked />
                  <span className="line-through text-gray-500 text-sm">
                    Design DB schema
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 border-b">
                  <input type="checkbox" />
                  <span className="text-sm">Implement auth</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function ViewportPicker({
  viewport,
  setViewport,
}: {
  viewport: "desktop" | "tablet" | "mobile";
  setViewport: (v: "desktop" | "tablet" | "mobile") => void;
}) {
  const options: {
    key: "desktop" | "tablet" | "mobile";
    label: string;
    sub: string;
    icon: any;
  }[] = [
    { key: "desktop", label: "Desktop", sub: "Full width", icon: Monitor },
    { key: "tablet", label: "Tablet", sub: "768 px", icon: Tablet },
    { key: "mobile", label: "Mobile", sub: "390 × 844", icon: Smartphone },
  ];
  const current = options.find((o) => o.key === viewport)!;
  const CurrentIcon = current.icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-7 px-2 rounded flex items-center gap-1.5 text-xs text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
          title="Change preview size"
        >
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border w-48 p-1">
        {options.map((o) => {
          const Icon = o.icon;
          const active = o.key === viewport;
          return (
            <DropdownMenuItem
              key={o.key}
              onClick={() => setViewport(o.key)}
              className="flex items-center gap-2.5 px-2 py-1.5 cursor-pointer"
            >
              <Icon className="w-4 h-4 text-secondary" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{o.label}</div>
                <div className="text-[10px] text-secondary font-mono">
                  {o.sub}
                </div>
              </div>
              {active && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilesPane({
  activeFile,
  setActiveFile,
}: {
  activeFile: string;
  setActiveFile: (f: string) => void;
}) {
  const tree: { path: string; group: string; size: string; status?: "M" | "A" }[] = [
    { path: "src/app/page.tsx", group: "src/app", size: "1.4 KB", status: "M" },
    { path: "src/app/layout.tsx", group: "src/app", size: "612 B" },
    { path: "src/app/api/tasks/route.ts", group: "src/app/api/tasks", size: "987 B", status: "A" },
    { path: "src/components/ui/button.tsx", group: "src/components/ui", size: "1.1 KB" },
    { path: "src/components/ui/input.tsx", group: "src/components/ui", size: "740 B" },
    { path: "src/components/task-list.tsx", group: "src/components", size: "2.1 KB", status: "A" },
    { path: "src/lib/db.ts", group: "src/lib", size: "488 B" },
    { path: "src/lib/utils.ts", group: "src/lib", size: "212 B" },
    { path: "package.json", group: "", size: "1.6 KB" },
    { path: "tailwind.config.ts", group: "", size: "894 B" },
    { path: "tsconfig.json", group: "", size: "401 B" },
  ];
  const grouped = tree.reduce<Record<string, typeof tree>>((acc, f) => {
    const k = f.group || "/";
    (acc[k] ||= []).push(f);
    return acc;
  }, {});
  const codeByFile: Record<string, string> = {
    "src/app/page.tsx": `import { useState } from "react";
import { db } from "@/lib/db";
import { TaskList } from "@/components/task-list";

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      <TaskList items={tasks} onChange={setTasks} />
    </main>
  );
}`,
  };
  const code = codeByFile[activeFile] ?? `// ${activeFile}\n\nexport default function Module() {\n  return null;\n}\n`;
  const lines = code.split("\n");
  const ext = activeFile.split(".").pop() ?? "txt";
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const activeName = activeFile.split("/").pop()!;
  const activeMeta = tree.find((t) => t.path === activeFile);

  const TreeBody = (
    <div className="p-2 space-y-3">
      {Object.entries(grouped).map(([group, files]) => (
        <div key={group}>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-mono text-secondary/70 truncate">
            {group || "root"}
          </div>
          {files.map((f) => {
            const name = f.path.split("/").pop()!;
            const active = activeFile === f.path;
            return (
              <button
                key={f.path}
                onClick={() => {
                  setActiveFile(f.path);
                  setMobileTreeOpen(false);
                }}
                className={`group w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono text-left transition-colors ${
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-secondary hover:text-foreground hover:bg-surface-raised"
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{name}</span>
                {f.status && (
                  <span
                    className={`text-[9px] font-mono px-1 rounded ${
                      f.status === "A"
                        ? "bg-success/15 text-success"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {f.status}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 flex bg-background">
      <div className="hidden md:flex w-64 border-r border-border bg-surface overflow-y-auto shrink-0 flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="text-[10px] uppercase tracking-wider font-mono text-secondary">
            Explorer
          </div>
          <span className="text-[10px] font-mono text-secondary">
            {tree.length} files
          </span>
        </div>
        {TreeBody}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="md:hidden border-b border-border bg-surface relative">
          <button
            type="button"
            onClick={() => setMobileTreeOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left"
            aria-expanded={mobileTreeOpen}
          >
            <FileCode2 className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs truncate">{activeName}</div>
              <div className="font-mono text-[10px] text-secondary truncate">
                {activeFile}
              </div>
            </div>
            {activeMeta?.status && (
              <span
                className={`text-[9px] font-mono px-1 rounded ${
                  activeMeta.status === "A"
                    ? "bg-success/15 text-success"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {activeMeta.status}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-secondary transition-transform shrink-0 ${
                mobileTreeOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {mobileTreeOpen && (
            <>
              <div
                className="fixed inset-0 z-20 bg-background/60 backdrop-blur-sm"
                onClick={() => setMobileTreeOpen(false)}
              />
              <div className="absolute left-2 right-2 top-full mt-1 z-30 rounded-lg border border-border bg-surface shadow-2xl max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-surface">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-secondary">
                    Explorer
                  </div>
                  <span className="text-[10px] font-mono text-secondary">
                    {tree.length} files
                  </span>
                </div>
                {TreeBody}
              </div>
            </>
          )}
        </div>
        <div className="h-9 border-b border-border bg-surface flex items-stretch">
          <div className="flex items-center gap-2 px-4 border-r border-border bg-background">
            <FileCode2 className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs truncate">
              {activeFile.split("/").pop()}
            </span>
          </div>
          <div className="flex-1 flex items-center px-4 text-[10px] font-mono text-secondary truncate">
            {activeFile}
          </div>
          <div className="hidden sm:flex items-center px-4 text-[10px] font-mono text-secondary border-l border-border">
            UTF-8 · LF · {ext.toUpperCase()}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-background">
          <div className="grid grid-cols-[3.25rem_1fr] font-mono text-xs leading-6">
            <div className="text-right pr-3 py-3 select-none text-secondary/60 border-r border-border bg-surface/40">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="py-3 px-4 text-foreground whitespace-pre overflow-x-auto">{code}</pre>
          </div>
        </div>
        <div className="h-7 border-t border-border bg-surface px-4 flex items-center justify-between text-[10px] font-mono text-secondary">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              No errors
            </span>
            <span>{lines.length} lines</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Branch: main</span>
            <span>Last build: 2 min ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Pane shell ----------------------------- */

function PaneShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 overflow-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6 pb-5 border-b border-border">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-secondary mt-1 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
        <div className="space-y-8 pb-8">{children}</div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {hint && (
          <div className="text-xs text-secondary mt-0.5">{hint}</div>
        )}
      </div>
      {action}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl md:text-3xl font-mono font-semibold tracking-tight text-foreground">
          {value}
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-mono ${
              positive ? "text-success" : "text-destructive"
            }`}
          >
            {positive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Integrations ----------------------------- */

function IntegrationsView() {
  const items = [
    { name: "Stripe", desc: "Subscriptions and one-off payments", connected: true, category: "Payments" },
    { name: "Postgres", desc: "Primary application database", connected: true, category: "Data" },
    { name: "Resend", desc: "Transactional email", connected: false, category: "Email" },
    { name: "OpenAI", desc: "LLM-powered features", connected: true, category: "AI" },
    { name: "Sentry", desc: "Error tracking and alerts", connected: false, category: "Observability" },
    { name: "Slack", desc: "Notifications and webhooks", connected: false, category: "Comms" },
    { name: "Cloudflare R2", desc: "Object storage for uploads", connected: false, category: "Storage" },
    { name: "PostHog", desc: "Product analytics & funnels", connected: true, category: "Analytics" },
  ];
  const connected = items.filter((i) => i.connected).length;
  return (
    <PaneShell
      title="Integrations"
      subtitle="Plug in third-party services. Keys are encrypted and scoped to this project."
      actions={
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Browse all
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Connected" value={`${connected}`} delta={`of ${items.length}`} positive />
        <KpiCard label="API calls (24h)" value="14.2K" delta="+8%" positive />
        <KpiCard label="Failures (24h)" value="3" delta="-2" positive />
      </div>

      <div>
        <SectionHeader
          title="Available services"
          hint="Tap any service to connect or manage credentials."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <div
              key={it.name}
              className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3 hover-elevate"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{it.name}</div>
                  <div className="text-[10px] uppercase font-mono text-secondary tracking-wider mt-0.5">
                    {it.category}
                  </div>
                </div>
                {it.connected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-success/10 text-success shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-surface-raised text-secondary shrink-0">
                    Off
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary leading-relaxed">{it.desc}</p>
              <Button
                size="sm"
                variant={it.connected ? "outline" : "default"}
                className={
                  it.connected
                    ? "border-border h-7 text-xs"
                    : "h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {it.connected ? "Manage" : "Connect"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </PaneShell>
  );
}

/* ------------------------------- Database ------------------------------- */

function DatabaseView({ copyDbUrl }: { copyDbUrl: () => void }) {
  const tables = [
    { name: "users", rows: 412, size: "284 KB", updated: "2 min ago" },
    { name: "tasks", rows: 524, size: "1.6 MB", updated: "12 sec ago" },
    { name: "sessions", rows: 98, size: "44 KB", updated: "1 hr ago" },
    { name: "audit_logs", rows: 8, size: "12 KB", updated: "3 hrs ago" },
  ];
  return (
    <PaneShell
      title="Database"
      subtitle="A serverless Postgres instance, branched per project. Snapshots run every hour."
      actions={
        <>
          <Button size="sm" variant="outline" className="border-border h-8">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> SQL editor
          </Button>
          <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New table
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Tables" value="4" />
        <KpiCard label="Total Rows" value="1,042" delta="+38" positive />
        <KpiCard label="Storage" value="2.4 MB" delta="+0.1 MB" positive />
        <KpiCard label="Region" value="lhr1" />
      </div>

      <div>
        <SectionHeader title="Connection string" hint="Use this URL in your scripts and migrations." />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 font-mono text-xs text-secondary truncate">
            postgres://user:••••••••@ep-cool-db.neon.tech/main
          </div>
          <Button variant="outline" onClick={copyDbUrl} className="border-border h-10">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
        </div>
      </div>

      <div>
        <SectionHeader
          title="Tables"
          hint={`${tables.length} tables · click to inspect schema and rows`}
          action={
            <button className="text-xs text-secondary hover:text-foreground inline-flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filter
            </button>
          }
        />
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-surface-raised text-[10px] uppercase tracking-wider font-mono text-secondary">
            <div>Table</div>
            <div className="text-right">Rows</div>
            <div className="text-right">Size</div>
            <div className="text-right hidden sm:block">Updated</div>
          </div>
          {tables.map((t, i, arr) => (
            <div
              key={t.name}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 bg-surface hover:bg-surface-raised transition-colors cursor-pointer ${
                i < arr.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Database className="w-4 h-4 text-secondary shrink-0" />
                <span className="font-mono text-sm truncate">{t.name}</span>
              </div>
              <span className="text-xs text-foreground font-mono text-right">
                {t.rows.toLocaleString()}
              </span>
              <span className="text-xs text-secondary font-mono text-right">
                {t.size}
              </span>
              <span className="text-xs text-secondary font-mono text-right hidden sm:block">
                {t.updated}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PaneShell>
  );
}

/* ------------------------------- Payments ------------------------------- */

function PaymentsView() {
  const payments = [
    { who: "alex@startup.io", amount: "£29.00", when: "2 min ago", ok: true, plan: "Pro" },
    { who: "sara@design.co", amount: "£29.00", when: "14 min ago", ok: true, plan: "Pro" },
    { who: "mike@founder.dev", amount: "£99.00", when: "1 hr ago", ok: true, plan: "Team" },
    { who: "lily@indie.com", amount: "£29.00", when: "3 hrs ago", ok: false, plan: "Pro" },
    { who: "raj@studio.io", amount: "£9.00", when: "5 hrs ago", ok: true, plan: "Hobby" },
    { who: "noah@labs.dev", amount: "£99.00", when: "1 day ago", ok: true, plan: "Team" },
  ];
  return (
    <PaneShell
      title="Payments"
      subtitle="Live data from Stripe. Subscriptions, one-off charges, and payouts in one place."
      actions={
        <>
          <Button size="sm" variant="outline" className="border-border h-8">
            Export CSV
          </Button>
          <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/90">
            Open in Stripe <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="MRR" value="£1,284" delta="+12%" positive />
        <KpiCard label="Active subs" value="42" delta="+3" positive />
        <KpiCard label="Churn (30d)" value="2.1%" delta="-0.4%" positive />
        <KpiCard label="Failed (24h)" value="1" delta="+1" positive={false} />
      </div>

      <div>
        <SectionHeader title="Recent payments" hint="Last 24 hours" />
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-surface-raised text-[10px] uppercase tracking-wider font-mono text-secondary">
            <div>Customer</div>
            <div className="text-right hidden sm:block">Plan</div>
            <div className="text-right">Status</div>
            <div className="text-right">Amount</div>
          </div>
          {payments.map((p, i, arr) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 bg-surface hover:bg-surface-raised transition-colors ${
                i < arr.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-4 h-4 text-secondary shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono text-xs truncate">{p.who}</div>
                  <div className="text-[10px] text-secondary font-mono">
                    {p.when}
                  </div>
                </div>
              </div>
              <span className="text-xs text-secondary font-mono text-right hidden sm:block">
                {p.plan}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded text-right ${
                  p.ok
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {p.ok ? "Paid" : "Failed"}
              </span>
              <span className="text-sm font-mono font-medium text-right">
                {p.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PaneShell>
  );
}

/* ------------------------------- Analytics ------------------------------- */

function AnalyticsView() {
  const bars = [40, 62, 55, 80, 70, 95, 88, 76, 90, 110, 102, 120];
  const max = Math.max(...bars);
  const labels = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"];
  const pages = [
    { p: "/", v: 1240, change: "+18%" },
    { p: "/explore", v: 612, change: "+4%" },
    { p: "/login", v: 398, change: "-2%" },
    { p: "/dashboard", v: 181, change: "+22%" },
    { p: "/pricing", v: 142, change: "+9%" },
  ];
  return (
    <PaneShell
      title="Analytics"
      subtitle="First-party visitor and event data. No third-party scripts, no cookie banners required."
      actions={
        <>
          <select className="h-8 bg-background border border-border rounded-md text-xs px-2 font-mono outline-none focus:ring-1 focus:ring-primary">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <Button size="sm" variant="outline" className="border-border h-8">
            Export
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Visitors" value="2,431" delta="+18%" positive />
        <KpiCard label="Signups" value="64" delta="+9" positive />
        <KpiCard label="Conversion" value="2.6%" delta="+0.4%" positive />
        <KpiCard label="Avg session" value="3m 42s" delta="-12s" positive={false} />
      </div>

      <div>
        <SectionHeader title="Visitors" hint="Hourly · last 12 hours" />
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-end gap-2 h-48">
            {bars.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full bg-primary/70 hover:bg-primary rounded-md transition-colors cursor-pointer"
                  style={{ height: `${(v / max) * 100}%` }}
                  title={`${v} visitors`}
                />
                <span className="text-[9px] font-mono text-secondary">
                  {labels[i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="Top pages" />
          <div className="rounded-xl border border-border overflow-hidden">
            {pages.map((row, i, arr) => {
              const pct = (row.v / pages[0].v) * 100;
              const positive = row.change.startsWith("+");
              return (
                <div
                  key={row.p}
                  className={`relative px-4 py-3 bg-surface ${
                    i < arr.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/8"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-3">
                    <span className="font-mono text-xs">{row.p}</span>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span
                        className={positive ? "text-success" : "text-destructive"}
                      >
                        {row.change}
                      </span>
                      <span className="text-secondary tabular-nums">
                        {row.v.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SectionHeader title="Live now" hint="Active in the last 5 minutes" />
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-baseline gap-2 mb-4">
              <Activity className="w-5 h-5 text-success" />
              <span className="text-4xl font-mono font-semibold">37</span>
              <span className="text-sm text-secondary">visitors</span>
            </div>
            {[
              { country: "United Kingdom", count: 14 },
              { country: "United States", count: 9 },
              { country: "Germany", count: 6 },
              { country: "Brazil", count: 4 },
              { country: "Other", count: 4 },
            ].map((r) => (
              <div
                key={r.country}
                className="flex items-center justify-between text-xs py-1.5"
              >
                <span className="text-foreground">{r.country}</span>
                <span className="font-mono text-secondary">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PaneShell>
  );
}

/* -------------------------------- Domains -------------------------------- */

type DomainStatus = "active" | "pending" | "error";

function DomainsView() {
  const [domains, setDomains] = useState<
    { host: string; primary: boolean; status: DomainStatus; ssl: boolean; addedAgo: string }[]
  >([
    { host: "todo-app-johndoe.instancly.app", primary: true, status: "active", ssl: true, addedAgo: "27 mins ago" },
    { host: "todoapp.com", primary: false, status: "active", ssl: true, addedAgo: "3 days ago" },
    { host: "www.todoapp.com", primary: false, status: "pending", ssl: false, addedAgo: "12 mins ago" },
  ]);
  const [newDomain, setNewDomain] = useState("");

  const addDomain = () => {
    const host = newDomain.trim().toLowerCase();
    if (!host) return;
    if (domains.some((d) => d.host === host)) {
      toast.error("That domain is already on the list");
      return;
    }
    setDomains((prev) => [
      ...prev,
      { host, primary: false, status: "pending", ssl: false, addedAgo: "just now" },
    ]);
    setNewDomain("");
    toast.success(`Added ${host} · waiting for DNS`);
  };

  const setPrimary = (host: string) => {
    setDomains((prev) =>
      prev.map((d) => ({ ...d, primary: d.host === host }))
    );
    toast.success(`${host} is now the primary domain`);
  };

  const removeDomain = (host: string) => {
    setDomains((prev) => prev.filter((d) => d.host !== host));
    toast.message(`Removed ${host}`);
  };

  return (
    <PaneShell
      title="Domains"
      subtitle="Connect a custom domain. We provision SSL automatically once DNS resolves."
      actions={
        <Button size="sm" variant="outline" className="border-border h-8">
          DNS guide
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Domains" value={`${domains.length}`} />
        <KpiCard
          label="Active"
          value={`${domains.filter((d) => d.status === "active").length}`}
        />
        <KpiCard
          label="Pending DNS"
          value={`${domains.filter((d) => d.status === "pending").length}`}
        />
        <KpiCard label="SSL renewals" value="Auto" />
      </div>

      <div>
        <SectionHeader
          title="Add a custom domain"
          hint="Point a CNAME at the address below, then add the domain here."
        />
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addDomain();
              }}
              placeholder="app.example.com"
              className="bg-background border-border font-mono"
            />
            <Button
              onClick={addDomain}
              disabled={!newDomain.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add domain
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <DnsRow
              type="CNAME"
              name="@ (or your subdomain)"
              value="cname.instancly.app"
            />
            <DnsRow type="TXT" name="_instancly" value="verify=ab12-cd34-ef56" />
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Connected domains" hint="The primary domain receives all traffic." />
        <div className="rounded-xl border border-border overflow-hidden">
          {domains.map((d, i, arr) => {
            const last = i === arr.length - 1;
            return (
              <div
                key={d.host}
                className={`flex flex-wrap items-center gap-3 px-4 py-4 bg-surface ${
                  last ? "" : "border-b border-border"
                }`}
              >
                <Globe className="w-4 h-4 text-secondary shrink-0" />
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm">{d.host}</span>
                    {d.primary && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-secondary font-mono mt-0.5">
                    Added {d.addedAgo}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <DomainStatusBadge status={d.status} />
                  {d.ssl ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-success/10 text-success">
                      <ShieldCheck className="w-3 h-3" /> SSL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-surface-raised text-secondary">
                      <ShieldCheck className="w-3 h-3" /> SSL pending
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!d.primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border h-7 text-xs"
                      onClick={() => setPrimary(d.host)}
                    >
                      Set primary
                    </Button>
                  )}
                  <a
                    href={`https://${d.host}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised"
                    title="Open"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {!d.host.endsWith(".instancly.app") && (
                    <button
                      onClick={() => removeDomain(d.host)}
                      className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-destructive hover:bg-destructive/10"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {domains.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-secondary bg-surface">
              No custom domains yet.
            </div>
          )}
        </div>
      </div>
    </PaneShell>
  );
}

function DomainStatusBadge({ status }: { status: DomainStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-success/10 text-success">
        <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending DNS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-destructive/10 text-destructive">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
}

function DnsRow({ type, name, value }: { type: string; name: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider font-mono text-secondary">
          {type} record
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Value copied");
          }}
          className="text-secondary hover:text-foreground"
          title="Copy value"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <span className="text-secondary">Name</span>
        <span className="font-mono truncate">{name}</span>
        <span className="text-secondary">Value</span>
        <span className="font-mono truncate">{value}</span>
      </div>
    </div>
  );
}

function HistoryPane({
  openBuildId,
  setOpenBuildId,
}: {
  openBuildId: string | null;
  setOpenBuildId: (id: string | null) => void;
}) {
  const totalCost = PAST_BUILDS.reduce((s, b) => s + b.cost, 0);
  const totalFiles = PAST_BUILDS.reduce((s, b) => s + b.filesChanged, 0);
  const totalTime = PAST_BUILDS.reduce((s, b) => s + b.durationSec, 0);
  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m < 1 ? `${sec}s` : s === 0 ? `${m} min` : `${m} min ${s}s`;
  };
  return (
    <PaneShell
      title="Build history"
      subtitle="Every build is a restorable checkpoint. Tap one to inspect the prompt, cost, and changes."
      actions={
        <Button size="sm" variant="outline" className="border-border h-8">
          <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Builds" value={`${PAST_BUILDS.length}`} />
        <KpiCard label="Total spent" value={`£${totalCost.toFixed(2)}`} />
        <KpiCard label="Files changed" value={`${totalFiles}`} />
        <KpiCard label="Total time" value={fmtTime(totalTime)} />
      </div>

      <div>
        <SectionHeader title="Timeline" hint="Newest first" />
        <div className="space-y-2">
          {PAST_BUILDS.map((b) => {
            const open = openBuildId === b.id;
            return (
              <div
                key={b.id}
                className="border border-border bg-surface rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenBuildId(open ? null : b.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-sm shrink-0">
                      #{b.number}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{b.prompt}</div>
                      <div className="text-[11px] text-secondary font-mono mt-0.5">
                        {b.ago} · {fmtTime(b.durationSec)} · £{b.cost.toFixed(2)} · {b.filesChanged} files
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-secondary transition-transform shrink-0 ml-2 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="border-t border-border bg-background p-4 space-y-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-1">
                        AI response
                      </div>
                      <p className="text-sm leading-relaxed">{b.aiMessage}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Stat label="Model" value={b.model} />
                      <Stat label="Cost" value={`£${b.cost.toFixed(2)}`} />
                      <Stat label="Files" value={`${b.filesChanged}`} />
                      <Stat label="Duration" value={fmtTime(b.durationSec)} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-border">
                        Restore this build
                      </Button>
                      <Button size="sm" variant="ghost">
                        View diff
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PaneShell>
  );
}

function SettingsPane() {
  return (
    <PaneShell
      title="Project settings"
      subtitle="Configure routing, visibility, and project metadata."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              defaultValue="Todo App"
              className="bg-background border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              defaultValue="todo-app"
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="domain">Custom domain</Label>
            <Input
              id="domain"
              placeholder="app.example.com"
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="public" className="flex flex-col gap-1">
              <span>Public project</span>
              <span className="font-normal text-xs text-secondary">
                Allow others to view and clone.
              </span>
            </Label>
            <Switch id="public" defaultChecked />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={() => toast.success("Settings saved")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" /> Save changes
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-3">
              Project info
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Owner</span>
                <span className="font-mono">johndoe</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Created</span>
                <span className="font-mono">3 days ago</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Region</span>
                <span className="font-mono">lhr1 · London</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Plan</span>
                <span className="font-mono">Pro · £29/mo</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-3">
              Members
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {["#ccff00", "#7c3aed", "#10b981"].map((c) => (
                  <span
                    key={c}
                    className="w-7 h-7 rounded-full border-2 border-surface"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <Button size="sm" variant="outline" className="border-border h-7 text-xs">
                <Users className="w-3 h-3 mr-1.5" /> Invite
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 flex items-start justify-between gap-4">
        <div>
          <h4 className="text-destructive font-semibold text-sm mb-1">
            Danger zone
          </h4>
          <p className="text-xs text-secondary max-w-md">
            This will permanently delete the project, its database, and all build history. There is no undo.
          </p>
        </div>
        <Button variant="destructive" size="sm" className="shrink-0">
          <Trash2 className="w-4 h-4 mr-2" /> Delete project
        </Button>
      </div>
    </PaneShell>
  );
}

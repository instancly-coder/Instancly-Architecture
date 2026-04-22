import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Flame,
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
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
  | "history"
  | "settings";

const TAB_META: Record<TabKey, { label: string; icon: any }> = {
  preview: { label: "Preview", icon: Play },
  files: { label: "Files", icon: FolderTree },
  database: { label: "Database", icon: Database },
  analytics: { label: "Analytics", icon: BarChart3 },
  payments: { label: "Payments", icon: CreditCard },
  integrations: { label: "Integrations", icon: Plug },
  history: { label: "History", icon: History },
  settings: { label: "Settings", icon: SettingsIcon },
};

const ADDABLE_TABS: TabKey[] = [
  "files",
  "database",
  "analytics",
  "payments",
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
            <Flame className="w-5 h-5 text-primary" />
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

          <ThemeToggle className="hidden sm:inline-flex" />

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
        <aside className="hidden md:flex w-[340px] shrink-0 border-r border-border bg-surface flex-col h-full">
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
            <div className="h-10 border-b border-border bg-surface flex items-center gap-1 px-2 shrink-0">
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
              <div className="flex-1 mx-1 min-w-0">
                <input
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  className="w-full h-7 bg-background border border-border rounded-md px-3 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary truncate"
                />
              </div>
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
            {activeTab === "database" && (
              <div className="absolute inset-0 overflow-auto p-4 md:p-6 bg-background">
                <DatabaseView copyDbUrl={copyDbUrl} />
              </div>
            )}
            {activeTab === "analytics" && (
              <div className="absolute inset-0 overflow-auto p-4 md:p-6 bg-background">
                <AnalyticsView />
              </div>
            )}
            {activeTab === "payments" && (
              <div className="absolute inset-0 overflow-auto p-4 md:p-6 bg-background">
                <PaymentsView />
              </div>
            )}
            {activeTab === "integrations" && (
              <div className="absolute inset-0 overflow-auto p-4 md:p-6 bg-background">
                <IntegrationsView />
              </div>
            )}
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

  return (
    <>
      <div className="p-3 border-b border-border shrink-0">
        <select className="w-full bg-background border border-border rounded-md text-xs px-2 py-1.5 text-foreground font-mono focus:ring-1 focus:ring-primary outline-none">
          {mockModels.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name} ({m.costRange})
            </option>
          ))}
        </select>
      </div>

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
                <div className="max-w-[88%] px-3.5 py-2 rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm leading-snug">
                  {b.prompt}
                </div>
              </div>

              {/* AI response */}
              <div className="space-y-2">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {b.aiMessage}
                </p>

                {/* Footer with clickable price/time */}
                <div className="flex items-center gap-3 pt-1 text-xs text-secondary">
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span className="font-mono">Checkpoint · {b.ago}</span>
                  <span className="opacity-40">·</span>
                  <button
                    onClick={() => setOpenBuildId(open ? null : b.id)}
                    className="font-mono inline-flex items-center gap-1 hover:text-primary underline-offset-2 hover:underline transition-colors"
                  >
                    Worked for {durationLabel}
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
        <div className="relative">
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
            className="w-full min-h-[72px] max-h-[180px] bg-background border border-border rounded-lg p-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <button
            onClick={onSend}
            disabled={!chatInput.trim() || isStreaming}
            className="absolute right-2 bottom-2 w-8 h-8 rounded bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
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

      <div className="h-10 border-t border-border bg-surface flex items-center justify-center px-3 md:px-4 shrink-0 gap-1">
        <ViewportBtn
          active={viewport === "desktop"}
          icon={Monitor}
          onClick={() => setViewport("desktop")}
        />
        <ViewportBtn
          active={viewport === "tablet"}
          icon={Tablet}
          onClick={() => setViewport("tablet")}
        />
        <ViewportBtn
          active={viewport === "mobile"}
          icon={Smartphone}
          onClick={() => setViewport("mobile")}
        />
      </div>
    </div>
  );
}

function ViewportBtn({
  active,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-secondary hover:text-foreground hover:bg-surface-raised"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function FilesPane({
  activeFile,
  setActiveFile,
}: {
  activeFile: string;
  setActiveFile: (f: string) => void;
}) {
  const files = [
    { path: "src/app/page.tsx", folder: "src/app" },
    { path: "src/app/layout.tsx", folder: "src/app" },
    { path: "src/components/ui/button.tsx", folder: "src/components/ui" },
    { path: "src/lib/db.ts", folder: "src/lib" },
    { path: "package.json", folder: "" },
    { path: "tailwind.config.ts", folder: "" },
  ];

  return (
    <div className="absolute inset-0 flex bg-background">
      <div className="w-60 border-r border-border bg-surface overflow-y-auto p-2 shrink-0">
        <div className="text-[10px] uppercase tracking-wider font-mono text-secondary px-2 py-1.5">
          Project
        </div>
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => setActiveFile(f.path)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono text-left transition-colors ${
              activeFile === f.path
                ? "bg-primary text-primary-foreground"
                : "text-secondary hover:text-foreground hover:bg-surface-raised"
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{f.path}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-9 border-b border-border bg-surface px-4 flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-secondary" />
          <span className="font-mono text-xs text-secondary truncate">
            {activeFile}
          </span>
        </div>
        <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-secondary">
{`import { useState } from "react";
import { db } from "@/lib/db";

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      {/* implementation */}
    </div>
  );
}`}
        </pre>
      </div>
    </div>
  );
}

function IntegrationsView() {
  const items = [
    { name: "Stripe", desc: "Subscriptions and one-off payments", connected: true },
    { name: "Postgres", desc: "Primary application database", connected: true },
    { name: "Resend", desc: "Transactional email", connected: false },
    { name: "OpenAI", desc: "LLM-powered features", connected: true },
    { name: "Sentry", desc: "Error tracking and alerts", connected: false },
    { name: "Slack", desc: "Notifications and webhooks", connected: false },
  ];
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="text-xs font-mono uppercase text-secondary tracking-wider">
        Connected services
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <div
            key={it.name}
            className="rounded-lg border border-border bg-surface p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-secondary truncate">{it.desc}</div>
            </div>
            {it.connected ? (
              <span className="text-[10px] font-mono uppercase px-2 py-1 rounded bg-success/10 text-success">
                Connected
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-border h-7 text-xs"
              >
                Connect
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DatabaseView({ copyDbUrl }: { copyDbUrl: () => void }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Tables" value="4" />
        <KpiCard label="Total Rows" value="1,042" />
        <KpiCard label="Storage" value="2.4 MB" />
      </div>
      <div>
        <div className="text-xs font-mono uppercase text-secondary mb-2 tracking-wider">
          Connection
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-surface border border-border rounded-md px-3 py-2 font-mono text-xs text-secondary truncate">
            postgres://user:••••••••@ep-cool-db.neon.tech/main
          </div>
          <Button variant="outline" onClick={copyDbUrl} className="border-border">
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
        </div>
      </div>
      <div>
        <div className="text-xs font-mono uppercase text-secondary mb-2 tracking-wider">
          Tables
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            { name: "users", rows: 412 },
            { name: "tasks", rows: 524 },
            { name: "sessions", rows: 98 },
            { name: "audit_logs", rows: 8 },
          ].map((t, i, arr) => (
            <div
              key={t.name}
              className={`flex items-center justify-between px-4 py-3 bg-surface ${
                i < arr.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-secondary" />
                <span className="font-mono text-sm">{t.name}</span>
              </div>
              <span className="text-xs text-secondary font-mono">
                {t.rows.toLocaleString()} rows
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaymentsView() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="MRR" value="£1,284" />
        <KpiCard label="Active subs" value="42" />
        <KpiCard label="Churn (30d)" value="2.1%" />
      </div>
      <div>
        <div className="text-xs font-mono uppercase text-secondary mb-2 tracking-wider">
          Recent payments
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            { who: "alex@startup.io", amount: "£29.00", when: "2 min ago", ok: true },
            { who: "sara@design.co", amount: "£29.00", when: "14 min ago", ok: true },
            { who: "mike@founder.dev", amount: "£99.00", when: "1 hr ago", ok: true },
            { who: "lily@indie.com", amount: "£29.00", when: "3 hrs ago", ok: false },
          ].map((p, i, arr) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 bg-surface ${
                i < arr.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard className="w-4 h-4 text-secondary shrink-0" />
                <span className="font-mono text-xs truncate">{p.who}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[10px] font-mono uppercase ${
                    p.ok ? "text-success" : "text-destructive"
                  }`}
                >
                  {p.ok ? "Paid" : "Failed"}
                </span>
                <span className="text-xs text-secondary font-mono">{p.when}</span>
                <span className="text-sm font-mono">{p.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView() {
  const bars = [40, 62, 55, 80, 70, 95, 88, 76, 90, 110, 102, 120];
  const max = Math.max(...bars);
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Visitors (24h)" value="2,431" />
        <KpiCard label="Signups" value="64" />
        <KpiCard label="Conversion" value="2.6%" />
      </div>
      <div>
        <div className="text-xs font-mono uppercase text-secondary mb-2 tracking-wider">
          Visitors · last 12 hours
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-end gap-1.5 h-40">
            {bars.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/70 rounded-sm hover:bg-primary transition-colors"
                style={{ height: `${(v / max) * 100}%` }}
                title={`${v}`}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="text-xs font-mono uppercase text-secondary mb-2 tracking-wider">
          Top pages
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          {[
            { p: "/", v: 1240 },
            { p: "/explore", v: 612 },
            { p: "/login", v: 398 },
            { p: "/dashboard", v: 181 },
          ].map((row, i, arr) => (
            <div
              key={row.p}
              className={`flex items-center justify-between px-4 py-3 bg-surface ${
                i < arr.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="font-mono text-xs">{row.p}</span>
              <span className="text-xs text-secondary font-mono">{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-1">
        {label}
      </div>
      <div className="text-2xl font-mono">{value}</div>
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
  return (
    <div className="absolute inset-0 overflow-auto p-4 md:p-6 bg-background">
      <div className="max-w-3xl space-y-3">
        <h2 className="text-lg font-bold">Build history</h2>
        <p className="text-sm text-secondary mb-4">
          Every successful build is restorable. Tap one to inspect prompt and cost.
        </p>
        {PAST_BUILDS.map((b) => {
          const open = openBuildId === b.id;
          const mins = Math.round(b.durationSec / 60);
          return (
            <div
              key={b.id}
              className="border border-border bg-surface rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenBuildId(open ? null : b.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-raised transition-colors"
              >
                <div>
                  <div className="font-medium">Build #{b.number}</div>
                  <div className="text-xs text-secondary font-mono mt-0.5">
                    worked for {mins < 1 ? `${b.durationSec}s` : `${mins} min`} · {b.ago}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-secondary transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open && (
                <div className="border-t border-border bg-background p-4 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-1">
                      Prompt
                    </div>
                    <p className="text-sm">{b.prompt}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="Cost" value={`£${b.cost.toFixed(2)}`} />
                    <Stat label="Files changed" value={`${b.filesChanged}`} />
                    <Stat
                      label="Duration"
                      value={mins < 1 ? `${b.durationSec}s` : `${mins} min`}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="border-border">
                    Restore this build
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsPane() {
  return (
    <div className="absolute inset-0 overflow-auto p-4 md:p-6 bg-background">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-bold">Project settings</h2>
          <p className="text-sm text-secondary">
            Configure routing, visibility, and integrations.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 space-y-4">
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
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <h4 className="text-destructive font-medium text-sm mb-2">
            Danger zone
          </h4>
          <p className="text-xs text-secondary mb-3">
            This will permanently delete the project, its database, and all builds.
          </p>
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" /> Delete project
          </Button>
        </div>
      </div>
    </div>
  );
}

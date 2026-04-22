import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import {
  Flame,
  ChevronRight,
  FolderTree,
  LayoutDashboard,
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
  FolderClosed,
  Play,
  Database,
  CreditCard,
  BarChart3,
  MessageSquare,
  Eye,
  Save,
  Trash2,
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

type Tab = "preview" | "files" | "dashboard" | "history" | "settings";
type DashboardTab = "database" | "payments" | "analytics";

type PastBuild = {
  id: string;
  number: number;
  prompt: string;
  durationSec: number;
  cost: number;
  filesChanged: number;
  ago: string;
};

const PAST_BUILDS: PastBuild[] = [
  {
    id: "b3",
    number: 3,
    prompt: "Add a leaderboard sorted by streak length with weekly reset.",
    durationSec: 142,
    cost: 0.04,
    filesChanged: 6,
    ago: "5 mins ago",
  },
  {
    id: "b2",
    number: 2,
    prompt: "Wire the form to Postgres and add zod validation.",
    durationSec: 98,
    cost: 0.03,
    filesChanged: 4,
    ago: "12 mins ago",
  },
  {
    id: "b1",
    number: 1,
    prompt: "Create a habit tracker with streaks and a weekly chart.",
    durationSec: 217,
    cost: 0.07,
    filesChanged: 11,
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

  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [dashTab, setDashTab] = useState<DashboardTab>("database");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

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
        <section className="flex-1 flex flex-col bg-background overflow-hidden">
          {/* Tab strip */}
          <div className="h-11 border-b border-border bg-surface flex items-center px-2 gap-1 overflow-x-auto shrink-0">
            <TabBtn
              icon={Eye}
              label="Preview"
              active={activeTab === "preview"}
              onClick={() => setActiveTab("preview")}
            />
            <TabBtn
              icon={FolderTree}
              label="Files"
              active={activeTab === "files"}
              onClick={() => setActiveTab("files")}
            />
            <TabBtn
              icon={LayoutDashboard}
              label="Dashboard"
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
            />
            <TabBtn
              icon={History}
              label="History"
              active={activeTab === "history"}
              onClick={() => setActiveTab("history")}
            />
            <TabBtn
              icon={SettingsIcon}
              label="Settings"
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
            />
          </div>

          <div className="flex-1 overflow-hidden relative">
            {activeTab === "preview" && (
              <PreviewPane
                viewport={viewport}
                setViewport={setViewport}
                slug={slug}
                username={username}
                copyUrl={copyUrl}
              />
            )}
            {activeTab === "files" && (
              <FilesPane activeFile={activeFile} setActiveFile={setActiveFile} />
            )}
            {activeTab === "dashboard" && (
              <DashboardPane
                dashTab={dashTab}
                setDashTab={setDashTab}
                copyDbUrl={copyDbUrl}
              />
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

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Live status */}
        <div className="rounded-lg border border-border bg-background p-4">
          {isStreaming || currentPhase ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  {isStreaming && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-[11px] uppercase tracking-wider font-mono text-primary">
                  {currentPhase ?? "Idle"}
                </span>
              </div>
              <div className="font-mono text-sm text-foreground leading-snug min-h-[1.4em]">
                {typed}
                <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 align-text-bottom animate-pulse" />
              </div>
            </>
          ) : (
            <div className="text-xs text-secondary">
              Tell the AI what to build. Watch the work happen live.
            </div>
          )}
        </div>

        {/* Past builds accordion */}
        <div>
          <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-2 px-1">
            Past builds
          </div>
          <div className="space-y-1.5">
            {PAST_BUILDS.map((b) => {
              const open = openBuildId === b.id;
              const mins = Math.round(b.durationSec / 60);
              return (
                <div
                  key={b.id}
                  className="border border-border bg-background rounded-md overflow-hidden"
                >
                  <button
                    onClick={() => setOpenBuildId(open ? null : b.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-raised transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Play className="w-3 h-3 text-secondary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          Build #{b.number}
                        </div>
                        <div className="text-[11px] text-secondary font-mono">
                          worked for {mins < 1 ? `${b.durationSec}s` : `${mins} min`} · {b.ago}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-secondary shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="border-t border-border bg-surface px-3 py-3 space-y-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-mono text-secondary mb-1">
                          Prompt
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">
                          {b.prompt}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Stat label="Cost" value={`£${b.cost.toFixed(2)}`} />
                        <Stat label="Files" value={`${b.filesChanged}`} />
                        <Stat
                          label="Time"
                          value={
                            mins < 1 ? `${b.durationSec}s` : `${mins}m`
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7 border-border"
                      >
                        Restore this build
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
  slug,
  username,
  copyUrl,
}: {
  viewport: "desktop" | "tablet" | "mobile";
  setViewport: (v: "desktop" | "tablet" | "mobile") => void;
  slug?: string;
  username?: string;
  copyUrl: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-black">
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

      <div className="h-10 border-t border-border bg-surface flex items-center justify-between px-3 md:px-4 shrink-0 gap-2">
        <div className="flex items-center gap-1">
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
        <button
          className="flex items-center gap-2 text-xs font-mono text-secondary hover:text-foreground cursor-pointer transition-colors px-2 py-1 rounded hover:bg-surface-raised truncate min-w-0"
          onClick={copyUrl}
        >
          <span className="truncate">
            {slug}-{username}.instancly.app
          </span>
          <Copy className="w-3 h-3 shrink-0" />
        </button>
        <a
          href="#"
          className="w-8 h-8 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
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
          ? "text-primary bg-primary/15"
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
                ? "bg-primary/15 text-primary"
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

function DashboardPane({
  dashTab,
  setDashTab,
  copyDbUrl,
}: {
  dashTab: DashboardTab;
  setDashTab: (t: DashboardTab) => void;
  copyDbUrl: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col bg-background overflow-hidden">
      <div className="h-10 border-b border-border bg-surface flex items-center px-2 gap-1 shrink-0 overflow-x-auto">
        <SubTab
          icon={Database}
          label="Database"
          active={dashTab === "database"}
          onClick={() => setDashTab("database")}
        />
        <SubTab
          icon={CreditCard}
          label="Payments"
          active={dashTab === "payments"}
          onClick={() => setDashTab("payments")}
        />
        <SubTab
          icon={BarChart3}
          label="Analytics"
          active={dashTab === "analytics"}
          onClick={() => setDashTab("analytics")}
        />
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {dashTab === "database" && <DatabaseView copyDbUrl={copyDbUrl} />}
        {dashTab === "payments" && <PaymentsView />}
        {dashTab === "analytics" && <AnalyticsView />}
      </div>
    </div>
  );
}

function SubTab({
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
      className={`h-7 px-3 rounded text-xs flex items-center gap-2 whitespace-nowrap transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-secondary hover:text-foreground hover:bg-surface-raised"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
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

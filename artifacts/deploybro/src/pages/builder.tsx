import { useEffect, useRef, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
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
  RefreshCw,
  Search,
  Check,
  ArrowUp,
  Square,
  Paperclip,
  Image as ImageIcon,
  Link2,
  ListTodo,
  Cpu,
  Globe,
  ShieldCheck,
  AlertCircle,
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  Filter,
  FileCheck,
  FilePen,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Rocket,
  Sparkles,
  Upload,
  ArrowDownAZ,
  ArrowDown10,
  UploadCloud,
  Camera,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
// Three Claude-backed tiers under DeployBro branding. `key` maps to the
// backend model registry. Plan mode server-side auto-upgrades paid users
// to Power Bro regardless of which tier is selected here.
const AVAILABLE_MODELS: {
  name: string;
  provider: string;
  costRange: string;
  key: "haiku" | "sonnet" | "opus";
  note: string;
}[] = [
  { name: "Economy Bro", provider: "Anthropic · Haiku 4.5",  costRange: "$0.005 - $0.025", key: "haiku",  note: "Fast & cheap" },
  { name: "Smart Bro",   provider: "Anthropic · Sonnet 4.5", costRange: "$0.012 - $0.06",  key: "sonnet", note: "Balanced (recommended)" },
  { name: "Power Bro",   provider: "Anthropic · Opus",       costRange: "$0.02 - $0.10",   key: "opus",   note: "Most capable" },
];
import {
  useMe,
  useProject,
  useProjectBuilds,
  useProjectFile,
  useProjectFiles,
  useUploadProjectFile,
  useDeleteProjectFile,
  useAppConfigValues,
  usePublishProject,
  useDeployments,
  useDeploymentStatus,
  usePublishStatus,
  useProjectDomains,
  useAddDomain,
  useRemoveDomain,
  useVerifyDomain,
  useSetPrimaryDomain,
  deploymentStepLabel,
  TERMINAL_DEPLOYMENT_STATUSES,
  ApiError,
  useProjectDbInfo,
  useProjectDbTables,
  useProvisionProjectDb,
  useProjectEnvVars,
  useUpsertProjectEnvVar,
  useDeleteProjectEnvVar,
  useRevealProjectEnvVar,
  useUpdateProject,
  useRetriggerScreenshot,
  useDeleteProject,
  useMyProjects,
  type ApiBuild,
  type ApiDeployment,
  type ApiProject,
  type ApiProjectListItem,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type TabKey =
  | "preview"
  | "files"
  | "database"
  | "env"
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
  env: { label: "Env Vars", icon: KeyRound },
  analytics: { label: "Analytics", icon: BarChart3 },
  payments: { label: "Payments", icon: CreditCard },
  integrations: { label: "Integrations", icon: Plug },
  domains: { label: "Domains", icon: Globe },
  history: { label: "History", icon: History },
  settings: { label: "Settings", icon: SettingsIcon },
};

// Hide model-emitted file payloads from the live chat stream. Complete
// blocks become an "updated" marker; an unfinished block at the tail
// (still streaming) becomes a "pending" marker and everything after the
// open tag is dropped from view. Marker tokens are rendered as inline
// Lucide icons by <FileNotice/>.
//
// Also drops the trailing `<suggestions>…</suggestions>` block from the
// in-flight buffer so the user never briefly sees raw XML before the
// model finishes the closing tag — those items are surfaced as clickable
// chips above the prompt box once the SSE `done` event arrives.
function stripIncompleteFileBlocks(text: string): string {
  // Hide the internal `<deploybro:provision-db />` directive entirely —
  // it's a control tag the AI emits to ask the server to provision a
  // Neon DB after the response, never something the user should see in
  // the chat bubble. Mirrors api-server/lib/file-blocks.ts
  // PROVISION_DB_RE so server and client stay in lockstep.
  text = text.replace(
    /<deploybro:provision-db\s*\/?>(?:\s*<\/deploybro:provision-db>)?/gi,
    "",
  );
  // Also catch a half-streamed open tag (`<deploybro:provision-db` with
  // no closing `>` yet) so the user never sees raw XML mid-stream while
  // the model is still typing it out.
  {
    const partial = /<deploybro:provision-db[^>]*$/i;
    text = text.replace(partial, "");
  }
  // Same treatment for `<deploybro:open-tab name="…" />` and
  // `<deploybro:request-secret name="…" … />` — both are control
  // directives surfaced via the SSE `done` event payload, never
  // intended to appear as raw XML in the chat. Mirrors the parsers in
  // api-server/lib/file-blocks.ts.
  text = text.replace(
    /<deploybro:open-tab\s+name=["'][a-z0-9_-]{1,32}["']\s*\/?>(?:\s*<\/deploybro:open-tab>)?/gi,
    "",
  );
  {
    const partial = /<deploybro:open-tab[^>]*$/i;
    text = text.replace(partial, "");
  }
  text = text.replace(
    /<deploybro:request-secret\b[^>]*\/?>(?:\s*<\/deploybro:request-secret>)?/gi,
    "",
  );
  {
    const partial = /<deploybro:request-secret[^>]*$/i;
    text = text.replace(partial, "");
  }
  // Hide the trailing `<suggestions>…</suggestions>` block — even while
  // still in flight. We deliberately only strip if the open tag is the
  // LAST occurrence in the buffer AND nothing-but-whitespace follows the
  // close tag (or there's no close tag yet, which means it IS the trailing
  // tail still being streamed). This mirrors the server's lastSuggestionsMatch
  // logic so a prose mention of `<suggestions>` earlier in the response
  // can never accidentally truncate live text.
  {
    const lower = text.toLowerCase();
    const openIdx = lower.lastIndexOf("<suggestions>");
    if (openIdx >= 0) {
      const closeRel = lower.indexOf("</suggestions>", openIdx + 13);
      if (closeRel < 0) {
        // No close tag yet. Only treat this as the streaming chip block
        // if nothing meaningful has come after the open tag yet — otherwise
        // it's just a prose mention of "<suggestions>" and we leave it
        // alone so subsequent text and file markers keep rendering.
        const tail = text.slice(openIdx + 13);
        if (tail.trim().length === 0 || /^\s*<item\b/i.test(tail)) {
          text = text.slice(0, openIdx).replace(/\s+$/, "");
        }
      } else {
        const after = text.slice(closeRel + 14);
        if (after.trim().length === 0) {
          // Close tag present and nothing meaningful follows — treat as
          // the trailing chip block and hide.
          text = text.slice(0, openIdx).replace(/\s+$/, "");
        }
      }
    }
  }
  let out = "";
  let cursor = 0;
  const OPEN = /<file\s+path="([^"]*)"\s*>/g;
  OPEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPEN.exec(text))) {
    out += text.slice(cursor, m.index);
    const closeIdx = text.indexOf("</file>", OPEN.lastIndex);
    const path = m[1] || "file";
    if (closeIdx === -1) {
      out += `\n\n[[FILE_PENDING:${path}]]`;
      cursor = text.length;
      break;
    }
    out += `\n\n[[FILE_DONE:${path}]]`;
    cursor = closeIdx + "</file>".length;
    OPEN.lastIndex = cursor;
  }
  out += text.slice(cursor);
  return out.replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "");
}

// Renders a chat message string, swapping our [[FILE_DONE:path]] /
// [[FILE_PENDING:path]] markers for full conversational lines like
// "Creating app.jsx..." / "Created app.jsx" — prose renders inline; all
// file events are aggregated into a single collapsible drawer so the chat
// stays readable. In collapsed mode the drawer shows the currently-active
// file path and a running count. Expand to see every file.
// Also accepts the legacy server format `_(updated **path**)_` /
// `_(writing path…)_` so historical builds render with the new look too.
function FileNoticeText({ text }: { text: string }) {
  const [filesOpen, setFilesOpen] = useState(false);

  // Normalize legacy markers + CRLF up front.
  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/_\(updated \*\*([^*]+)\*\*\)_/g, "[[FILE_DONE:$1]]")
    .replace(/_\(writing ([^)]+?)…\)_/g, "[[FILE_PENDING:$1]]");

  type Block =
    | { kind: "para"; text: string }
    | { kind: "file_done"; path: string }
    | { kind: "file_pending"; path: string };

  const tokens = normalized.split(/(\[\[FILE_(?:DONE|PENDING):[^\]]+\]\])/g);
  const blocks: Block[] = [];
  for (const tok of tokens) {
    const done = tok.match(/^\[\[FILE_DONE:(.+)\]\]$/);
    if (done) { blocks.push({ kind: "file_done", path: done[1] }); continue; }
    const pending = tok.match(/^\[\[FILE_PENDING:(.+)\]\]$/);
    if (pending) { blocks.push({ kind: "file_pending", path: pending[1] }); continue; }
    if (!tok) continue;
    const paras = tok
      .split(/\n[ \t]*\n+/)
      .map((p) => p.replace(/^\n+|\n+$/g, ""))
      .filter((p) => p.trim().length > 0);
    for (const p of paras) blocks.push({ kind: "para", text: p });
  }

  if (blocks.length === 0) return null;

  const proseBlocks = blocks.filter((b) => b.kind === "para");
  const fileBlocks = blocks.filter((b) => b.kind !== "para") as Array<
    { kind: "file_done"; path: string } | { kind: "file_pending"; path: string }
  >;

  // The currently-in-flight file (last pending), if any.
  const pendingFile = [...fileBlocks].reverse().find((b) => b.kind === "file_pending");
  const doneCount = fileBlocks.filter((b) => b.kind === "file_done").length;
  const totalCount = fileBlocks.length;

  // Collapsed summary label
  const summaryLabel = pendingFile
    ? pendingFile.path
    : doneCount === 1
    ? fileBlocks[0]?.path ?? "1 file"
    : `${doneCount} file${doneCount !== 1 ? "s" : ""} created`;

  return (
    <div className="space-y-2">
      {/* Prose paragraphs render as normal */}
      {proseBlocks.map((b, i) => (
        <p key={i} className="whitespace-pre-wrap leading-relaxed">
          {b.text}
        </p>
      ))}

      {/* Collapsible file drawer */}
      {fileBlocks.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden text-[12px]">
          {/* Summary row — always visible, acts as toggle */}
          <button
            type="button"
            onClick={() => setFilesOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
          >
            {pendingFile ? (
              <FilePen className="w-3.5 h-3.5 shrink-0 text-primary animate-pulse" />
            ) : (
              <FileCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            )}
            <span className="flex-1 min-w-0">
              {pendingFile ? (
                <>
                  <span className="text-muted-foreground">Creating </span>
                  <span className="font-mono text-foreground/90 truncate">{summaryLabel}</span>
                  <span className="text-muted-foreground">…</span>
                </>
              ) : (
                <span className="text-foreground/80">{summaryLabel}</span>
              )}
            </span>
            {/* File count badge */}
            {totalCount > 1 && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                {doneCount}/{totalCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${filesOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Expanded file list */}
          {filesOpen && (
            <div className="border-t border-border/40 px-3 py-2 space-y-1.5">
              {fileBlocks.map((b, i) =>
                b.kind === "file_done" ? (
                  <div key={i} className="flex items-center gap-2 text-secondary/90">
                    <FileCheck className="w-3 h-3 shrink-0 text-emerald-500" />
                    <span className="font-mono text-foreground/80">{b.path}</span>
                  </div>
                ) : (
                  <div key={i} className="flex items-center gap-2 text-secondary/90">
                    <FilePen className="w-3 h-3 shrink-0 text-primary animate-pulse" />
                    <span className="font-mono text-foreground/80">{b.path}</span>
                    <span className="text-muted-foreground">…</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ADDABLE_TABS: TabKey[] = [
  "files",
  "database",
  "env",
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

// One row in the per-prompt action checklist shown under the
// in-flight assistant bubble. The active step has a spinner; finished
// steps get a check mark; a failed step gets an X. We keep the list
// short (steps are pruned on completion) so the UI never grows tall.
type StreamStep = {
  id: number;
  label: string;
  status: "in_progress" | "done" | "error";
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} mins ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function toPastBuild(b: ApiBuild): PastBuild {
  return {
    id: b.id,
    number: b.number,
    prompt: b.prompt,
    aiMessage: b.aiMessage,
    durationSec: b.durationSec,
    cost: b.cost,
    filesChanged: b.filesChanged,
    tokensIn: b.tokensIn,
    tokensOut: b.tokensOut,
    model: b.model,
    ago: timeAgo(b.createdAt),
  };
}

// Parse a Server-Sent Events stream into {event, data} objects.
async function* readSSE(res: Response): AsyncGenerator<{ event: string; data: any }> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = "message";
      let data = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      try {
        yield { event, data: data ? JSON.parse(data) : null };
      } catch {
        yield { event, data };
      }
    }
  }
}

// Tab strip used in two places: inside the navbar on desktop (with labels)
// and as a standalone row on mobile (icons only). Defined at module scope so
// each instance owns its own popover/search state without resetting on every
// parent re-render.
function BuilderTabStrip({
  openTabs,
  activeTab,
  setActiveTab,
  closeTab,
  openTab,
  compact = false,
  className = "",
}: {
  openTabs: TabKey[];
  activeTab: TabKey;
  setActiveTab: (k: TabKey) => void;
  closeTab: (k: TabKey) => void;
  openTab: (k: TabKey) => void;
  compact?: boolean;
  className?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [tabSearch, setTabSearch] = useState("");

  const availableToAdd = ADDABLE_TABS.filter((k) => !openTabs.includes(k)).filter(
    (k) => TAB_META[k].label.toLowerCase().includes(tabSearch.toLowerCase())
  );

  const handlePick = (k: TabKey) => {
    openTab(k);
    setAddOpen(false);
    setTabSearch("");
  };

  return (
    <div className={className}>
      {openTabs.map((key) => {
        const meta = TAB_META[key];
        const Icon = meta.icon;
        const active = activeTab === key;
        const closeable = key !== "preview";
        return (
          <div
            key={key}
            className={`group h-8 ${compact ? "pl-2 pr-1" : "pl-3 pr-1"} rounded-md text-sm flex items-center gap-2 whitespace-nowrap transition-colors border ${
              active
                ? "bg-primary/15 text-primary border-primary"
                : "text-secondary hover:text-foreground hover:bg-surface-raised border-transparent"
            }`}
          >
            <button
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 h-full pr-1"
              aria-label={meta.label}
              title={compact ? meta.label : undefined}
            >
              <Icon className="w-4 h-4" />
              {!compact && <span>{meta.label}</span>}
            </button>
            {closeable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(key);
                }}
                className={`w-5 h-5 rounded flex items-center justify-center ml-0.5 transition-colors ${
                  active
                    ? "text-primary/70 hover:text-primary hover:bg-primary/10"
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
                    onClick={() => handlePick(k)}
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
  );
}

export default function Builder() {
  const params = useParams();
  const { username, slug } = params;

  const { data: me } = useMe();
  const { data: project } = useProject(username, slug);
  const { data: myProjects = [] } = useMyProjects();
  const { data: apiBuilds = [] } = useProjectBuilds(username, slug);
  const queryClient = useQueryClient();
  const pastBuilds = apiBuilds.map(toPastBuild);

  const [openTabs, setOpenTabs] = useState<TabKey[]>(["preview"]);
  const [activeTab, setActiveTab] = useState<TabKey>("preview");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const liveUrl = `https://${slug}.deploybro.app`;
  const [urlValue, setUrlValue] = useState(liveUrl);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setUrlValue(liveUrl);
  }, [liveUrl]);

  // ---------- Publish (Vercel + Neon) ----------
  // `activeDeploymentId` drives the polling hook. When the row hits a
  // terminal status (live/failed) we leave the id set so the navbar can
  // still show the result until the user starts a fresh publish.
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const publishMutation = usePublishProject(username, slug);
  const { data: activeDeployment } = useDeploymentStatus(
    username,
    slug,
    activeDeploymentId,
  );
  const { data: publishStatus } = usePublishStatus(username, slug);
  const { data: deployments = [] } = useDeployments(username, slug);

  // On mount, adopt any in-flight deployment so a refresh mid-publish still
  // shows the spinning pill instead of resetting the UI.
  useEffect(() => {
    if (activeDeploymentId) return;
    const inflight = deployments.find(
      (d) => !TERMINAL_DEPLOYMENT_STATUSES.has(d.status),
    );
    if (inflight) setActiveDeploymentId(inflight.id);
  }, [deployments, activeDeploymentId]);

  // Toast on terminal transitions. We key on status alone so the effect
  // doesn't re-fire while a deployment is mid-poll.
  const lastToastedStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeDeployment) return;
    const key = `${activeDeployment.id}:${activeDeployment.status}`;
    if (lastToastedStatusRef.current === key) return;
    if (activeDeployment.status === "live") {
      lastToastedStatusRef.current = key;
      toast.success("Published!", {
        description: activeDeployment.liveUrl ?? undefined,
        action: activeDeployment.liveUrl
          ? {
              label: "Open",
              onClick: () =>
                window.open(activeDeployment.liveUrl!, "_blank", "noopener,noreferrer"),
            }
          : undefined,
      });
    } else if (activeDeployment.status === "failed") {
      lastToastedStatusRef.current = key;
      toast.error("Publish failed", {
        description: activeDeployment.errorMessage ?? "Please try again.",
      });
    }
  }, [activeDeployment]);

  const isFreePlan = (me?.plan ?? "Free").toLowerCase() === "free";
  const isPublishing =
    !!activeDeployment &&
    !TERMINAL_DEPLOYMENT_STATUSES.has(activeDeployment.status);

  // Mirror the Files panel size gauge against the same server-advertised
  // hard cap so the navbar Publish button can preflight-block instead of
  // letting the user fire a publish that the pipeline will immediately
  // reject. We pull from `useAppConfigValues` (same source as the gauge)
  // so the two stay in sync, and `useProjectFiles` for the live total.
  const { data: projectFiles = [] } = useProjectFiles(username, slug);
  const { publishSizeLimitBytes: publishLimitBytes } = useAppConfigValues();
  const totalProjectBytes = projectFiles.reduce(
    (sum, f) => sum + (f.size ?? 0),
    0,
  );
  const isOverPublishLimit = totalProjectBytes > publishLimitBytes;
  const oversizeTooltip = (() => {
    const usedMb = (totalProjectBytes / (1024 * 1024)).toFixed(1);
    const limitMb = Math.round(publishLimitBytes / (1024 * 1024));
    return `Project is ${usedMb} MB; limit is ${limitMb} MB. Delete files to publish.`;
  })();
  // Prefer the freshest poll result; fall back to the project-level summary
  // so a fresh page-load with no in-flight deployment still renders the URL.
  // If the user has a verified custom domain, that takes priority over the
  // auto-generated `*.vercel.app` URL — that's the whole point of adding
  // one. We require either an active in-flight deployment to be live or
  // the project-level summary to be live before swapping in the chip.
  const baseLiveUrl =
    activeDeployment?.status === "live"
      ? activeDeployment.liveUrl
      : publishStatus?.publishStatus === "live"
      ? publishStatus.liveUrl
      : null;
  const customDomain = publishStatus?.primaryCustomDomain ?? null;
  const liveDeploymentUrl = baseLiveUrl
    ? customDomain
      ? `https://${customDomain}`
      : baseLiveUrl
    : null;

  const handlePublish = async () => {
    if (isFreePlan) {
      toast.error("Publishing is a Pro plan feature", {
        description: "Upgrade to deploy your app to the web.",
        action: {
          label: "Upgrade",
          onClick: () => {
            window.location.href = "/dashboard/billing";
          },
        },
      });
      return;
    }
    // Belt-and-suspenders: even if the disabled state slips (e.g. retry
    // path in the History tab calls this directly), refuse to start a
    // publish that the pipeline will immediately reject.
    if (isOverPublishLimit) {
      toast.error("Project is over the publish size limit", {
        description: oversizeTooltip,
      });
      return;
    }
    try {
      const result = await publishMutation.mutateAsync();
      setActiveDeploymentId(result.deploymentId);
      lastToastedStatusRef.current = null;
      if (result.alreadyRunning) {
        toast.info("A publish is already in progress");
      } else {
        toast.success("Publish started", {
          description: "We'll provision your database and deploy your app.",
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        toast.error("Publishing is a Pro plan feature", {
          description: "Upgrade to deploy your app to the web.",
          action: {
            label: "Upgrade",
            onClick: () => {
              window.location.href = "/dashboard/billing";
            },
          },
        });
      } else {
        toast.error("Could not start publish", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  };

  const openTab = (key: TabKey) => {
    setOpenTabs((tabs) => (tabs.includes(key) ? tabs : [...tabs, key]));
    setActiveTab(key);
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

  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  // Ref on the dev preview iframe so we can authenticate `postMessage`
  // events that claim to be runtime errors from the user's app — only
  // messages whose `event.source` matches this iframe's contentWindow
  // are honoured. Without this binding, any third-party script could
  // spoof a "Fix with AI" trigger and force a chat submission.
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  // The user's prompt for the in-flight build, shown as a chat bubble at
  // the top of the streaming section so the user can see what they
  // typed even before the AI responds. Cleared once the build is
  // recorded in `pastBuilds` (so the bubble doesn't double-render).
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | undefined>(undefined);
  const [typed, setTyped] = useState("");
  // Quick follow-up task chips. The AI emits a hidden `<suggestions>` block
  // at the end of every successful reply; we render those as clickable chips
  // above the prompt box so the user can keep momentum without typing. The
  // list is replaced on every successful build and cleared the moment the
  // next send fires (so stale suggestions don't linger).
  const [quickTasks, setQuickTasks] = useState<string[]>([]);
  // When the AI emits one or more `<deploybro:request-secret … />`
  // directives, the SSE done event carries them in `secretRequests`.
  // We stash them keyed by the freshly-created build's id so the chat
  // can render a masked input bubble right under that AI turn. Bubbles
  // remove themselves from the array on submit or skip — when an
  // entry's array is empty we drop the key entirely so the chat is
  // clean once the user has resolved every requested value.
  const [pendingSecretRequests, setPendingSecretRequests] = useState<
    Record<string, Array<{ name: string; label: string; description: string | null }>>
  >({});
  // Per-prompt action rows that show under the in-flight assistant bubble:
  // each `status` SSE event closes out the previous step and starts a new
  // one, so the user sees a granular checklist of what's happening
  // ("Fetching reference URLs" → "Connecting to Claude" → "Generating
  // code" → "Saving generated files" → "Done") rather than a single
  // shimmering spinner that hides the actual phase.
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  // Lifted from ChatPanel so handleSend (declared here) can read which model
  // the user picked and pass its key to the backend. Both desktop and mobile
  // ChatPanel instances share this single state, which is the right UX too.
  // Default to Economy Bro by name (not by list index) so reordering the
  // picker never silently changes the default model.
  const [selectedModel, setSelectedModel] = useState<string>("Economy Bro");
  // Plan mode: when ON, the AI prepends a numbered plan before any code, so
  // big changes don't scroll past unexplained.
  const [planMode, setPlanMode] = useState<boolean>(false);
  // Attachments + reference URLs are lifted here (rather than living inside
  // ChatPanel) so handleSend can include them in the build request body.
  const [attachments, setAttachments] = useState<File[]>([]);
  const [refUrls, setRefUrls] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const autoSentRef = useRef(false);
  // Tracks the pending "clear streaming UI" timeout from the last send
  // so a brand-new send can cancel it. Without this, a stale timeout
  // from the previous run can fire 600ms into the new run and wipe
  // `phase` / `typed` / `streamSteps` mid-stream.
  const cleanupTimerRef = useRef<number | null>(null);

  // Cancel any in-flight build stream when this component unmounts so the
  // server can close the upstream Claude connection and stop billing.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // If the user landed here from "New project" with a `?prompt=` query
  // param, pre-fill and auto-send it once the project is loaded. We only
  // run this a single time per mount so user edits aren't clobbered.
  // Also rehydrates any composer settings the homepage saved (model,
  // plan mode, reference URLs, attached images).
  useEffect(() => {
    if (autoSentRef.current) return;
    if (!username || !slug) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("prompt");
    if (!initial) return;
    autoSentRef.current = true;
    // Strip the param from the URL so refresh doesn't re-trigger.
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    // Parse any composer settings stashed by the landing page (model,
    // plan mode, reference URLs, attached images). We pass these directly
    // into handleSend so it never depends on React state setters flushing
    // before the send fires — that was a real timing race.
    let overrides:
      | {
          modelKey?: "haiku" | "sonnet" | "opus";
          planMode?: boolean;
          urls?: string[];
          files?: File[];
        }
      | undefined;
    try {
      const raw = sessionStorage.getItem("deploybro:initial-settings");
      if (raw) {
        sessionStorage.removeItem("deploybro:initial-settings");
        const s = JSON.parse(raw) as {
          model?: string;
          planMode?: boolean;
          urls?: string[];
          images?: { name: string; type: string; dataUrl: string }[];
        };
        overrides = {};
        const modelEntry = AVAILABLE_MODELS.find((m) => m.key === s.model);
        if (modelEntry) {
          setSelectedModel(modelEntry.name);
          overrides.modelKey = modelEntry.key;
        }
        if (s.planMode) {
          setPlanMode(true);
          overrides.planMode = true;
        }
        if (Array.isArray(s.urls)) {
          const urls = s.urls.slice(0, 5);
          setRefUrls(urls);
          overrides.urls = urls;
        }
        if (Array.isArray(s.images)) {
          const reconstructed: File[] = [];
          for (const img of s.images.slice(0, 5)) {
            try {
              const comma = img.dataUrl.indexOf(",");
              if (comma < 0) continue;
              const bin = atob(img.dataUrl.slice(comma + 1));
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              reconstructed.push(new File([bytes], img.name, { type: img.type }));
            } catch { /* skip bad image */ }
          }
          if (reconstructed.length) {
            setAttachments(reconstructed);
            overrides.files = reconstructed;
          }
        }
      }
      // Surface any "your images were too big" warning the landing page
      // left behind before navigating away. One-shot — clear after read.
      const warn = sessionStorage.getItem("deploybro:attach-warning");
      if (warn) {
        sessionStorage.removeItem("deploybro:attach-warning");
        toast.warning(warn);
      }
    } catch { /* ignore */ }

    // Fire on next tick so React commits the setStates above before the
    // chips render — the request payload comes from `overrides`, not state,
    // so the actual send is unaffected by render timing.
    const id = window.setTimeout(() => {
      handleSendRef.current?.(initial, overrides);
    }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, slug]);

  // We need a stable ref to handleSend so the auto-prompt effect can call
  // the latest version without listing every dependency it transitively
  // touches.
  const handleSendRef = useRef<
    | ((
        overridePrompt?: string,
        overrides?: {
          modelKey?: "haiku" | "sonnet" | "opus";
          planMode?: boolean;
          urls?: string[];
          files?: File[];
        },
      ) => void)
    | null
  >(null);
  const [activeFile, setActiveFile] = useState<string>("src/app/page.tsx");
  const [openBuildId, setOpenBuildId] = useState<string | null>(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Resizable chat panel (desktop)
  const [chatWidth, setChatWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 400;
    const saved = Number(localStorage.getItem("deploybro:chatWidth"));
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
        localStorage.setItem("deploybro:chatWidth", String(chatWidth));
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

  // Optional `overrides` lets callers (specifically the rehydration effect)
  // pass freshly-parsed composer settings without waiting for React state
  // setters to flush — eliminates the timing race on first auto-send.
  const handleSend = async (
    overridePrompt?: string,
    overrides?: {
      modelKey?: "haiku" | "sonnet" | "opus";
      planMode?: boolean;
      urls?: string[];
      files?: File[];
    },
  ) => {
    // Defensive: callers like `<button onClick={handleSend}>` pass a
    // React event in the first slot, so guard against non-string args.
    const raw =
      typeof overridePrompt === "string" ? overridePrompt : chatInput;
    if (!raw.trim() || isStreaming || !username || !slug) return;
    const prompt = raw.trim();
    // Cancel any pending cleanup timer from the previous run so it
    // can't fire 600ms into this new send and wipe the freshly-set
    // phase / typed / streamSteps state.
    if (cleanupTimerRef.current != null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    setChatInput("");
    setIsStreaming(true);
    // Show the user's prompt as a bubble in the chat immediately so
    // they can see what they sent — without it, the textbox empties
    // but their words don't appear until the build is recorded
    // ~10–60s later. Cleared after the build is persisted (or kept
    // visible if the build errors so the user can retry).
    setPendingPrompt(prompt);
    setPhase("Thinking");
    setTyped("");
    // Clear any chips from the previous turn the moment a new send fires —
    // they belonged to a different reply and would be misleading next to
    // an in-flight build.
    setQuickTasks([]);
    // Seed the action checklist with a single "Preparing your request"
    // step. Server `status` events will close it out and push their own
    // labels as the build pipeline moves through each phase.
    let stepSeq = 0;
    const nextStepId = () => ++stepSeq;
    setStreamSteps([
      { id: nextStepId(), label: "Preparing your request", status: "in_progress" },
    ]);
    const closeAndAdd = (label: string) =>
      setStreamSteps((prev) => [
        ...prev.map((s) =>
          s.status === "in_progress" ? { ...s, status: "done" as const } : s,
        ),
        { id: nextStepId(), label, status: "in_progress" },
      ]);
    const finishAll = (status: "done" | "error") =>
      setStreamSteps((prev) =>
        prev.map((s) => (s.status === "in_progress" ? { ...s, status } : s)),
      );

    const controller = new AbortController();
    abortRef.current = controller;

    // Map the picker's display name to the backend model key. If the
    // current selection isn't in the catalog (e.g. stale state from an
    // older build), fall through and let the server use its default.
    const modelKey =
      overrides?.modelKey ??
      AVAILABLE_MODELS.find((m) => m.name === selectedModel)?.key;
    const effectivePlanMode = overrides?.planMode ?? planMode;

    // Snapshot + clear the per-prompt attachments and URLs now that we're
    // about to send them — the chips disappear from the prompt box at the
    // same moment the request goes out, which matches user expectation.
    const sendingFiles = overrides?.files ?? attachments;
    const sendingUrls = overrides?.urls ?? refUrls;
    setAttachments([]);
    setRefUrls([]);

    // Read any image attachments as raw base64 (no data: prefix). We only
    // forward image MIME types; non-image files would be ignored by the
    // model anyway, so we silently drop them rather than confuse the user.
    const ALLOWED = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ]);
    const fileToBase64 = (file: File) =>
      new Promise<{ name: string; mediaType: string; base64: string }>(
        (resolve, reject) => {
          const r = new FileReader();
          r.onerror = () => reject(r.error ?? new Error("read failed"));
          r.onload = () => {
            const result = String(r.result ?? "");
            const comma = result.indexOf(",");
            resolve({
              name: file.name,
              mediaType: file.type,
              base64: comma >= 0 ? result.slice(comma + 1) : result,
            });
          };
          r.readAsDataURL(file);
        },
      );
    const images = (
      await Promise.all(
        sendingFiles
          .filter((f) => ALLOWED.has(f.type))
          .slice(0, 5)
          .map((f) => fileToBase64(f).catch(() => null)),
      )
    ).filter(
      (x): x is { name: string; mediaType: string; base64: string } => x != null,
    );

    const body: Record<string, unknown> = { prompt };
    if (modelKey) body.model = modelKey;
    if (effectivePlanMode) body.planMode = true;
    if (sendingUrls.length > 0) body.urls = sendingUrls;
    if (images.length > 0) body.images = images;

    try {
      const res = await fetch(`/api/ai/build/${username}/${slug}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `HTTP ${res.status}`);
      }
      // We keep two strings:
      //   raw      — the full token stream from Anthropic, used to derive
      //              the visible target via stripIncompleteFileBlocks().
      //   revealed — characters already shown to the user; we advance this
      //              toward target.length on a RAF loop so chunky tokens
      //              feel like smooth letter-by-letter typing.
      let raw = "";
      let target = "";
      let revealed = 0;
      let raf: number | null = null;
      let finished = false;

      const tick = () => {
        // Adaptive pace: when the gap is small we type slowly so a single
        // word doesn't blink in; when the gap is large we catch up quickly
        // so we never feel laggy. Cap so the typing always feels human.
        const gap = target.length - revealed;
        const charsPerFrame = finished
          ? Math.max(8, Math.ceil(gap / 3))
          : Math.max(1, Math.min(12, Math.ceil(gap / 8)));
        revealed = Math.min(target.length, revealed + charsPerFrame);
        setTyped(target.slice(0, revealed));
        if (revealed < target.length) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = null;
        }
      };
      const schedule = () => {
        if (raf == null) raf = requestAnimationFrame(tick);
      };

      // Track whether we've already pushed the "Generating code" step so
      // the very first `delta` event swaps the spinner off the previous
      // status even when the server didn't send a separate status for it.
      // We deliberately DO NOT add per-file "Writing X" rows to the
      // checklist any more — the AI's typed prose now narrates each
      // file inline via FileNoticeText (rendered as "Creating X..." /
      // "Created X" rows), and a parallel checklist would be redundant.
      let generatingPushed = false;
      for await (const evt of readSSE(res)) {
        if (evt.event === "status" && typeof evt.data?.message === "string") {
          closeAndAdd(evt.data.message.replace(/[…\.]+$/g, ""));
        } else if (evt.event === "start") {
          setPhase("Streaming");
          if (!generatingPushed) {
            closeAndAdd("Generating code");
            generatingPushed = true;
          }
        } else if (evt.event === "delta" && evt.data?.text) {
          raw += evt.data.text;
          target = stripIncompleteFileBlocks(raw);
          schedule();
          if (!generatingPushed) {
            closeAndAdd("Generating code");
            generatingPushed = true;
          }
        } else if (evt.event === "usage") {
          // Server still sends per-generation cost + remaining balance,
          // but the in-chat "Used $X · Remaining $Y" line was removed
          // per UX feedback. Intentionally a no-op here so we can
          // bring it back without server changes if we change our minds.
        } else if (evt.event === "error") {
          // Server marks operator-side outages (out of API credits, key
          // revoked, provider down) with code "upstream_unavailable" so we
          // can show a friendly fallback instead of leaking billing text
          // to end users.
          const friendly =
            evt.data?.code === "upstream_unavailable"
              ? "Server is currently offline, come back soon."
              : evt.data?.message || "AI error";
          throw new Error(friendly);
        } else if (evt.event === "done") {
          if (evt.data?.ok) {
            setPhase("Done");
            finishAll("done");
            const n = evt.data?.build?.filesChanged ?? 0;
            toast.success(
              n > 0
                ? `Build complete — ${n} file${n === 1 ? "" : "s"} updated`
                : "Build complete",
            );
            // Pull the AI's quick follow-up suggestions out of the done
            // payload and stash them as chips above the prompt box.
            // Server caps at 4 already; clamp again client-side as a
            // belt-and-braces guard against malformed payloads.
            const sugg = Array.isArray(evt.data?.suggestions)
              ? (evt.data.suggestions as unknown[])
                  .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                  .slice(0, 4)
              : [];
            setQuickTasks(sugg);
            // Server-emitted control directives. `openTab` is a tab key
            // string (we still validate against TAB_META so a malformed
            // payload can't crash the UI), `secretRequests` is an array
            // of {name,label,description} entries we attach to the
            // freshly-created build by id.
            const buildId: string | undefined = evt.data?.build?.id;
            const tabKey = evt.data?.openTab;
            if (typeof tabKey === "string" && tabKey in TAB_META) {
              const tk = tabKey as TabKey;
              // Mirror openTab() inline so we don't depend on a closure
              // over a function defined further down — also makes it
              // explicit that an AI-driven open is the same operation
              // a user would do clicking a tab in the strip.
              setOpenTabs((tabs) => (tabs.includes(tk) ? tabs : [...tabs, tk]));
              setActiveTab(tk);
            }
            if (buildId && Array.isArray(evt.data?.secretRequests)) {
              const reqs = (evt.data.secretRequests as unknown[])
                .filter(
                  (
                    r,
                  ): r is { name: string; label?: string; description?: string | null } =>
                    !!r &&
                    typeof r === "object" &&
                    typeof (r as { name: unknown }).name === "string",
                )
                .map((r) => ({
                  name: r.name,
                  label: typeof r.label === "string" && r.label.length > 0 ? r.label : r.name,
                  description:
                    typeof r.description === "string" && r.description.length > 0
                      ? r.description
                      : null,
                }))
                .slice(0, 8);
              if (reqs.length > 0) {
                setPendingSecretRequests((prev) => ({ ...prev, [buildId]: reqs }));
              }
            }
          }
        }
      }
      // Stream finished — flush remaining characters quickly.
      finished = true;
      target = stripIncompleteFileBlocks(raw);
      schedule();
      await queryClient.invalidateQueries({ queryKey: ["projects", username, slug, "builds"] });
      await queryClient.invalidateQueries({ queryKey: ["projects", username, slug] });
      await queryClient.invalidateQueries({ queryKey: ["projects", username, slug, "files"] });
      await queryClient.invalidateQueries({ queryKey: ["projects", username, slug, "file"] });
      // The AI may have provisioned a Neon database mid-stream via the
      // `<deploybro:provision-db />` directive. Invalidate the Database
      // tab queries so the freshly-provisioned DB shows up immediately
      // without the user having to refresh the page.
      await queryClient.invalidateQueries({ queryKey: ["projects", username, slug, "db"] });
      // Refresh the header balance and the billing/transactions pages so the
      // post-deduction amounts show up immediately.
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "transactions"] });
      // The new build is now in `pastBuilds` (which renders the user's
      // prompt as a bubble). Drop the pending bubble so the prompt
      // doesn't render twice during the 600ms cleanup hold.
      setPendingPrompt(null);
      // Force the preview iframe to reload with the freshly-written files.
      setIframeKey((k) => k + 1);
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      finishAll(aborted ? "done" : "error");
      if (!aborted) {
        toast.error(err instanceof Error ? err.message : "Build failed");
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      // Hold the final text briefly so the user sees it transition into
      // history. We also clear the action checklist on the same beat so
      // the completed checks fade out alongside the streaming bubble.
      // The timer id is stored in a ref so a new send started inside
      // this 600ms window can cancel it before it wipes fresh state.
      cleanupTimerRef.current = window.setTimeout(() => {
        cleanupTimerRef.current = null;
        setPhase(undefined);
        setTyped("");
        setStreamSteps([]);
      }, 600);
    }
  };

  // Keep the ref pointing at the latest handleSend so the auto-prompt
  // effect (defined earlier in the component) can fire it.
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  // Listen for runtime errors postMessaged from the dev preview iframe.
  // The overlay injected by the API server (see `injectErrorOverlay` in
  // artifacts/api-server/src/routes/files.ts) sends a structured
  // `deploybro:preview-error` message whenever the user's app throws or
  // their JSX fails to compile. We surface a toast immediately so the
  // user knows the AI can help, and when they click "Fix this with AI"
  // in the overlay (`autofix: true`) we pre-fill the chat with the full
  // error context and auto-submit. This closes the loop the user was
  // missing — bad code gets caught, the AI sees the actual error
  // message + file + line, and the next build is a fix attempt.
  // Dedupe so the same error doesn't trigger multiple back-to-back fix
  // builds (double-clicked button, error fires twice, etc.). Reset
  // whenever the project changes so navigating away and back doesn't
  // permanently block legitimate retries on the same error message.
  const lastAutofixSigRef = useRef<string>("");
  useEffect(() => {
    lastAutofixSigRef.current = "";
  }, [username, slug]);
  // Also reset when a new build starts — if the user runs another
  // generation, the preview is a fresh attempt and the same error
  // re-occurring is worth fixing again.
  useEffect(() => {
    if (isStreaming) lastAutofixSigRef.current = "";
  }, [isStreaming]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Authenticate the source: only trust messages from our preview
      // iframe. This prevents any other frame/extension/script from
      // spoofing a "Fix with AI" trigger and forcing an AI submission
      // (which costs the user money). `event.source` is the Window of
      // the sender, which we compare against the iframe's contentWindow.
      if (!previewIframeRef.current) return;
      if (event.source !== previewIframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "deploybro:preview-error") return;
      const message = String(data.message ?? "Unknown error").slice(0, 1000);
      const where = data.where ? String(data.where).slice(0, 200) : "";
      const stack = data.stack ? String(data.stack).slice(0, 1500) : "";
      // Only auto-trigger when the overlay's "Fix this with AI" button
      // was clicked. Plain error reports just show a toast — the user
      // might be mid-prompt and we don't want to clobber their input.
      if (!data.autofix) {
        toast.error("Preview hit an error. Click 'Fix this with AI' to debug.", {
          duration: 5000,
        });
        return;
      }
      // Dedupe so a double-clicked button doesn't queue two fix-builds.
      const sig = `${message}|${where}`;
      if (sig === lastAutofixSigRef.current) return;
      lastAutofixSigRef.current = sig;
      const fixPrompt =
        `The preview is throwing this error — please diagnose and fix it.\n\n` +
        `Error: ${message}` +
        (where ? `\nLocation: ${where}` : "") +
        (stack ? `\n\nStack:\n${stack}` : "");
      // Preserve any in-progress draft the user is typing — overwriting
      // it would be infuriating. If they have text, queue the fix
      // prompt for their review instead of submitting.
      const hasDraft = chatInput.trim().length > 0;
      if (isStreaming || hasDraft) {
        setChatInput(fixPrompt);
        toast.message("Fix request ready in chat", {
          description: isStreaming
            ? "Send it when the current build finishes."
            : "Review and hit send to apply.",
        });
        return;
      }
      toast.message("Asking DeployBro to fix this…", {
        description: where || message.slice(0, 80),
      });
      handleSendRef.current?.(fixPrompt);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // We deliberately depend on `isStreaming` and `chatInput` so the
    // closure sees the current streaming state and draft when the
    // iframe sends an error.
  }, [isStreaming, chatInput]);

  const copyUrl = () => {
    navigator.clipboard.writeText(`${slug}.deploybro.app`);
    toast.success("URL copied");
  };

  const currentStep = phase ? { phase, text: "" } : null;

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden text-foreground">
      {/* Top Navbar */}
      {/* The navbar is split at the same boundary as the body: a brand
          column whose width matches the chat panel, a draggable vertical
          handle that lines up with the body's chat-resize handle, and the
          tab strip that fills the rest. Dragging EITHER handle (navbar or
          body) resizes the chat column, and visually you get one
          continuous draggable edge from the top of the navbar all the
          way down. */}
      <header className="h-12 border-b border-border bg-surface flex items-center shrink-0 relative z-50">
        <div
          className="flex items-center gap-2 md:gap-3 min-w-0 px-3 md:px-4 h-full md:shrink-0 md:w-[var(--chat-w)] md:border-r md:border-border"
          style={{ ["--chat-w" as string]: `${chatWidth}px` } as React.CSSProperties}
        >
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity shrink-0 flex items-center">
            <BrandLogo className="h-5 w-auto text-foreground" />
          </Link>
          <div className="w-px h-4 bg-border hidden sm:block"></div>
          {/* Project switcher — shows current slug; opens a dropdown of
              all the user's projects so they can jump between them
              without going back to the dashboard. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 min-w-0 rounded-md px-1.5 py-1 hover:bg-surface-raised transition-colors group">
                <span className="text-sm font-mono text-foreground truncate max-w-[10rem] sm:max-w-[14rem]">
                  {project?.name ?? slug}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-secondary shrink-0 group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 border-border max-h-72 overflow-y-auto">
              {myProjects.length === 0 ? (
                <DropdownMenuItem disabled className="text-secondary text-xs">
                  No projects yet
                </DropdownMenuItem>
              ) : (
                myProjects.map((p: ApiProjectListItem) => (
                  <DropdownMenuItem
                    key={p.slug}
                    asChild
                    className="flex items-center gap-2"
                  >
                    <Link href={`/${p.ownerUsername}/${p.slug}/build`}>
                      <span className="font-mono text-sm truncate flex-1">{p.name ?? p.slug}</span>
                      {p.slug === slug && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="text-secondary text-xs">
                  ← All projects
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Drag handle aligned with the body's chat-resize handle so the
            entire chat column has one continuous draggable seam. */}
        <div
          onMouseDown={startDrag}
          onDoubleClick={() => setChatWidth(400)}
          className="hidden md:block w-1 self-stretch shrink-0 cursor-col-resize bg-transparent hover:bg-primary/40 active:bg-primary/60 transition-colors -ml-px"
          title="Drag to resize · double-click to reset"
        />

        {/* Tab strip — desktop only, lives in the navbar to use the
            otherwise-empty middle space. Mobile gets its own row below. */}
        <BuilderTabStrip
          openTabs={openTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          closeTab={closeTab}
          openTab={openTab}
          className="hidden md:flex flex-1 items-center gap-1 px-2 overflow-x-auto min-w-0"
        />

        <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto px-3 md:px-4">
          <span className="hidden lg:inline text-xs text-secondary font-mono">
            ${apiBuilds.reduce((s, b) => s + b.cost, 0).toFixed(2)} spend
          </span>


          {/* Live URL chip — only when there's a successful publish and we
              aren't currently re-publishing. Click to open, secondary copy. */}
          {liveDeploymentUrl && !isPublishing && (
            <a
              href={liveDeploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-mono hover:bg-success/20 transition-colors max-w-[14rem]"
              title={liveDeploymentUrl}
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {liveDeploymentUrl.replace(/^https?:\/\//, "")}
              </span>
            </a>
          )}

          {isPublishing ? (
            // In-flight pill — disabled, animates while pipeline runs.
            <button
              disabled
              className="inline-flex items-center gap-2 h-8 px-3 md:px-4 rounded-md bg-primary/15 text-primary text-sm font-medium cursor-not-allowed"
              title={deploymentStepLabel(activeDeployment!.status)}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">
                {deploymentStepLabel(activeDeployment!.status)}
              </span>
            </button>
          ) : isOverPublishLimit ? (
            // Project is over the publish hard cap — block the action at
            // the navbar so the user finds out before the pipeline starts
            // and fails. We render a non-interactive Button (no dropdown)
            // wrapped in a Tooltip explaining the actual numbers and the
            // next step. Wrapping the disabled button in <span> keeps
            // pointer events alive so Radix can show the tooltip.
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex">
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 md:px-4 font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled
                    aria-disabled
                    data-testid="publish-button-over-limit"
                  >
                    {liveDeploymentUrl ? "Republish" : "Publish"}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                {oversizeTooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 md:px-4 font-medium rounded-md"
                  disabled={publishMutation.isPending}
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : liveDeploymentUrl ? (
                    "Republish"
                  ) : (
                    "Publish"
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-border w-56">
                <DropdownMenuItem
                  onClick={handlePublish}
                  className="flex items-center gap-2"
                >
                  {isFreePlan ? (
                    <Lock className="w-3.5 h-3.5 text-secondary" />
                  ) : (
                    <Rocket className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isFreePlan
                      ? "Upgrade to publish"
                      : liveDeploymentUrl
                      ? "Redeploy to web"
                      : "Publish to web"}
                  </span>
                  {isFreePlan && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-secondary font-mono">
                      Pro
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openTab("domains")}
                  className="flex items-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Connect custom domain</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem disabled>Export as ZIP</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
            streamSteps={streamSteps}
            typed={typed}
            pendingPrompt={pendingPrompt}
            onSend={handleSend}
            openBuildId={openBuildId}
            setOpenBuildId={setOpenBuildId}
            pastBuilds={pastBuilds}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            planMode={planMode}
            setPlanMode={setPlanMode}
            attachments={attachments}
            setAttachments={setAttachments}
            refUrls={refUrls}
            setRefUrls={setRefUrls}
            quickTasks={quickTasks}
            onStop={() => abortRef.current?.abort()}
            pendingSecretRequests={pendingSecretRequests}
            setPendingSecretRequests={setPendingSecretRequests}
            setOpenTabs={setOpenTabs}
            setActiveTab={setActiveTab}
            username={username}
            slug={slug}
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
          {/* Tab strip — mobile only (icons), since the desktop strip lives
              inside the navbar above. */}
          <BuilderTabStrip
            compact
            openTabs={openTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            closeTab={closeTab}
            openTab={openTab}
            className="md:hidden h-11 border-b border-border bg-surface flex items-center px-2 gap-1 overflow-x-auto shrink-0"
          />

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
                username={username!}
                slug={slug!}
                viewport={viewport}
                setViewport={setViewport}
                isBuilding={isStreaming}
                iframeRef={previewIframeRef}
              />
            )}
            {activeTab === "files" && (
              <FilesPane
                username={username!}
                slug={slug!}
                activeFile={activeFile}
                setActiveFile={setActiveFile}
              />
            )}
            {activeTab === "database" && <DatabaseView />}
            {activeTab === "env" && <EnvVarsView />}
            {activeTab === "analytics" && <AnalyticsView />}
            {activeTab === "payments" && <PaymentsView />}
            {activeTab === "integrations" && <IntegrationsView />}
            {activeTab === "domains" && <DomainsView />}
            {activeTab === "history" && (
              <HistoryPane
                openBuildId={openBuildId}
                setOpenBuildId={setOpenBuildId}
                builds={pastBuilds}
                deployments={deployments}
                onRetryPublish={handlePublish}
                publishBusy={publishMutation.isPending || isPublishing}
              />
            )}
            {activeTab === "settings" && (
              <SettingsPane
                username={username}
                slug={slug}
                project={project}
              />
            )}
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
          streamSteps={streamSteps}
          typed={typed}
          pendingPrompt={pendingPrompt}
          onSend={handleSend}
          openBuildId={openBuildId}
          setOpenBuildId={setOpenBuildId}
          pastBuilds={pastBuilds}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          planMode={planMode}
          setPlanMode={setPlanMode}
          attachments={attachments}
          setAttachments={setAttachments}
          refUrls={refUrls}
          setRefUrls={setRefUrls}
          quickTasks={quickTasks}
          onStop={() => abortRef.current?.abort()}
          pendingSecretRequests={pendingSecretRequests}
          setPendingSecretRequests={setPendingSecretRequests}
          setOpenTabs={setOpenTabs}
          setActiveTab={setActiveTab}
          username={username}
          slug={slug}
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
  streamSteps,
  typed,
  pendingPrompt,
  onSend,
  openBuildId,
  setOpenBuildId,
  pastBuilds,
  selectedModel,
  setSelectedModel,
  planMode,
  setPlanMode,
  attachments,
  setAttachments,
  refUrls,
  setRefUrls,
  quickTasks,
  onStop,
  pendingSecretRequests,
  setPendingSecretRequests,
  setOpenTabs,
  setActiveTab,
  username,
  slug,
}: {
  chatInput: string;
  setChatInput: (v: string) => void;
  isStreaming: boolean;
  currentPhase: string | undefined;
  streamSteps: StreamStep[];
  typed: string;
  pendingPrompt: string | null;
  onSend: () => void;
  openBuildId: string | null;
  setOpenBuildId: (id: string | null) => void;
  pastBuilds: PastBuild[];
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  planMode: boolean;
  setPlanMode: (v: boolean) => void;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  refUrls: string[];
  setRefUrls: React.Dispatch<React.SetStateAction<string[]>>;
  quickTasks: string[];
  onStop: () => void;
  pendingSecretRequests: Record<
    string,
    Array<{ name: string; label: string; description: string | null }>
  >;
  setPendingSecretRequests: React.Dispatch<
    React.SetStateAction<
      Record<
        string,
        Array<{ name: string; label: string; description: string | null }>
      >
    >
  >;
  setOpenTabs: React.Dispatch<React.SetStateAction<TabKey[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<TabKey>>;
  username: string | undefined;
  slug: string | undefined;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlError, setUrlError] = useState("");

  // Pro-plan gate for the model picker. ChatPanel is its own component so
  // we re-derive these here instead of plumbing them through props.
  const { data: chatMe } = useMe();
  const isFreePlan = (chatMe?.plan ?? "Free").toLowerCase() === "free";
  const [, setLocation] = useLocation();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachments((prev) => [...prev, ...Array.from(files)].slice(0, 6));
  };

  // --- Auto-scroll while the AI is streaming ---
  // Keep the latest "Creating …" / "Created …" row in view, but only if
  // the user is already near the bottom — if they've scrolled up to read
  // an earlier turn we leave them alone. `stickToBottom` flips false the
  // moment they scroll up by more than a small slack and flips true again
  // when they return to the bottom.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < 80;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottom.current) return;
    // Defer until after layout flushes the new rows so scrollHeight is
    // accurate. requestAnimationFrame instead of setTimeout(0) so we
    // batch with the paint and don't fight a user's in-flight scroll.
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [
    typed,
    pendingPrompt,
    streamSteps.length,
    pastBuilds.length,
    isStreaming,
  ]);

  // Belt-and-braces: keep the chat pinned to the bottom whenever the
  // content's intrinsic size changes (new file marker, suggestions chips
  // appearing, the streaming bubble collapsing 600ms after a build
  // finishes, etc.). Without this, react-query refetches that grow
  // pastBuilds AFTER the streaming bubble has already shrunk can leave
  // the latest assistant message just below the fold until the user
  // scrolls. ResizeObserver fires synchronously after layout, so we
  // jump (no smooth animation) to avoid stacking competing animations.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!stickToBottom.current) return;
      el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    // Observe the inner content too — the flex column's children grow
    // even when the scroll container itself doesn't change size.
    for (const child of Array.from(el.children)) {
      ro.observe(child);
    }
    return () => ro.disconnect();
  }, []);

  const addUrl = () => {
    const raw = urlDraft.trim();
    if (!raw) return;
    // Auto-prepend https:// for the common case where users type "stripe.com".
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(candidate);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("scheme");
      }
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

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth"
      >
        {/* Conversation thread (oldest first, like a chat) */}
        {[...pastBuilds].reverse().map((b) => {
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
                <div className="text-sm text-muted-foreground leading-relaxed break-words">
                  <FileNoticeText text={b.aiMessage} />
                </div>

                {/* Inline secure-input bubbles for any
                    `<deploybro:request-secret … />` directives the AI
                    emitted in this turn. Submitting one PUTs the value
                    to /env-vars (encrypted at rest); skip just removes
                    the bubble from view. The AI never sees the value —
                    only that the named key is now set. */}
                {(pendingSecretRequests[b.id] ?? []).map((req) => (
                  <SecretRequestBubble
                    key={req.name}
                    request={req}
                    username={username!}
                    slug={slug!}
                    onOpenEnvTab={() => {
                      setOpenTabs((tabs) =>
                        tabs.includes("env") ? tabs : [...tabs, "env"],
                      );
                      setActiveTab("env");
                    }}
                    onResolved={() => {
                      setPendingSecretRequests((prev) => {
                        const list = (prev[b.id] ?? []).filter(
                          (r) => r.name !== req.name,
                        );
                        if (list.length === 0) {
                          const next = { ...prev };
                          delete next[b.id];
                          return next;
                        }
                        return { ...prev, [b.id]: list };
                      });
                    }}
                  />
                ))}

                {/* Footer: Checkpoint on its own line, then full-width
                    "Worked for…" accordion row with the chevron pinned to
                    the right. Clicking anywhere on the row toggles the
                    cost details below. */}
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
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border border-border bg-surface hover:bg-surface-raised hover:border-primary/40 font-mono text-left transition-colors"
                  >
                    <span>Worked for {durationLabel}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform ${
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
                        ${b.cost.toFixed(2)}
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
        {(isStreaming || currentPhase || pendingPrompt) && (
          <div className="space-y-3">
            {/* The user's prompt for this in-flight turn, shown
                immediately so they can see what they sent — without
                this the textbox empties but their message doesn't
                show up until the build is recorded. Mirrors the
                styling of past-build user bubbles above. */}
            {pendingPrompt && (
              <div className="flex justify-end">
                <div className="max-w-[88%] px-3.5 py-2 rounded-2xl rounded-br-md bg-primary/15 text-primary text-sm leading-snug">
                  {pendingPrompt}
                </div>
              </div>
            )}

            {/* The AI's prose — calm, muted, no animation. This is where
                the model tells the user what it is about to do. */}
            <div className="text-sm leading-relaxed min-h-[1.4em] whitespace-pre-wrap break-words text-muted-foreground">
              <FileNoticeText text={typed} />
            </div>

            {/* The per-step icon list used to live here, but the AI's prose
                narrative above already tells the user what's happening — the
                redundant labels added noise without adding information. */}
          </div>
        )}

        {!isStreaming && !currentPhase && pastBuilds.length === 0 && (
          <div className="text-xs text-secondary text-center py-8">
            Tell the AI what to build. Watch the work happen live.
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-surface shrink-0">
        {/* Quick follow-up task chips. Hidden while a build is streaming
            and while the user is typing — both states mean the previous
            chips are stale or about to be replaced. Click drops the text
            into the input and focuses it; the user can edit before send. */}
        {!isStreaming && quickTasks.length > 0 && chatInput.trim().length === 0 && (
          <div className="flex gap-1.5 mb-2 overflow-x-auto no-scrollbar -mx-3 px-3">
            {quickTasks.map((task, i) => (
              <button
                key={`qt-${i}`}
                onClick={() => {
                  setChatInput(task);
                  inputRef.current?.focus();
                }}
                className="inline-flex items-center shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full border border-border bg-surface-raised hover:bg-background hover:border-primary/40 text-[11px] text-foreground transition-colors text-left"
                title={task}
              >
                {task}
              </button>
            ))}
          </div>
        )}
        <div className="prompt-glow rounded-xl border border-border bg-background">
          {/* Attachment + URL chips */}
          {(attachments.length > 0 || refUrls.length > 0) && (
            <div className="flex flex-wrap gap-1.5 p-2 pb-0">
              {attachments.map((f, i) => {
                const isImg = f.type.startsWith("image/");
                return (
                  <span
                    key={`f-${i}`}
                    className="inline-flex items-center gap-1.5 max-w-[180px] px-2 py-1 rounded-md bg-surface-raised border border-border text-[11px] text-foreground"
                  >
                    {isImg ? (
                      <ImageIcon className="w-3 h-3 text-secondary shrink-0" />
                    ) : (
                      <Paperclip className="w-3 h-3 text-secondary shrink-0" />
                    )}
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
                );
              })}
              {refUrls.map((u, i) => {
                let host = u;
                try { host = new URL(u).host; } catch {}
                return (
                  <span
                    key={`u-${i}`}
                    className="inline-flex items-center gap-1.5 max-w-[200px] px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-[11px] text-foreground"
                    title={u}
                  >
                    <Link2 className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate">{host}</span>
                    <button
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
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={
              planMode
                ? "Plan first, then build... describe the change"
                : refUrls.length > 0
                ? "Tell the AI how to redesign these references..."
                : "Describe a change..."
            }
            className="w-full min-h-[60px] max-h-[180px] bg-transparent p-3 text-sm focus:outline-none resize-none"
          />

          {/* Action row: + menu, plan toggle, model picker (left), send (right) */}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div className="flex items-center gap-1 min-w-0">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  handleFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />

              {/* "+" menu — image upload or reference URL for redesigns */}
              <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setUrlError(""); }}>
                <PopoverTrigger asChild>
                  <button
                    className="w-7 h-7 rounded-md flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised transition-colors shrink-0"
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
                        PNG, JPG, WEBP or GIF — up to 5 images
                      </div>
                    </div>
                  </button>
                  <div className="h-px bg-border my-1" />
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Link2 className="w-3.5 h-3.5 text-secondary" />
                      <span className="text-[11px] font-medium text-foreground">
                        Add a website to redesign
                      </span>
                    </div>
                    <div className="text-[10px] text-secondary mb-2 leading-snug">
                      Paste any public site — the AI fetches it and uses it as a starting point.
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
                  {AVAILABLE_MODELS.map((m) => {
                    const active = m.name === selectedModel;
                    // Smart Bro and Power Bro are Pro-tier only. Free
                    // users can still see them in the menu so they know
                    // what they're missing, but selecting one bounces to
                    // billing instead of switching the model.
                    const isProOnly = m.key !== "haiku";
                    const locked = isFreePlan && isProOnly;
                    return (
                      <button
                        key={m.name}
                        onClick={() => {
                          if (locked) {
                            setModelOpen(false);
                            toast.message("Pro plan required", {
                              description:
                                "Smart Bro and Power Bro are available on the Pro plan.",
                              action: {
                                label: "Upgrade",
                                onClick: () =>
                                  setLocation("/dashboard/billing"),
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
                            {isProOnly && (
                              <span className="text-[9px] leading-none px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 font-mono uppercase tracking-wider shrink-0">
                                Pro
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-secondary font-mono">
                            {m.costRange}
                          </div>
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

            {/* Right action group: Plan toggle lives next to Send so the
                "what mode / send it" decision is grouped together. */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setPlanMode(!planMode)}
                className={`h-7 px-2 rounded-md inline-flex items-center gap-1.5 text-[11px] font-mono transition-colors ${
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

              {/* Send / Stop. While a build is streaming the same button
                  becomes a stop control that aborts the in-flight request,
                  so the user has one consistent place to either send or
                  cancel without having to hunt for an extra control. */}
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => onSend()}
                  disabled={!chatInput.trim()}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                  title="Send"
                  aria-label="Send"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
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
  username,
  slug,
  viewport,
  isBuilding,
  iframeRef,
}: {
  username: string;
  slug: string;
  viewport: "desktop" | "tablet" | "mobile";
  setViewport: (v: "desktop" | "tablet" | "mobile") => void;
  isBuilding?: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}) {
  const { data: files } = useProjectFiles(username, slug);
  const hasIndex = !!files?.some((f) => f.path === "index.html");
  // The api-server's preview endpoint sits behind the same Express app the
  // frontend talks to via VITE_API_BASE_URL. Build the iframe src off that.
  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
  const previewSrc = `${apiBase.replace(/\/+$/, "")}/preview/${username}/${slug}/`;

  // Three distinct empty states sit on top of the white "device" frame:
  //   1. Files still loading from the server  → soft loader.
  //   2. A build is in flight + no index yet  → branded "building" splash
  //      with shimmer skeletons that mimic a page being painted in.
  //   3. No build yet at all                  → branded "no preview" splash
  //      that nudges the user to send a prompt.
  // Once `index.html` exists we hand the frame off to the live iframe.
  const showBuilding = !hasIndex && isBuilding;
  const showEmpty = !hasIndex && !isBuilding && files !== undefined;

  return (
    <div className="absolute inset-0 flex flex-col bg-surface-raised">
      <div className="flex-1 p-3 md:p-8 flex items-center justify-center overflow-hidden">
        <div
          className="w-full h-full flex flex-col transition-all duration-200 ease-in-out rounded-md overflow-hidden shadow-2xl"
          style={{
            maxWidth:
              viewport === "desktop"
                ? "100%"
                : viewport === "tablet"
                ? "768px"
                : "390px",
            maxHeight: viewport === "mobile" ? "844px" : "100%",
            background: hasIndex ? "#ffffff" : "transparent",
          }}
        >
          {files === undefined ? (
            <PreviewPaneShell>
              <div className="flex-1 flex items-center justify-center text-sm text-secondary">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading preview…
              </div>
            </PreviewPaneShell>
          ) : showBuilding ? (
            <PreviewPaneShell>
              <PreviewBuildingState />
            </PreviewPaneShell>
          ) : showEmpty ? (
            <PreviewPaneShell>
              <PreviewEmptyState />
            </PreviewPaneShell>
          ) : (
            <iframe
              key={previewSrc}
              ref={iframeRef}
              src={previewSrc}
              title="App preview"
              className="flex-1 w-full bg-white"
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Shared "device" backdrop used for every non-iframe state so the empty
// and building screens share one consistent branded surface (subtle
// radial glow on top of the dark builder canvas) instead of dropping
// the user onto a stark white card.
function PreviewPaneShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(59,130,246,0.12) 0%, rgba(15,15,18,0) 60%), linear-gradient(180deg, #0b0b0f 0%, #0e0f14 100%)",
      }}
    >
      {/* Faint grid texture so the empty surface still feels like "a canvas" */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function PreviewEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-5">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -m-6 rounded-full blur-2xl opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.7) 0%, rgba(59,130,246,0) 70%)",
          }}
        />
        <BrandLogo className="relative h-10 w-auto text-foreground opacity-95" />
      </div>
      <div className="space-y-2 max-w-sm">
        <div className="text-lg font-semibold text-foreground">
          Your preview will appear here
        </div>
        <div className="text-sm text-secondary">
          Describe what you want to build in the chat on the left and DeployBro
          will generate a live preview right here.
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-tertiary">
        <Sparkles className="w-3 h-3" />
        Ready when you are
      </div>
    </div>
  );
}

function PreviewBuildingState() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 gap-6 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Building your preview"
    >
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -m-4 rounded-full blur-2xl opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(59,130,246,0.7) 0%, rgba(59,130,246,0) 70%)",
          }}
        />
        <BrandLogo className="relative h-10 w-auto" />
      </div>
      <div className="flex items-center gap-2 text-sm text-secondary">
        <Loader2 className="w-4 h-4 animate-spin text-primary" aria-hidden />
        <span>Building your preview…</span>
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

// Format a byte count as a short, human-friendly string. Used both in
// the per-file row and in the "X / 90 MB" project-size gauge so the
// units agree at a glance.
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Tiny gauge that lives in the Explorer footer. Shows current total
// project size against the publish hard cap, with a colored bar so
// users notice when they're getting close. Rendered identically in
// the desktop sidebar and the mobile dropdown so the warning is
// reachable from both.
function ProjectSizeGauge({
  totalBytes,
  pct,
  state,
  limitBytes,
}: {
  totalBytes: number;
  pct: number;
  state: "ok" | "warn" | "over";
  limitBytes: number;
}) {
  const barColor =
    state === "over"
      ? "bg-red-500"
      : state === "warn"
      ? "bg-amber-500"
      : "bg-primary/60";
  const textColor =
    state === "over"
      ? "text-red-500"
      : state === "warn"
      ? "text-amber-500"
      : "text-secondary";
  // Cap the rendered bar width at 100% so an oversized project doesn't
  // overflow the container, but keep the numeric label honest.
  const barWidth = Math.min(100, pct);
  const limitMb = Math.round(limitBytes / 1024 / 1024);
  return (
    <div
      className="px-3 py-2 border-t border-border bg-surface"
      title={
        state === "over"
          ? `Over the ${limitMb}MB publish limit — the next publish will fail until you free space.`
          : state === "warn"
          ? `Approaching the ${limitMb}MB publish limit. Consider deleting unused assets.`
          : `Project size — publish hard cap is ${limitMb}MB.`
      }
    >
      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
        <span className="uppercase tracking-wider text-secondary">
          Project size
        </span>
        <span className={textColor}>
          {formatBytes(totalBytes)} / {limitMb} MB
        </span>
      </div>
      <div className="h-1 rounded-full bg-surface-raised overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      {state === "over" && (
        <div className="mt-1.5 text-[10px] text-red-500 leading-snug">
          Over the publish limit — delete an asset to deploy again.
        </div>
      )}
      {state === "warn" && (
        <div className="mt-1.5 text-[10px] text-amber-500 leading-snug">
          Getting close to the publish limit.
        </div>
      )}
    </div>
  );
}

function FilesPane({
  username,
  slug,
  activeFile,
  setActiveFile,
}: {
  username: string;
  slug: string;
  activeFile: string;
  setActiveFile: (f: string) => void;
}) {
  const { data: files = [] } = useProjectFiles(username, slug);
  const uploadFile = useUploadProjectFile(username, slug);
  const deleteFile = useDeleteProjectFile(username, slug);
  // Server-advertised limits for the gauge + per-file pre-flight.
  // `useAppConfigValues` collapses the loading state into the fallback
  // so we always get real numbers without a non-null assertion.
  const { publishSizeLimitBytes: publishLimitBytes, perFileUploadLimitBytes: perFileLimitBytes } =
    useAppConfigValues();
  // Hidden file input for the Explorer's Upload button. We render one
  // <input type=file multiple> and trigger it imperatively from the
  // toolbar button + drag handler so the rest of the layout stays clean.
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Sort mode for the file list. "name" keeps the alphabetical-by-path
  // grouping users are used to; "size" flattens the tree and sorts
  // largest-first so the file eating the publish budget is row #1.
  // Persisted in component state only — resets on a fresh mount per the
  // task spec ("per-session in component state").
  const [sortMode, setSortMode] = useState<"name" | "size">("name");
  // Tracks whether we've already auto-nudged the user into "size" mode
  // for this mount so the toast/auto-switch only fires once even if the
  // gauge oscillates around the warn threshold as files are added/removed.
  const autoSortedRef = useRef(false);
  const tree = files.map((f) => {
    const segments = f.path.split("/");
    const group = segments.length > 1 ? segments.slice(0, -1).join("/") : "";
    return {
      path: f.path,
      group,
      sizeBytes: f.size,
      size: formatBytes(f.size),
      encoding: f.encoding,
      contentType: f.contentType,
    };
  });
  // Sum the byte size of every file so we can show a live "X / N MB"
  // gauge in the Explorer footer. The publish pipeline rejects anything
  // above the server-advertised cap, and the user previously only learned
  // they were over the cap *after* hitting Publish — this surfaces the
  // problem while they can still prune.
  const totalBytes = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const sizePct = (totalBytes / publishLimitBytes) * 100;
  const sizeState: "ok" | "warn" | "over" =
    sizePct >= 100 ? "over" : sizePct >= 80 ? "warn" : "ok";

  // Soft auto-suggestion: the first time the gauge crosses into amber/red
  // for this session, flip the file list into size order so the offender
  // is immediately on screen. We only do this once and only if the user
  // hasn't already chosen a sort themselves (still on default "name") so
  // we never override an explicit user preference.
  useEffect(() => {
    if (autoSortedRef.current) return;
    if (sizeState !== "warn" && sizeState !== "over") return;
    autoSortedRef.current = true;
    setSortMode((current) => {
      if (current !== "name") return current;
      toast.message("Sorted by size to help you find what to prune");
      return "size";
    });
  }, [sizeState]);

  // Walks a FileList and uploads each entry sequentially. Sequential
  // (not Promise.all) so the API server's 30MB body cap isn't blown by
  // four 9MB images racing in parallel, and so a single failure leaves
  // the rest of the queue intact.
  const handleUploads = async (list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list);
    if (arr.length === 0) return;
    setUploadError(null);
    const perFileLimitMb = Math.floor(perFileLimitBytes / (1024 * 1024));
    for (const file of arr) {
      // Pre-flight against the server's per-file cap so we fail fast
      // with a friendly message instead of round-tripping a multi-MB
      // base64 body just to be rejected with 413.
      if (file.size > perFileLimitBytes) {
        setUploadError(
          `${file.name}: File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Limit is ${perFileLimitMb}MB.`,
        );
        break;
      }
      try {
        await uploadFile.mutateAsync({ file });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Upload failed";
        setUploadError(`${file.name}: ${msg}`);
        // Stop the queue on the first failure so the user can react
        // (e.g. shrink the file) before retrying the rest.
        break;
      }
    }
  };

  const handleDelete = async (path: string) => {
    if (!confirm(`Delete ${path}?`)) return;
    try {
      await deleteFile.mutateAsync(path);
      // If the user just deleted the file they were viewing, fall back
      // to the next available file (or empty).
      if (path === activeFile) {
        const next = files.find((f) => f.path !== path);
        setActiveFile(next?.path ?? "");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setUploadError(msg);
    }
  };

  // Pick a sensible default file the moment the project actually has files.
  useEffect(() => {
    if (tree.length === 0) return;
    if (tree.some((t) => t.path === activeFile)) return;
    const indexHtml = tree.find((t) => t.path === "index.html");
    setActiveFile((indexHtml ?? tree[0]).path);
    // We intentionally only react to file list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const { data: fileData, isLoading: codeLoading } = useProjectFile(
    username,
    slug,
    tree.some((t) => t.path === activeFile) ? activeFile : undefined,
  );

  // In "name" mode, keep the existing folder grouping. In "size" mode,
  // collapse everything into a single flat list sorted largest-first —
  // that puts the worst budget offender at row #1 regardless of which
  // folder it lives in, which is the whole point of the toggle.
  const grouped =
    sortMode === "size"
      ? { "": [...tree].sort((a, b) => b.sizeBytes - a.sizeBytes) }
      : tree.reduce<Record<string, typeof tree>>((acc, f) => {
          const k = f.group || "/";
          (acc[k] ||= []).push(f);
          return acc;
        }, {});
  const code =
    fileData?.content ??
    (codeLoading ? "// loading…" : tree.length === 0 ? "" : `// ${activeFile}\n`);
  const lines = code.split("\n");
  const ext = activeFile.split(".").pop() ?? "txt";
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const activeName = activeFile.split("/").pop() || "—";
  const activeMeta = tree.find((t) => t.path === activeFile);

  // Compact two-state segmented control rendered just under the Explorer
  // header on both desktop and mobile. Icon-only to fit the narrow
  // sidebar; tooltips spell out which mode is which.
  const SortToggle = (
    <div
      className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-surface shrink-0"
      role="group"
      aria-label="Sort files"
    >
      <span className="text-[10px] uppercase tracking-wider font-mono text-secondary/70 mr-1">
        Sort
      </span>
      <div className="inline-flex rounded border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setSortMode("name")}
          aria-pressed={sortMode === "name"}
          title="Sort by name (alphabetical, grouped by folder)"
          className={`inline-flex items-center gap-1 h-5 px-1.5 text-[10px] font-mono transition-colors ${
            sortMode === "name"
              ? "bg-primary/15 text-primary"
              : "text-secondary hover:text-foreground hover:bg-surface-raised"
          }`}
        >
          <ArrowDownAZ className="w-3 h-3" />
          Name
        </button>
        <button
          type="button"
          onClick={() => setSortMode("size")}
          aria-pressed={sortMode === "size"}
          title="Sort by size (largest first, flattened across folders)"
          className={`inline-flex items-center gap-1 h-5 px-1.5 text-[10px] font-mono border-l border-border transition-colors ${
            sortMode === "size"
              ? "bg-primary/15 text-primary"
              : "text-secondary hover:text-foreground hover:bg-surface-raised"
          }`}
        >
          <ArrowDown10 className="w-3 h-3" />
          Size
        </button>
      </div>
    </div>
  );

  const TreeBody = (
    <div className="p-2 space-y-3">
      {Object.entries(grouped).map(([group, files]) => (
        <div key={group}>
          {sortMode === "size" ? (
            // Flattened size view: a single "by size" caption replaces
            // per-folder headers so it's obvious why files from
            // different folders are now interleaved in one list.
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-mono text-secondary/70 truncate">
              by size · largest first
            </div>
          ) : (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-mono text-secondary/70 truncate">
              {group || "root"}
            </div>
          )}
          {files.map((f) => {
            const name = f.path.split("/").pop()!;
            const active = activeFile === f.path;
            const isBinary = f.encoding === "base64";
            const isImage = isBinary && (f.contentType ?? "").startsWith("image/");
            const Icon = isImage ? ImageIcon : FileCode2;
            return (
              <div
                key={f.path}
                className={`group flex items-stretch rounded ${
                  active ? "bg-primary/15" : "hover:bg-surface-raised"
                }`}
              >
                <button
                  onClick={() => {
                    setActiveFile(f.path);
                    setMobileTreeOpen(false);
                  }}
                  className={`flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-left transition-colors ${
                    active
                      ? "text-primary"
                      : "text-secondary group-hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1">{name}</span>
                  {/* Per-file size makes "what's eating my budget?"
                      a one-glance answer when the project size
                      gauge goes amber. Always rendered (including
                      the active row) so the column lines up
                      visually across the whole tree. */}
                  <span className="text-[9px] font-mono text-secondary/60 shrink-0">
                    {f.size}
                  </span>
                  {isBinary && (
                    <span className="text-[9px] font-mono px-1 rounded bg-surface text-secondary">
                      bin
                    </span>
                  )}
                </button>
                {isBinary && (
                  // Delete affordance only for user-uploaded assets —
                  // AI-generated source files get rewritten on the next
                  // build anyway, so a delete button there would just
                  // be confusing.
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(f.path);
                    }}
                    title="Delete file"
                    aria-label={`Delete ${f.path}`}
                    className="px-1.5 opacity-0 group-hover:opacity-100 text-secondary hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="absolute inset-0 flex bg-background">
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        // Match the server's MAX_UPLOAD_BYTES — common image and font
        // formats that cover ~99% of the use case (logos, photos,
        // favicons, brand fonts). Users can still pick anything via
        // the OS dialog if the browser ignores `accept`; the server
        // validates regardless.
        accept="image/*,font/*,.woff,.woff2,.ttf,.otf,.eot,.ico,.svg"
        className="hidden"
        onChange={(e) => {
          void handleUploads(e.target.files);
          if (uploadInputRef.current) uploadInputRef.current.value = "";
        }}
      />
      <div className="hidden md:flex w-64 border-r border-border bg-surface shrink-0 flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2 shrink-0">
          <div className="text-[10px] uppercase tracking-wider font-mono text-secondary">
            Explorer
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-secondary">
              {tree.length} files
            </span>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploadFile.isPending}
              title="Upload an image, font, or favicon"
              className="inline-flex items-center gap-1 h-6 px-2 rounded text-[10px] font-mono text-secondary hover:text-foreground hover:bg-surface-raised border border-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-3 h-3" />
              {uploadFile.isPending ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
        {SortToggle}
        {uploadError && (
          <div className="mx-2 my-1 px-2 py-1.5 rounded text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 break-words shrink-0">
            {uploadError}
          </div>
        )}
        {/* Tree + gauge: tree scrolls, gauge stays pinned to the
            sidebar bottom so the size warning is always visible
            even when the file list is long. */}
        <div className="flex-1 overflow-y-auto min-h-0">{TreeBody}</div>
        <ProjectSizeGauge
          totalBytes={totalBytes}
          pct={sizePct}
          state={sizeState}
          limitBytes={publishLimitBytes}
        />
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
              <div className="absolute left-2 right-2 top-full mt-1 z-30 rounded-lg border border-border bg-surface shadow-2xl max-h-[60vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface shrink-0">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-secondary">
                    Explorer
                  </div>
                  <span className="text-[10px] font-mono text-secondary">
                    {tree.length} files
                  </span>
                </div>
                {SortToggle}
                <div className="flex-1 overflow-y-auto min-h-0">{TreeBody}</div>
                {/* Mobile gauge mirrors the desktop one so users on
                    small screens get the same publish-size warning. */}
                <ProjectSizeGauge
                  totalBytes={totalBytes}
                  pct={sizePct}
                  state={sizeState}
                  limitBytes={publishLimitBytes}
                />
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
            {fileData?.encoding === "base64"
              ? `${fileData.contentType ?? "binary"} · ${activeMeta?.size ?? ""}`
              : `UTF-8 · LF · ${ext.toUpperCase()}`}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-background">
          {fileData?.encoding === "base64" ? (
            // Binary asset preview. We render an <img> for image MIMEs
            // (cheap, accurate, lets the user verify the upload actually
            // worked) and a generic placeholder for everything else
            // (fonts, audio, etc.) so the editor doesn't try to dump
            // base64 garbage into a <pre>.
            <BinaryFilePreview
              path={activeFile}
              base64={fileData.content}
              contentType={fileData.contentType}
              sizeLabel={activeMeta?.size ?? ""}
            />
          ) : (
            <div className="grid grid-cols-[3.25rem_1fr] font-mono text-xs leading-6">
              <div className="text-right pr-3 py-3 select-none text-secondary/60 border-r border-border bg-surface/40">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="py-3 px-4 text-foreground whitespace-pre overflow-x-auto">{code}</pre>
            </div>
          )}
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

// Renders a friendly preview for a binary project file. Image MIMEs get
// an actual <img> via a `data:` URL so the user can verify what they
// just uploaded; everything else gets a placeholder card with the file
// name, content type, and size.
function BinaryFilePreview({
  path,
  base64,
  contentType,
  sizeLabel,
}: {
  path: string;
  base64: string;
  contentType: string | null;
  sizeLabel: string;
}) {
  const mime = contentType ?? "application/octet-stream";
  const isImage = mime.startsWith("image/");
  const dataUrl = `data:${mime};base64,${base64}`;
  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-border bg-surface p-5 flex flex-col items-center gap-4 text-center">
        {isImage ? (
          <img
            src={dataUrl}
            alt={path}
            className="max-w-full max-h-[40vh] rounded border border-border bg-background"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center">
            <ImageIcon className="w-7 h-7 text-secondary" />
          </div>
        )}
        <div className="min-w-0 w-full">
          <div className="font-mono text-xs truncate text-foreground">{path}</div>
          <div className="text-[11px] text-secondary mt-1">
            {mime} · {sizeLabel || "binary"}
          </div>
        </div>
        {!isImage && (
          <div className="text-[11px] text-secondary leading-snug">
            This file ships with the published site but can't be shown
            inline here.
          </div>
        )}
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
      <div className="w-full px-5 md:px-8 lg:px-10 xl:px-12 py-6 md:py-8 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-7 pb-5 border-b border-border">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-[26px] font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-secondary mt-1.5 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap">{actions}</div>
          )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
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

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!t) return "—";
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ----------------------------------------------------------------------
// Inline chat bubble that renders when the AI requested a secret value
// via `<deploybro:request-secret name="…" label="…" description="…" />`.
// The user pastes the value into a masked input; submit PUTs it to the
// project's /env-vars endpoint (encrypted at rest) and the bubble fades
// out. The AI never sees the raw value — on its next turn it can read
// the env-vars list (which masks secrets) to know the key is set.
// ----------------------------------------------------------------------
function SecretRequestBubble({
  request,
  username,
  slug,
  onResolved,
  onOpenEnvTab,
}: {
  request: { name: string; label: string; description: string | null };
  username: string;
  slug: string;
  onResolved: () => void;
  onOpenEnvTab: () => void;
}) {
  const upsert = useUpsertProjectEnvVar(username, slug);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const submit = async () => {
    const v = value.trim();
    if (v.length === 0 || upsert.isPending) return;
    try {
      await upsert.mutateAsync({
        key: request.name,
        value: v,
        isSecret: true,
        description:
          request.description ?? `Provided via chat for ${request.label}`,
      });
      toast.success(`${request.label} saved`);
      onResolved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="truncate">{request.label}</span>
        <span className="font-mono text-[11px] text-secondary truncate">
          {request.name}
        </span>
      </div>
      {request.description && (
        <div className="text-xs text-secondary leading-relaxed">
          {request.description}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Paste value…"
            autoComplete="off"
            spellCheck={false}
            className="pr-9 font-mono text-sm h-9"
            disabled={upsert.isPending}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
            tabIndex={-1}
            aria-label={show ? "Hide value" : "Show value"}
          >
            {show ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        <Button
          size="sm"
          onClick={submit}
          disabled={upsert.isPending || value.trim().length === 0}
          className="h-9"
        >
          {upsert.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onResolved}
          disabled={upsert.isPending}
          className="h-9"
        >
          Skip
        </Button>
      </div>
      <button
        type="button"
        onClick={onOpenEnvTab}
        className="text-[11px] text-secondary hover:text-foreground transition-colors text-left"
      >
        Stored encrypted. Available on your next publish. Manage in Env Vars →
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------
// Project env vars tab. Lists, edits, and deletes per-project env vars.
// Secret values are masked in the listing — a "Reveal" action calls a
// one-shot endpoint that returns the plaintext. New rows can be added
// from the "Add variable" form at the top.
// ----------------------------------------------------------------------
function EnvVarsView() {
  const params = useParams();
  const { username, slug } = params;
  const listQuery = useProjectEnvVars(username, slug);
  const upsert = useUpsertProjectEnvVar(username, slug);
  const removeVar = useDeleteProjectEnvVar(username, slug);
  const reveal = useRevealProjectEnvVar(username, slug);

  const rows = listQuery.data ?? [];
  const loading = listQuery.isLoading;
  const error = listQuery.error instanceof Error ? listQuery.error.message : null;

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newIsSecret, setNewIsSecret] = useState(true);
  const [newDescription, setNewDescription] = useState("");
  const [showNew, setShowNew] = useState(false);
  // Per-row reveal cache: when the user clicks "Show" we fetch the
  // plaintext once and keep it in component state until they click
  // "Hide". Cleared if they leave the tab (component unmount).
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const submitNew = async () => {
    const k = newKey.trim().toUpperCase();
    const v = newValue.trim();
    if (k.length === 0 || v.length === 0 || upsert.isPending) return;
    try {
      await upsert.mutateAsync({
        key: k,
        value: v,
        isSecret: newIsSecret,
        description: newDescription.trim() || null,
      });
      toast.success(`${k} saved`);
      setNewKey("");
      setNewValue("");
      setNewDescription("");
      setShowNew(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const handleReveal = async (key: string) => {
    if (revealed[key]) {
      // Toggle hide.
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    try {
      const r = await reveal.mutateAsync(key);
      setRevealed((prev) => ({ ...prev, [key]: r.value }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reveal value");
    }
  };

  const handleDelete = async (key: string) => {
    if (
      !window.confirm(
        `Delete ${key}? This won't remove it from already-deployed sites until your next publish.`,
      )
    ) {
      return;
    }
    try {
      await removeVar.mutateAsync(key);
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success(`${key} deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  };

  return (
    <PaneShell
      title="Env Vars"
      subtitle="Per-project environment variables. Encrypted at rest. Pushed to Vercel as encrypted env vars on every publish."
    >
      {/* Add form */}
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Add a variable</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Key</Label>
            <Input
              value={newKey}
              onChange={(e) =>
                setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))
              }
              placeholder="STRIPE_SECRET_KEY"
              spellCheck={false}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="sk_live_…"
                autoComplete="off"
                spellCheck={false}
                className="pr-9 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
                tabIndex={-1}
                aria-label={showNew ? "Hide value" : "Show value"}
              >
                {showNew ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description (optional)</Label>
          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Where this value comes from, what it's for…"
            className="text-sm"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
            <Switch checked={newIsSecret} onCheckedChange={setNewIsSecret} />
            <span>Treat as secret (mask the value in the listing)</span>
          </label>
          <Button
            onClick={submitNew}
            disabled={
              upsert.isPending ||
              newKey.trim().length === 0 ||
              newValue.trim().length === 0
            }
            className="h-9"
          >
            {upsert.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving…
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add variable
              </>
            )}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            Variables{" "}
            <span className="text-secondary font-normal">({rows.length})</span>
          </h2>
          <button
            onClick={() => void listQuery.refetch()}
            disabled={listQuery.isFetching}
            className="text-xs text-secondary hover:text-foreground inline-flex items-center gap-1.5"
          >
            <RefreshCw
              className={`w-3 h-3 ${listQuery.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
        {loading && rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center text-sm text-secondary flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center text-sm text-secondary">
            No env vars yet. Add one above, or the AI will ask for any it
            needs while building.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {rows.map((row) => {
              const shown = revealed[row.key];
              const display = shown ?? row.value;
              return (
                <div key={row.id} className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm font-medium truncate">
                      {row.key}
                    </span>
                    {row.isSecret && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                        <Lock className="w-2.5 h-2.5" /> SECRET
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      {row.isSecret && (
                        <button
                          onClick={() => handleReveal(row.key)}
                          disabled={reveal.isPending}
                          className="text-xs text-secondary hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-raised transition-colors"
                        >
                          {shown ? (
                            <>
                              <EyeOff className="w-3 h-3" /> Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" /> Show
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(row.key)}
                        disabled={removeVar.isPending}
                        className="text-xs text-secondary hover:text-destructive inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-raised transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-foreground break-all bg-surface-raised rounded px-2 py-1.5">
                    {display}
                  </div>
                  {row.description && (
                    <div className="text-xs text-secondary">
                      {row.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PaneShell>
  );
}

function DatabaseView() {
  const params = useParams();
  const { username, slug } = params;
  const infoQuery = useProjectDbInfo(username, slug);
  const tablesQuery = useProjectDbTables(username, slug);
  const provision = useProvisionProjectDb(username, slug);

  const info = infoQuery.data;
  const tablesPayload = tablesQuery.data;
  const tables = tablesPayload?.tables ?? null;

  const provisioned = info?.provisioned === true;
  const initialLoading = infoQuery.isLoading || tablesQuery.isLoading;
  const loading = infoQuery.isFetching || tablesQuery.isFetching;
  const error =
    (infoQuery.error instanceof Error ? infoQuery.error.message : null) ??
    (tablesQuery.error instanceof Error ? tablesQuery.error.message : null);

  const reload = () => {
    void infoQuery.refetch();
    void tablesQuery.refetch();
  };

  const handleCreate = async () => {
    if (provision.isPending) return;
    try {
      await provision.mutateAsync();
      toast.success("Database created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create database");
    }
  };

  const copyConnString = async () => {
    if (!provisioned) return;
    try {
      await navigator.clipboard.writeText(info.connectionString);
      toast.success("Masked URL copied (real password is in your secrets)");
    } catch {
      toast.error("Could not copy");
    }
  };

  const totalRows = tables?.reduce((s, t) => s + t.rows, 0) ?? 0;
  const publicTables = tables?.filter((t) => t.schema === "public") ?? [];

  // ---- Loading shell while we figure out provisioning state ----
  if (initialLoading && !info) {
    return (
      <PaneShell
        title="Database"
        subtitle="Checking your project database…"
      >
        <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center text-sm text-secondary flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </PaneShell>
    );
  }

  // ---- Empty state: no DB yet, prompt user to opt in ----
  if (info && info.provisioned === false) {
    return (
      <PaneShell
        title="Database"
        subtitle="Each project gets its own isolated Postgres database when you turn one on."
      >
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <div className="text-base font-medium">No database yet</div>
            <div className="text-sm text-secondary">
              Spin up a dedicated Postgres database for this project. We'll
              provision it on Neon and wire <span className="font-mono">DATABASE_URL</span>
              {" "}into your next deploy automatically.
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={provision.isPending}
            className="h-10 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {provision.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Create database
              </>
            )}
          </Button>
        </div>
      </PaneShell>
    );
  }

  // ---- Provisioned: show the project's own DB ----
  return (
    <PaneShell
      title="Database"
      subtitle={
        provisioned
          ? `Your project's Neon database · ${info.database}${info.host ? ` · ${info.host}` : ""}`
          : "Connecting to your Postgres database…"
      }
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            className="border-border h-8"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </>
      }
    >
      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Could not reach the database</div>
            <div className="text-xs mt-0.5 opacity-80 font-mono">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Tables" value={tables ? `${tables.length}` : "—"} />
        <KpiCard
          label="Total Rows"
          value={tables ? totalRows.toLocaleString() : "—"}
        />
        <KpiCard label="Storage" value={provisioned ? info.size || "—" : "—"} />
        <KpiCard label="Provider" value={provisioned ? "Neon" : "—"} />
      </div>

      <div>
        <SectionHeader
          title="Connection"
          hint={
            provisioned
              ? `Connected · ${info.version?.split(" ").slice(0, 2).join(" ") ?? "PostgreSQL"}`
              : "Looking up host…"
          }
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 font-mono text-xs text-secondary truncate">
            {provisioned ? info.connectionString : "Loading…"}
          </div>
          <Button
            variant="outline"
            onClick={copyConnString}
            className="border-border h-10"
            disabled={!provisioned}
          >
            <Copy className="w-4 h-4 mr-2" /> Copy
          </Button>
        </div>
      </div>

      <div>
        <SectionHeader
          title="Tables"
          hint={
            tables
              ? `${tables.length} tables across ${new Set(tables.map((t) => t.schema)).size} schemas · ${publicTables.length} in public`
              : "Loading tables…"
          }
        />
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-surface-raised text-[10px] uppercase tracking-wider font-mono text-secondary">
            <div>Table</div>
            <div className="text-right">Rows</div>
            <div className="text-right">Size</div>
            <div className="text-right hidden sm:block">Updated</div>
          </div>

          {loading && !tables && (
            <div className="px-6 py-10 text-center text-sm text-secondary bg-surface flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading tables…
            </div>
          )}

          {tables &&
            tables.map((t, i, arr) => (
              <div
                key={`${t.schema}.${t.name}`}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-3 bg-surface hover:bg-surface-raised transition-colors cursor-pointer ${
                  i < arr.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-4 h-4 text-secondary shrink-0" />
                  <span className="font-mono text-sm truncate">{t.name}</span>
                  {t.schema !== "public" && (
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-raised text-secondary shrink-0">
                      {t.schema}
                    </span>
                  )}
                </div>
                <span className="text-xs text-foreground font-mono text-right">
                  {t.rows.toLocaleString()}
                  {!t.exact && <span className="text-secondary">~</span>}
                </span>
                <span className="text-xs text-secondary font-mono text-right">
                  {t.size}
                </span>
                <span className="text-xs text-secondary font-mono text-right hidden sm:block">
                  {relativeTime(t.lastChange)}
                </span>
              </div>
            ))}

          {tables && tables.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-secondary bg-surface">
              No tables yet. Create one and refresh.
            </div>
          )}
        </div>
      </div>
    </PaneShell>
  );
}

/* ------------------------------- Payments ------------------------------- */

function PaymentsView() {
  const payments = [
    { who: "alex@startup.io", amount: "$29.00", when: "2 min ago", ok: true, plan: "Pro" },
    { who: "sara@design.co", amount: "$29.00", when: "14 min ago", ok: true, plan: "Pro" },
    { who: "mike@founder.dev", amount: "$99.00", when: "1 hr ago", ok: true, plan: "Team" },
    { who: "lily@indie.com", amount: "$29.00", when: "3 hrs ago", ok: false, plan: "Pro" },
    { who: "raj@studio.io", amount: "$9.00", when: "5 hrs ago", ok: true, plan: "Hobby" },
    { who: "noah@labs.dev", amount: "$99.00", when: "1 day ago", ok: true, plan: "Team" },
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
        <KpiCard label="MRR" value="$1,284" delta="+12%" positive />
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

// Ordered pipeline phases used to draw the progress bar inside the
// in-flight deployment card. Kept in sync with `deploymentStepLabel` in
// `lib/api.ts` — if a phase is added there, mirror it here so the bar
// fills smoothly across the full lifecycle instead of jumping.
const DEPLOY_STEP_ORDER: ApiDeployment["status"][] = [
  "queued",
  "validating",
  "provisioning_db",
  "creating_project",
  "deploying",
  "polling",
  "live",
];

function DeploymentStatusCard({
  deployment,
  primaryCustomDomain,
}: {
  deployment: ApiDeployment | null;
  primaryCustomDomain: string | null;
}) {
  // Empty state — no deployments yet. We replace the previous amber
  // "publish first" banner with a more inviting card so the Domains
  // pane has a clear top-of-page anchor regardless of state.
  if (!deployment) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Not published yet</div>
          <div className="text-[12px] text-secondary mt-0.5">
            Publish your app from the toolbar to get a live URL. After that
            you can attach a custom domain below.
          </div>
        </div>
      </div>
    );
  }

  const isLive = deployment.status === "live";
  const isFailed = deployment.status === "failed";
  const isInflight = !isLive && !isFailed;

  // 0..1 progress through the pipeline phases. We snap `failed` and any
  // unknown phase to a sensible default so the bar still renders.
  const stepIndex = DEPLOY_STEP_ORDER.indexOf(deployment.status);
  const pct =
    stepIndex >= 0
      ? (stepIndex / (DEPLOY_STEP_ORDER.length - 1)) * 100
      : isFailed
      ? 100
      : 0;

  const accent = isLive
    ? "bg-success/10 text-success"
    : isFailed
    ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";

  const Icon = isLive ? Check : isFailed ? AlertCircle : Loader2;
  const headline = isLive
    ? "Live"
    : isFailed
    ? "Last deploy failed"
    : "Deploying your app";

  // Prefer the user's verified custom domain over the auto-generated
  // *.vercel.app URL when both are available — that's the URL the user
  // actually wants to share once they've connected one.
  const displayUrl = isLive
    ? primaryCustomDomain
      ? `https://${primaryCustomDomain}`
      : deployment.liveUrl
    : null;

  const finished = deployment.finishedAt ?? null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}
        >
          <Icon
            className={`w-5 h-5 ${isInflight ? "animate-spin" : ""}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{headline}</span>
            <span
              className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full ${accent}`}
            >
              {deploymentStepLabel(deployment.status)}
            </span>
            {finished && (
              <span className="text-[11px] text-secondary font-mono">
                {timeAgo(finished)}
              </span>
            )}
          </div>

          {isLive && !displayUrl && (
            <div className="text-[12px] text-secondary mt-1.5">
              Live URL isn't available yet — refresh in a moment.
            </div>
          )}

          {isLive && displayUrl && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:underline truncate max-w-full"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {displayUrl.replace(/^https?:\/\//, "")}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-secondary hover:text-text px-2 py-1 rounded hover:bg-background"
                onClick={() => {
                  void navigator.clipboard.writeText(displayUrl);
                  toast.success("Copied URL");
                }}
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
          )}

          {isInflight && (
            <>
              <div className="text-[12px] text-secondary mt-1">
                Hold tight — this usually takes 30–90 seconds. The card
                updates as each step completes.
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-background overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(8, pct)}%` }}
                />
              </div>
            </>
          )}

          {isFailed && (
            <>
              <div className="text-[12px] text-destructive mt-1.5 break-words">
                {deployment.errorMessage ??
                  "Something went wrong. Use the Publish button in the toolbar to try again."}
              </div>
              <div className="text-[11px] text-secondary mt-1">
                Tap <span className="font-medium text-text">Republish</span> in
                the toolbar to retry.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DomainsView() {
  const params = useParams();
  const { username, slug } = params;
  const { data: project } = useProject(username, slug);
  const { data: publishStatus } = usePublishStatus(username, slug);
  const { data: domains = [], isLoading } = useProjectDomains(username, slug);
  const { data: deployments = [] } = useDeployments(username, slug);
  // Watch the latest in-flight (or most recent) deployment so the status
  // card at the top of this pane updates in real time as the pipeline
  // progresses, without depending on the navbar's local state.
  const latestDeployment = deployments[0];
  const inflightId =
    latestDeployment &&
    !TERMINAL_DEPLOYMENT_STATUSES.has(latestDeployment.status)
      ? latestDeployment.id
      : null;
  const { data: liveStatusDeployment } = useDeploymentStatus(
    username,
    slug,
    inflightId,
  );
  const currentDeployment = liveStatusDeployment ?? latestDeployment ?? null;
  const addMutation = useAddDomain(username, slug);
  const removeMutation = useRemoveDomain(username, slug);
  const verifyMutation = useVerifyDomain(username, slug);
  const setPrimaryMutation = useSetPrimaryDomain(username, slug);

  const [newDomain, setNewDomain] = useState("");

  // The auto-generated `*.vercel.app` URL is always there once published —
  // we surface it in the list as a read-only entry so the user knows what
  // their app is reachable on while DNS for a custom domain settles.
  const defaultHost = publishStatus?.liveUrl
    ? publishStatus.liveUrl.replace(/^https?:\/\//, "")
    : null;

  const isPublished =
    !!project && publishStatus?.publishStatus === "live" && !!defaultHost;

  const onAdd = async () => {
    const host = newDomain.trim();
    if (!host) return;
    try {
      const created = await addMutation.mutateAsync(host);
      setNewDomain("");
      if (created.verified) {
        toast.success(`${created.host} is live`);
      } else {
        toast.success(`Added ${created.host} · update DNS to verify`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        toast.error("Custom domains are a Pro plan feature", {
          description: "Upgrade to connect your own domain.",
          action: {
            label: "Upgrade",
            onClick: () => {
              window.location.href = "/dashboard/billing";
            },
          },
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Could not add domain");
      }
    }
  };

  const onRemove = async (host: string) => {
    try {
      await removeMutation.mutateAsync(host);
      toast.message(`Removed ${host}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    }
  };

  const onVerify = async (host: string) => {
    try {
      const result = await verifyMutation.mutateAsync(host);
      if (result.verified) {
        toast.success(`${host} verified`);
      } else if (result.misconfigured) {
        toast.warning(`${host} — DNS doesn't point to us yet`);
      } else {
        toast.message(`Still waiting on DNS for ${host}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verify failed");
    }
  };

  const onSetPrimary = async (host: string) => {
    try {
      await setPrimaryMutation.mutateAsync(host);
      toast.success(`${host} is now the primary domain`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set primary");
    }
  };

  const verifiedCount = domains.filter((d) => d.verified).length;
  const pendingCount = domains.length - verifiedCount;

  return (
    <PaneShell
      title="Domains"
      subtitle="Connect a custom domain. We provision SSL automatically once DNS resolves."
    >
      <DeploymentStatusCard
        deployment={currentDeployment}
        primaryCustomDomain={publishStatus?.primaryCustomDomain ?? null}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Custom domains" value={`${domains.length}`} />
        <KpiCard label="Active" value={`${verifiedCount}`} />
        <KpiCard label="Pending DNS" value={`${pendingCount}`} />
        <KpiCard label="SSL renewals" value="Auto" />
      </div>

      <div>
        <SectionHeader
          title="Add a custom domain"
          hint="We'll show you the exact DNS record to add at your registrar."
        />
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !addMutation.isPending) onAdd();
              }}
              placeholder="app.example.com"
              className="bg-background border-border font-mono"
              disabled={!isPublished || addMutation.isPending}
            />
            <Button
              onClick={onAdd}
              disabled={
                !newDomain.trim() || !isPublished || addMutation.isPending
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1.5" />
              )}{" "}
              Add domain
            </Button>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader
          title="Connected domains"
          hint="The primary domain receives all traffic."
        />
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Built-in deploybro / vercel.app host — always present once
              published. Cannot be removed or made non-primary; just shown
              here so users have full visibility of what's serving traffic. */}
          {defaultHost && (
            <DefaultHostRow
              host={defaultHost}
              hasCustomPrimary={!!publishStatus?.primaryCustomDomain}
            />
          )}
          {domains.map((d, i, arr) => {
            const last = i === arr.length - 1 && !defaultHost;
            const status: DomainStatus = d.verified
              ? d.misconfigured
                ? "error"
                : "active"
              : "pending";
            return (
              <div
                key={d.host}
                className={`flex flex-col gap-3 px-4 py-4 bg-surface ${
                  last ? "" : "border-b border-border"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Globe className="w-4 h-4 text-secondary shrink-0" />
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm">{d.host}</span>
                      {d.isPrimary && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-secondary font-mono mt-0.5">
                      Added {timeAgo(d.createdAt)}
                      {d.lastCheckedAt && (
                        <>
                          {" · checked "}
                          {timeAgo(d.lastCheckedAt)}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <DomainStatusBadge status={status} />
                    {d.verified ? (
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
                    {!d.verified && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border h-7 text-xs"
                        onClick={() => onVerify(d.host)}
                        disabled={verifyMutation.isPending}
                      >
                        {verifyMutation.isPending ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3 mr-1" />
                        )}
                        Refresh
                      </Button>
                    )}
                    {d.verified && !d.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border h-7 text-xs"
                        onClick={() => onSetPrimary(d.host)}
                        disabled={setPrimaryMutation.isPending}
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
                    <button
                      onClick={() => onRemove(d.host)}
                      disabled={removeMutation.isPending}
                      className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* When Vercel can see DNS but it's pointing somewhere
                    else, surface the explicit "your CNAME points at X,
                    expected Y" hint. This is the most common cause of
                    a stuck domain and the actionable info the user
                    needs to fix their registrar — far more useful than
                    a generic "Misconfigured" badge. */}
                {d.dnsMismatch && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          Your {d.dnsMismatch.recordType} record is
                          pointing somewhere unexpected
                        </div>
                        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] text-foreground">
                          <div>
                            <span className="text-secondary uppercase tracking-wide text-[9px] mr-1.5">
                              We see
                            </span>
                            {d.dnsMismatch.actual.map((v, i) => (
                              <span key={i} className="break-all">
                                {v}
                                {i < d.dnsMismatch!.actual.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                          <div>
                            <span className="text-secondary uppercase tracking-wide text-[9px] mr-1.5">
                              Expected
                            </span>
                            <span className="break-all">{d.dnsMismatch.expected}</span>
                          </div>
                        </div>
                        <div className="mt-1.5 text-secondary text-[11px]">
                          Update the {d.dnsMismatch.recordType} record at
                          your registrar to point at{" "}
                          <span className="font-mono">{d.dnsMismatch.expected}</span>.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* DNS instructions: show until the domain is verified.
                    Combine the suggested CNAME/A record with any TXT
                    verification challenges Vercel has issued so the user
                    sees everything they need in one place. */}
                {!d.verified && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {d.suggestedRecords.map((r, idx) => (
                      <DnsRow
                        key={`s-${idx}`}
                        type={r.type}
                        name={r.name}
                        value={r.value}
                      />
                    ))}
                    {d.verificationRecords.map((r, idx) => (
                      <DnsRow
                        key={`v-${idx}`}
                        type={r.type}
                        name={r.domain}
                        value={r.value}
                      />
                    ))}
                  </div>
                )}

                {/* Verified-but-misconfigured edge case: ownership is
                    proven (TXT verification passed) but the live DNS
                    no longer points at us — usually because the user
                    changed it after verifying. Show the same mismatch
                    block above; here we add a fallback "current DNS"
                    line for cases where we have values but no clean
                    mismatch (e.g. multiple A records, partial match). */}
                {d.verified &&
                  d.misconfigured &&
                  !d.dnsMismatch &&
                  ((d.aValues && d.aValues.length > 0) ||
                    (d.cnames && d.cnames.length > 0)) && (
                    <div className="text-[11px] font-mono text-secondary mt-1">
                      Current DNS:{" "}
                      {d.cnames && d.cnames.length > 0
                        ? `CNAME ${d.cnames.join(", ")}`
                        : `A ${d.aValues!.join(", ")}`}
                    </div>
                  )}
              </div>
            );
          })}
          {domains.length === 0 && !isLoading && (
            <div
              className={`px-6 py-10 text-center text-sm text-secondary bg-surface ${
                defaultHost ? "border-t border-border" : ""
              }`}
            >
              No custom domains yet.
            </div>
          )}
          {isLoading && (
            <div className="px-6 py-10 text-center text-sm text-secondary bg-surface">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading…
            </div>
          )}
        </div>
      </div>
    </PaneShell>
  );
}

function DefaultHostRow({
  host,
  hasCustomPrimary,
}: {
  host: string;
  hasCustomPrimary: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-4 bg-surface border-b border-border">
      <Globe className="w-4 h-4 text-secondary shrink-0" />
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm">{host}</span>
          {!hasCustomPrimary && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary">
              Primary
            </span>
          )}
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-secondary">
            Built-in
          </span>
        </div>
        <div className="text-[11px] text-secondary font-mono mt-0.5">
          Auto-generated when you publish
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-success/10 text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success" /> Active
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2 py-1 rounded bg-success/10 text-success">
          <ShieldCheck className="w-3 h-3" /> SSL
        </span>
      </div>
      <a
        href={`https://${host}`}
        target="_blank"
        rel="noreferrer"
        className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-foreground hover:bg-surface-raised"
        title="Open"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
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
      <AlertCircle className="w-3 h-3" /> Misconfigured
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
        <span className="font-mono truncate" title={name}>{name}</span>
        <span className="text-secondary">Value</span>
        <span className="font-mono truncate" title={value}>{value}</span>
      </div>
    </div>
  );
}

function HistoryPane({
  openBuildId,
  setOpenBuildId,
  builds,
  deployments,
  onRetryPublish,
  publishBusy,
}: {
  openBuildId: string | null;
  setOpenBuildId: (id: string | null) => void;
  builds: PastBuild[];
  deployments: ApiDeployment[];
  onRetryPublish: () => void;
  publishBusy: boolean;
}) {
  const totalCost = builds.reduce((s, b) => s + b.cost, 0);
  const totalFiles = builds.reduce((s, b) => s + b.filesChanged, 0);
  const totalTime = builds.reduce((s, b) => s + b.durationSec, 0);
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
        <KpiCard label="Builds" value={`${builds.length}`} />
        <KpiCard label="Total spent" value={`$${totalCost.toFixed(2)}`} />
        <KpiCard label="Files changed" value={`${totalFiles}`} />
        <KpiCard label="Total time" value={fmtTime(totalTime)} />
      </div>

      {deployments.length > 0 && (
        <div>
          <SectionHeader title="Deployments" hint="Newest first" />
          <div className="space-y-2">
            {deployments.map((d) => {
              const isLive = d.status === "live";
              const isFailed = d.status === "failed";
              const isInflight = !isLive && !isFailed;
              const badgeClass = isLive
                ? "bg-success/15 text-success"
                : isFailed
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/15 text-primary";
              const created = new Date(d.createdAt);
              return (
                <div
                  key={d.id}
                  className="border border-border bg-surface rounded-xl p-4 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${badgeClass}`}
                      >
                        {isInflight && <Loader2 className="w-3 h-3 animate-spin" />}
                        {deploymentStepLabel(d.status)}
                      </span>
                      <span className="text-[11px] text-secondary font-mono">
                        {created.toLocaleString()}
                      </span>
                    </div>
                    {d.liveUrl ? (
                      <a
                        href={d.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-primary hover:underline truncate block max-w-full"
                      >
                        {d.liveUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-sm text-secondary">
                        {isInflight ? "In progress…" : "No URL yet"}
                      </span>
                    )}
                    {isFailed && d.errorMessage && (
                      <div className="text-[12px] text-destructive mt-1.5 break-words">
                        {d.errorMessage}
                      </div>
                    )}
                  </div>
                  {isFailed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border shrink-0"
                      onClick={onRetryPublish}
                      disabled={publishBusy}
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                      Retry
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="Build timeline" hint="Newest first" />
        <div className="space-y-2">
          {builds.map((b) => {
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
                        {b.ago} · {fmtTime(b.durationSec)} · ${b.cost.toFixed(2)} · {b.filesChanged} files
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
                      <div className="text-sm text-muted-foreground leading-relaxed break-words">
                        <FileNoticeText text={b.aiMessage} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Stat label="Model" value={b.model} />
                      <Stat label="Cost" value={`$${b.cost.toFixed(2)}`} />
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

// Owner-editable per-project public listing fields. Renaming + slug
// changes still go through the dedicated rename mutation elsewhere; this
// pane edits the marketing surface (description, feature bullets, cover
// image) and the public visibility toggle.
function SettingsPane({
  username,
  slug,
  project,
}: {
  username: string | undefined;
  slug: string | undefined;
  project: ApiProject | undefined;
}) {
  const update = useUpdateProject(username, slug);
  const { data: publishStatus } = usePublishStatus(username, slug);
  const retriggerScreenshot = useRetriggerScreenshot(username, slug);
  const removeProject = useDeleteProject();
  const [, navigate] = useLocation();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteProject = async () => {
    if (!slug) return;
    try {
      await removeProject.mutateAsync(slug);
      toast.success("Project deleted");
      // Project no longer exists — bounce out of the builder before any
      // child queries can refire and 404.
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  // Local form state, seeded from server data once loaded. Stored as raw
  // strings (one feature per line) so the textarea behaves like a normal
  // multi-line input — split + filter on submit.
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // Cover image upload state — drag-and-drop / file-picker upload zone
  // pushes the file straight to object storage and writes the resulting
  // public URL into `coverImageUrl`. The user still has to click Save to
  // persist it on the project, which keeps the UX consistent with the
  // rest of this pane (every other field is pending until Save).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const liveUrl =
    publishStatus?.publishStatus === "live" ? publishStatus.liveUrl : null;

  const handleCoverUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, GIF, WebP).");
      return;
    }
    // 10MB ceiling — covers high-res screenshots without inviting abuse.
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Cover images must be smaller than 10 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const r = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not get upload URL");
      }
      const data = (await r.json()) as { uploadURL: string; objectPath: string };
      const put = await fetch(data.uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error("Upload failed");
      // Stamp the freshly-uploaded object with an ACL policy. Cover
      // images are public-by-design (they render on the public Explore
      // and Templates galleries) so we set visibility=public, with the
      // current user as the owner. Without this finalize step, the
      // server's /storage/objects/* route would 404 the URL — uploaded
      // objects are deny-listed until they're explicitly claimed.
      const finalize = await fetch("/api/storage/uploads/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectPath: data.objectPath,
          visibility: "public",
        }),
      });
      if (!finalize.ok) {
        const body = (await finalize.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Failed to finalize upload");
      }
      // `objectPath` already starts with `/objects/` — prepend the storage
      // mount path to get the URL the browser can render.
      setCoverImageUrl(`/api/storage${data.objectPath}`);
      toast.success("Cover image uploaded — click Save to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseLiveScreenshot = () => {
    if (!liveUrl) return;
    // mshots is WordPress.com's free public screenshot service. The image
    // refreshes from the live URL on demand, which is exactly what we want
    // for a "use a screenshot of my live site" cover — no caching layer to
    // bust when the project changes.
    const url = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(
      liveUrl,
    )}?w=1200&h=630`;
    setCoverImageUrl(url);
    toast.success("Live-site screenshot set — click Save to apply.");
  };

  // Re-seed when the project loads or when a save completes (the success
  // path re-fetches and we want any server-side normalisation — feature
  // trim, length cap — to flow back into the form).
  useEffect(() => {
    if (!project) return;
    setDescription(project.description ?? "");
    setFeaturesText((project.features ?? []).join("\n"));
    setCoverImageUrl(project.coverImageUrl ?? "");
    setIsPublic(project.isPublic);
  }, [project]);

  const dirty =
    !!project &&
    (description !== (project.description ?? "") ||
      featuresText !== (project.features ?? []).join("\n") ||
      coverImageUrl !== (project.coverImageUrl ?? "") ||
      isPublic !== project.isPublic);

  const onSave = () => {
    if (!project) return;
    const features = featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    update.mutate(
      {
        description,
        features,
        coverImageUrl: coverImageUrl.trim() || null,
        isPublic,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Save failed"),
      },
    );
  };

  return (
    <PaneShell
      title="Project settings"
      subtitle="Configure routing, visibility, and project metadata."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              value={project?.name ?? ""}
              readOnly
              className="bg-background border-border"
            />
            <span className="text-[11px] text-secondary">
              Renaming changes the URL slug — use the project actions menu in
              the dashboard to rename.
            </span>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={project?.slug ?? ""}
              readOnly
              className="bg-background border-border font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One-liner shown on Explore and your public profile."
              rows={2}
              maxLength={600}
              className="bg-background border-border resize-none"
            />
            <span className="text-[11px] text-secondary text-right font-mono">
              {description.length}/600
            </span>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="features">Features</Label>
            <Textarea
              id="features"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder={"One per line — these become bullets on your template card.\nLive collaboration\nDark mode\nStripe checkout"}
              rows={5}
              className="bg-background border-border font-mono text-sm"
            />
            <span className="text-[11px] text-secondary">
              Up to 12 bullets. Empty lines are ignored.
            </span>
          </div>
          <div className="grid gap-2">
            <Label>Cover image</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!isUploading) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (isUploading) return;
                const file = e.dataTransfer.files?.[0];
                if (file) void handleCoverUpload(file);
              }}
              onClick={() => {
                if (!isUploading) fileInputRef.current?.click();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isUploading) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`relative flex items-center gap-4 rounded-lg border border-dashed p-4 transition-colors cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/60"
              } ${isUploading ? "opacity-60 cursor-wait" : ""}`}
              data-testid="cover-image-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCoverUpload(file);
                  // Allow re-selecting the same file later.
                  e.target.value = "";
                }}
              />
              <div className="w-20 h-14 rounded-md overflow-hidden bg-surface-raised border border-border flex items-center justify-center shrink-0">
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-secondary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-secondary" />
                      Drop a screenshot here or click to upload
                    </>
                  )}
                </div>
                <p className="text-[11px] text-secondary mt-0.5">
                  PNG, JPG, GIF, or WebP — up to 10 MB. Used as the thumbnail
                  on Explore and Templates.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {liveUrl ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleUseLiveScreenshot}
                    disabled={isUploading}
                    className="h-7 text-xs"
                    data-testid="use-live-screenshot-button"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    Use a screenshot of my live site
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={retriggerScreenshot.isPending}
                    onClick={() =>
                      retriggerScreenshot.mutate(undefined, {
                        onSuccess: () =>
                          toast.success(
                            "Screenshot refreshed — Explore and homepage cards will update.",
                          ),
                        onError: (err) =>
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Screenshot capture failed",
                          ),
                      })
                    }
                    className="h-7 text-xs"
                    data-testid="refresh-screenshot-button"
                  >
                    {retriggerScreenshot.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Refresh screenshot
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowUrlInput((v) => !v)}
                className="h-7 text-xs text-secondary"
                data-testid="toggle-cover-url-input"
              >
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                {showUrlInput ? "Hide URL field" : "Or paste a URL"}
              </Button>
              {coverImageUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setCoverImageUrl("")}
                  disabled={isUploading}
                  className="h-7 text-xs text-secondary ml-auto"
                  data-testid="clear-cover-image"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
              ) : null}
            </div>

            {showUrlInput ? (
              <Input
                id="cover"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://…/cover.png"
                className="bg-background border-border font-mono mt-1"
                data-testid="cover-image-url-input"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="public" className="flex flex-col gap-1">
              <span>Public project</span>
              <span className="font-normal text-xs text-secondary">
                Allow others to view and clone.
              </span>
            </Label>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={onSave}
              disabled={!project || !dirty || update.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {update.isPending ? "Saving…" : "Save changes"}
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
                <span className="font-mono">
                  {project?.owner?.username ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Created</span>
                <span className="font-mono">
                  {project?.createdAt
                    ? new Date(project.createdAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Builds</span>
                <span className="font-mono">{project?.buildsCount ?? 0}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-secondary">Clones</span>
                <span className="font-mono">{project?.clones ?? 0}</span>
              </div>
              <div className="flex justify-between gap-3 items-center">
                <span className="text-secondary">Featured template</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                    project?.isFeaturedTemplate
                      ? "bg-primary/15 text-primary"
                      : "bg-surface-raised text-secondary"
                  }`}
                >
                  {project?.isFeaturedTemplate ? "Featured" : "Not featured"}
                </span>
              </div>
            </div>
            {!project?.isFeaturedTemplate && (
              <p className="text-[11px] text-secondary mt-3 leading-relaxed">
                Curated by the DeployBro team. Make a polished public project
                and we'll consider it.
              </p>
            )}
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
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={() => setDeleteOpen(true)}
          disabled={!slug || !project}
          data-testid="open-delete-project"
        >
          <Trash2 className="w-4 h-4 mr-2" /> Delete project
        </Button>
      </div>

      {project && slug && (
        <DeleteProjectDialog
          open={deleteOpen}
          onOpenChange={(o) => {
            if (!removeProject.isPending) setDeleteOpen(o);
          }}
          projectName={project.name}
          slug={slug}
          hasHosting
          hasDatabase
          isPending={removeProject.isPending}
          onConfirm={handleDeleteProject}
        />
      )}
    </PaneShell>
  );
}

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
  ChevronRight,
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
  Check,
  ArrowUp,
  Square,
  Paperclip,
  Image as ImageIcon,
  Link2,
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
  Upload,
  ArrowDownAZ,
  ArrowDown10,
  UploadCloud,
  Camera,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import {
  PlanSummary,
  type Plan as ApprovedPlan,
} from "@/components/plan-review";
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
// Four Claude-backed tiers under DeployBro branding. `key` maps to the
// backend model registry — `auto` is a sentinel that tells the server
// to pick the cheapest model that should be able to handle the request
// (scored from prompt length, attachments, plan flags). All tiers are
// available to every user; the per-token cost flows through the user's
// balance regardless of billing plan.
const AVAILABLE_MODELS: {
  name: string;
  provider: string;
  costRange: string;
  key: "auto" | "haiku" | "sonnet" | "opus";
  note: string;
}[] = [
  { name: "Auto Bro",    provider: "Picks the right model for the task", costRange: "Variable",         key: "auto",   note: "Recommended" },
  { name: "Economy Bro", provider: "Anthropic · Haiku 4.5",              costRange: "$0.005 - $0.025",  key: "haiku",  note: "Fast & cheap" },
  { name: "Smart Bro",   provider: "Anthropic · Sonnet 4.5",             costRange: "$0.012 - $0.06",   key: "sonnet", note: "Balanced" },
  { name: "Power Bro",   provider: "Anthropic · Opus",                   costRange: "$0.02 - $0.10",    key: "opus",   note: "Most capable" },
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
  domains: { label: "Publishing", icon: Rocket },
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
// file events are aggregated into a single inline collapsible row so the
// chat stays readable. In collapsed mode the row shows the
// currently-active file path and a running count. Expand to see every file.
// Also accepts the legacy server format `_(updated **path**)_` /
// `_(writing path…)_` so historical builds render with the new look too.
//
// `streaming` indicates this message is the live in-flight assistant
// response — when true, the last paragraph and any in-progress file
// label get the left-to-right shimmer treatment so the user can tell
// at a glance which line is "working" right now.
function FileNoticeText({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
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

  // Index of the last prose paragraph — used to apply the streaming
  // shimmer only to the in-flight tail, not the entire history.
  const lastProseIdx = proseBlocks.length - 1;

  return (
    <div className="space-y-2">
      {/* Prose paragraphs render as normal — the very last paragraph
          gets a left-to-right shimmer while the response is still
          streaming, so the user can see exactly which sentence is
          currently being written. */}
      {proseBlocks.map((b, i) => {
        const isTail = streaming && !pendingFile && i === lastProseIdx;
        return (
          <p
            key={i}
            className={`whitespace-pre-wrap leading-relaxed ${
              isTail ? "shimmer-text" : ""
            }`}
          >
            {b.text}
          </p>
        );
      })}

      {/* Inline collapsible file row — chevron + summary text on one
          line, no card chrome. Matches the "Explored N files" pattern
          from modern AI chat UIs (rork, Claude, etc.). */}
      {fileBlocks.length > 0 && (
        <div className="text-[12px]">
          <button
            type="button"
            onClick={() => setFilesOpen((v) => !v)}
            aria-expanded={filesOpen}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-left max-w-full"
          >
            <ChevronRight
              className={`w-3 h-3 shrink-0 transition-transform duration-150 ${
                filesOpen ? "rotate-90" : ""
              }`}
            />
            {pendingFile ? (
              <span className="inline-flex items-baseline gap-1 min-w-0">
                <span>Creating</span>
                <span
                  className={`font-mono text-foreground/90 truncate ${
                    streaming ? "shimmer-text" : ""
                  }`}
                >
                  {summaryLabel}
                </span>
                <span>…</span>
              </span>
            ) : (
              <span className="text-foreground/80">{summaryLabel}</span>
            )}
            {totalCount > 1 && (
              <span className="shrink-0 ml-1 tabular-nums text-muted-foreground/80">
                ({doneCount}/{totalCount})
              </span>
            )}
          </button>

          {/* Expanded file list — indented, no border/background */}
          {filesOpen && (
            <div className="mt-1.5 ml-4 pl-2 border-l border-border/40 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
              {fileBlocks.map((b, i) =>
                b.kind === "file_done" ? (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <FileCheck className="w-3 h-3 shrink-0 text-emerald-500/80" />
                    <span className="font-mono text-foreground/70 line-through decoration-muted-foreground/40">
                      {b.path}
                    </span>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <FilePen className="w-3 h-3 shrink-0 text-primary animate-pulse" />
                    <span
                      className={`font-mono ${
                        streaming
                          ? "shimmer-text"
                          : "text-foreground/80"
                      }`}
                    >
                      {b.path}
                    </span>
                  </div>
                ),
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

// One row in the post-build verification checklist. The Haiku verifier
// emits a fixed list of these against /api/ai/verify; on warn/fail
// each entry carries a self-contained `fixPrompt` the user can hand
// back to /ai/build with one click.
type VerificationCheck = {
  id: string;
  title: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  files: string[];
  fixPrompt: string | null;
};

// Per-build verification state tracked in a Record keyed by buildId.
// `running` covers the brief window between the build's done event
// and the verifier's reply; `ready` carries the resolved checklist;
// `error` lets us surface a graceful "couldn't run verification" row
// without blowing away the build itself.
type VerificationState =
  | { status: "running" }
  | { status: "ready"; summary: string; checks: VerificationCheck[] }
  | { status: "error"; message: string };

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

// Renders an approved Plan as a human-readable build prompt the user
// can drop into the chat composer to review and edit before sending.
// Shape mirrors what the model would emit on its own from a thorough
// brief — sectioned and labelled, no fenced code blocks (those would
// confuse the build pipeline's directive parsers downstream). The
// originalPrompt sits at the top so the user's exact words are
// preserved as the leading intent statement; the plan facts follow as
// labelled lines the model can scan and the user can edit in place.
function formatPlanAsPrompt(originalPrompt: string, plan: ApprovedPlan): string {
  const lines: string[] = [];
  lines.push(originalPrompt.trim());
  lines.push("");
  lines.push("Build to this plan:");
  if (plan.projectName) lines.push(`- Name: ${plan.projectName}`);
  if (plan.summary) lines.push(`- Summary: ${plan.summary}`);
  if (plan.pages.length > 0)
    lines.push(`- Pages: ${plan.pages.join(", ")}`);
  const enabledSections = plan.sections.filter((s) => s.enabled);
  if (enabledSections.length > 0) {
    lines.push(
      `- Sections: ${enabledSections.map((s) => s.name).join(", ")}`,
    );
  }
  if (plan.colors.length > 0) {
    lines.push(
      `- Palette: ${plan.colors
        .map((c) => `${c.name} ${c.hex}`)
        .join(", ")}`,
    );
  }
  if (plan.fonts.heading || plan.fonts.body) {
    lines.push(
      `- Fonts: ${plan.fonts.heading || "default"} for headings, ${
        plan.fonts.body || "default"
      } for body`,
    );
  }
  if (plan.features.length > 0) {
    lines.push(`- Key features: ${plan.features.join("; ")}`);
  }
  if (plan.copyTone) lines.push(`- Copy tone: ${plan.copyTone}`);
  return lines.join("\n");
}

// The old BuilderTabStrip (horizontal tabs + add-tab popover) was
// replaced by BuilderTabsMenu — see below — which collapses every
// view into a single dropdown trigger next to Chat ↔ Preview.

// Compact "View" picker that replaces the old horizontal tab strip.
// The current tab name + chevron act as the trigger; the dropdown
// lists every available tab as a menu item. Selecting one switches
// the right pane to that view (and on mobile, also flips the
// Chat ↔ Preview toggle to Preview so the user actually sees it).
function BuilderTabsMenu({
  activeTab,
  setActiveTab,
  openTab,
  onPick,
  className = "",
  triggerClassName = "",
}: {
  activeTab: TabKey;
  setActiveTab: (k: TabKey) => void;
  openTab: (k: TabKey) => void;
  onPick?: (k: TabKey) => void;
  className?: string;
  triggerClassName?: string;
}) {
  const ALL_TABS: TabKey[] = ["preview", ...ADDABLE_TABS];
  const activeMeta = TAB_META[activeTab];
  const ActiveIcon = activeMeta.icon;
  const handleSelect = (k: TabKey) => {
    openTab(k);
    setActiveTab(k);
    onPick?.(k);
  };
  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`h-7 inline-flex items-center gap-1.5 rounded-md px-2 text-xs font-medium text-secondary hover:text-foreground hover:bg-surface-raised border border-border transition-colors ${triggerClassName}`}
            aria-label="Switch view"
            title="Switch view"
          >
            <ActiveIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[10rem]">{activeMeta.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-secondary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 border-border max-h-[70vh] overflow-y-auto">
          {ALL_TABS.map((key) => {
            const meta = TAB_META[key];
            const Icon = meta.icon;
            const active = activeTab === key;
            return (
              <DropdownMenuItem
                key={key}
                onSelect={() => handleSelect(key)}
                className={`flex items-center gap-2 cursor-pointer ${active ? "text-primary" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-sm">{meta.label}</span>
                {active && <Check className="w-3.5 h-3.5" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function Builder() {
  const params = useParams();
  const { username, slug } = params;

  const { data: me } = useMe();
  const { data: project } = useProject(username, slug);
  const { data: myProjects = [] } = useMyProjects();
  const { data: apiBuilds = [], isLoading: isBuildsLoading } =
    useProjectBuilds(username, slug);
  const queryClient = useQueryClient();
  const pastBuilds = apiBuilds.map(toPastBuild);

  const [openTabs, setOpenTabs] = useState<TabKey[]>(["preview"]);
  const [activeTab, setActiveTab] = useState<TabKey>("preview");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const liveUrl = `https://${slug}.deploybro.app`;
  const [urlValue, setUrlValue] = useState(liveUrl);
  const [iframeKey, setIframeKey] = useState(0);
  // URL bar is hidden on mobile by default; the 3-dots menu lets users toggle it on.
  const [showUrlBar, setShowUrlBar] = useState(false);

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
      // Stable id so the deployment-poll toast and a separate publish-
      // start error from the same root cause collapse into one card.
      toast.error("Publish failed", {
        id: "deploybro-publish-error",
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
      // Open the Publishing tab so the user sees progress steps immediately.
      openTab("domains");
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
          id: "deploybro-publish-error",
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
  // Default to Auto Bro by name (not by list index) so reordering the
  // picker never silently changes the default model.
  const [selectedModel, setSelectedModel] = useState<string>("Auto Bro");
  // Plan mode: when ON, the user's submit triggers a conversational
  // interview — the AI asks one question at a time (with quick-pick
  // chip suggestions) until it has enough info, then emits the final
  // plan with a Build this button. The whole thread renders inline as
  // its own card in the chat — no modal.
  const [planMode, setPlanMode] = useState<boolean>(false);
  // The active plan-mode interview, or null when no interview is in
  // progress. `status` walks through: thinking (server is replying) →
  // asking (assistant message + suggestions visible, awaiting user
  // reply) → ready (final plan emitted, "Add to chat" button visible)
  // → approved (user clicked "Add to chat"; plan is loaded into the
  // composer for review/edit; the planning thread stays visible as
  // the paper trail and the actual build only fires when the user
  // hits Send).
  const [planConversation, setPlanConversation] = useState<{
    originalPrompt: string;
    overrides: {
      modelKey?: "auto" | "haiku" | "sonnet" | "opus";
      urls?: string[];
      files?: File[];
    };
    messages: Array<
      | { role: "user"; content: string }
      | {
          role: "assistant";
          content: string;
          suggestions: string[];
        }
    >;
    status: "thinking" | "asking" | "ready" | "approved";
    plan: ApprovedPlan | null;
  } | null>(null);
  // Aborts the in-flight /ai/plan SSE turn so a user cancelling the
  // interview (or unmounting) closes the connection and stops billing.
  // While set, the conversation is mid-turn — sendPlanReply uses this
  // as a lock so a chip double-click or fast re-Enter can't kick off
  // a second concurrent request from a stale state snapshot.
  const planAbortRef = useRef<AbortController | null>(null);
  // Monotonic per-turn token. _streamPlanTurn captures the current
  // value when it starts and ignores any of its own state updates if
  // the ref has moved past it (because cancel/restart fired). This
  // prevents stale SSE events from a previous turn — which can still
  // arrive between the abort signal and the upstream throw — from
  // contaminating the new turn's state.
  const planTurnIdRef = useRef(0);
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
  // Reentrancy guard for the clarification gate. Without this, a fast
  // double-tap on Send (or an auto-send racing with a manual click)
  // fires two parallel /ai/clarify requests during the ~1s window
  // before isStreaming flips true; the second response wins and can
  // overwrite the first's pendingClarification with a stale answer.
  const clarifyInFlightRef = useRef(false);

  // ─── Clarification gate (Stage 1 of the pipeline) ─────────────────────
  // When the user sends a thin first-build prompt, the server may ask ONE
  // clarifying question before letting the build run. We render the
  // question + suggestion chips inline as a chat bubble; the user's tap
  // (or typed answer) merges with the original prompt and the build
  // proceeds. Set by handleSend, cleared by submit/cancel.
  const [pendingClarification, setPendingClarification] = useState<{
    prompt: string;
    question: string;
    suggestions: string[];
    overrides: {
      modelKey?: "auto" | "haiku" | "sonnet" | "opus";
      urls?: string[];
      files?: File[];
    };
  } | null>(null);

  // ─── Verification (Stage 4 of the pipeline) ───────────────────────────
  // Keyed by buildId so each completed build keeps its own checklist
  // alongside its bubble in the chat. The map persists for the session;
  // re-running verification on the same build overwrites the entry.
  const [verifications, setVerifications] = useState<
    Record<string, VerificationState>
  >({});

  // Cancel any in-flight build OR plan stream when this component unmounts
  // so the server can close the upstream Claude connection and stop billing.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      planAbortRef.current?.abort();
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
          modelKey?: "auto" | "haiku" | "sonnet" | "opus";
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
          modelKey?: "auto" | "haiku" | "sonnet" | "opus";
          planMode?: boolean;
          urls?: string[];
          files?: File[];
        },
      ) => void)
    | null
  >(null);
  const [activeFile, setActiveFile] = useState<string>("src/app/page.tsx");
  const [openBuildId, setOpenBuildId] = useState<string | null>(null);
  // Mobile-only: which side of the builder is currently visible. The
  // Chat ↔ Preview toggle in the topbar flips this, replacing the old
  // floating-FAB-plus-bottom-sheet pattern. Defaults to chat so the
  // user lands in the input where they'll usually start typing.
  const [mobileShowChat, setMobileShowChat] = useState(true);

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

  // ─── Plan Mode interview helpers ─────────────────────────────────────
  // Drives the conversational planner. Each call to /ai/plan is one
  // turn; we keep the running thread in `planConversation.messages` and
  // POST the full history on each subsequent turn so the model has
  // context. _streamPlanTurn handles the SSE plumbing for one turn;
  // start/sendPlanReply/approve/cancel are the user-facing actions.
  const _streamPlanTurn = async (
    conv: NonNullable<typeof planConversation>,
  ) => {
    if (!username || !slug) return;
    // Defensive: cancel any prior in-flight turn before starting a new
    // one. Should already have been aborted by sendPlanReply's guard,
    // but belt-and-braces stops a stale stream from racing this one.
    planAbortRef.current?.abort();
    const controller = new AbortController();
    planAbortRef.current = controller;
    const myTurnId = ++planTurnIdRef.current;
    // Helper that wraps every state update so a turn whose ID has been
    // superseded silently no-ops. Without this a delta from a prior
    // turn could still flip status / append text to the new thread
    // between the abort signal firing and the upstream throw.
    const updateIfActive = (
      updater: (
        cur: NonNullable<typeof planConversation>,
      ) => typeof planConversation,
    ) => {
      if (myTurnId !== planTurnIdRef.current) return;
      setPlanConversation((cur) => (cur ? updater(cur) : cur));
    };
    try {
      const res = await fetch(`/api/ai/plan/${username}/${slug}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          originalPrompt: conv.originalPrompt,
          // The server treats `messages` as the Anthropic-format
          // conversation. We strip suggestions client-side — the
          // model only needs the human-readable text of each turn.
          messages: conv.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ...(conv.overrides.urls && conv.overrides.urls.length > 0
            ? { urls: conv.overrides.urls }
            : {}),
        }),
        signal: controller.signal,
      });
      // Throw on ANY non-OK response — not just JSON ones. An HTML
      // error page (e.g. proxy 502) would otherwise fall through to
      // readSSE, produce no events, and leave the UI stuck in
      // "thinking" forever.
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        if (res.headers.get("content-type")?.includes("application/json")) {
          const j = await res.json().catch(() => ({}));
          if (j?.message) message = j.message;
        }
        throw new Error(message);
      }
      let lastTurnKind: "question" | "plan" = "question";
      for await (const evt of readSSE(res)) {
        if (evt.event === "start") {
          // Push the placeholder assistant message; subsequent
          // delta events append to its content. Doing this on
          // `start` (not first delta) makes the typing indicator
          // hand off cleanly the moment the connection opens.
          updateIfActive((cur) => ({
            ...cur,
            messages: [
              ...cur.messages,
              { role: "assistant", content: "", suggestions: [] },
            ],
          }));
        } else if (
          evt.event === "delta" &&
          typeof evt.data?.text === "string"
        ) {
          const chunk = evt.data.text as string;
          updateIfActive((cur) => {
            // Defensive: if `start` was missed for any reason,
            // create the assistant placeholder lazily so deltas
            // don't get dropped.
            let msgs = cur.messages;
            const last = msgs[msgs.length - 1];
            if (!last || last.role !== "assistant") {
              msgs = [
                ...msgs,
                { role: "assistant", content: "", suggestions: [] },
              ];
            }
            const tail = msgs[msgs.length - 1];
            if (tail.role !== "assistant") return cur;
            return {
              ...cur,
              status: "asking",
              messages: [
                ...msgs.slice(0, -1),
                { ...tail, content: tail.content + chunk },
              ],
            };
          });
        } else if (evt.event === "turn" && evt.data) {
          const kind = evt.data.kind === "plan" ? "plan" : "question";
          lastTurnKind = kind;
          const suggestions = Array.isArray(evt.data.suggestions)
            ? (evt.data.suggestions as unknown[]).filter(
                (s): s is string => typeof s === "string",
              )
            : [];
          const planFromServer = evt.data.plan
            ? (evt.data.plan as ApprovedPlan)
            : null;
          updateIfActive((cur) => {
            const msgs = cur.messages;
            const last = msgs[msgs.length - 1];
            if (!last || last.role !== "assistant") return cur;
            return {
              ...cur,
              plan: planFromServer ?? cur.plan,
              messages: [
                ...msgs.slice(0, -1),
                {
                  ...last,
                  suggestions: kind === "question" ? suggestions : [],
                },
              ],
            };
          });
        } else if (evt.event === "error") {
          throw new Error(evt.data?.message || "Plan turn failed");
        } else if (evt.event === "done" && evt.data?.ok) {
          updateIfActive((cur) => ({
            ...cur,
            status: lastTurnKind === "plan" ? "ready" : "asking",
          }));
        }
      }
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      if (!aborted) {
        const msg =
          err instanceof Error ? err.message : "Couldn't draft a reply";
        // Stable id so a user retrying a few times doesn't stack three
        // copies of the same plan-turn error in the corner.
        toast.error("Plan mode hit a snag", {
          id: "deploybro-plan-turn-error",
          description: msg,
        });
        // Drop back to "asking" so the user can retry by sending
        // another message — we don't blow away the whole thread on
        // a single failed turn.
        updateIfActive((cur) => ({ ...cur, status: "asking" }));
      }
    } finally {
      // Only release the lock if no newer turn has taken over — the
      // newer turn's own `planAbortRef.current = controller` may have
      // already run by the time this finally fires.
      if (myTurnId === planTurnIdRef.current) {
        planAbortRef.current = null;
      }
    }
  };

  const startPlanConversation = (
    prompt: string,
    overrides: {
      modelKey?: "auto" | "haiku" | "sonnet" | "opus";
      urls?: string[];
      files?: File[];
    },
  ) => {
    const conv = {
      originalPrompt: prompt,
      overrides,
      // Seed the thread with the user's original prompt as the first
      // visible bubble so the chat reads as a real conversation from
      // the very first message.
      messages: [{ role: "user" as const, content: prompt }],
      status: "thinking" as const,
      plan: null,
    };
    setPlanConversation(conv);
    void _streamPlanTurn(conv);
  };

  const sendPlanReply = (text?: string) => {
    // Accept replies from both "asking" (the model just posed a
    // question and is waiting for an answer) and "ready" (the user
    // already has a finished plan but wants to refine it before
    // building — e.g. "actually use a darker blue", "add a settings
    // page"). In the ready case we re-open the conversation by
    // flipping back to "thinking" and re-streaming, which the
    // server treats as another planning turn.
    if (
      !planConversation ||
      (planConversation.status !== "asking" &&
        planConversation.status !== "ready")
    )
      return;
    // Lock against double-submit (rapid Enter, chip double-click). A
    // turn is in flight whenever planAbortRef.current is set; until it
    // completes we silently drop additional sends rather than firing
    // concurrent /ai/plan requests from stale state snapshots.
    if (planAbortRef.current) return;
    const reply = (typeof text === "string" ? text : chatInput).trim();
    if (!reply) return;
    setChatInput("");
    const newMessages: typeof planConversation.messages = [
      ...planConversation.messages,
      { role: "user", content: reply },
    ];
    const next = {
      ...planConversation,
      messages: newMessages,
      status: "thinking" as const,
    };
    setPlanConversation(next);
    void _streamPlanTurn(next);
  };

  // "Add to chat" — formats the approved plan as a human-readable
  // prompt and drops it into the chat composer so the user can review,
  // tweak the wording, then hit Send to fire the build themselves.
  // Replaces the old auto-build behaviour that wiped the planning
  // thread and immediately POSTed to /ai/build — a one-click jump
  // that left users with no chance to refine the prompt that the
  // model would actually act on.
  //
  // The planning thread stays visible (status flips to "approved")
  // as the paper trail of how the plan was reached. The dispatcher
  // in onSend below routes Send presses while status==="approved"
  // straight to handleSend with the locked plan, instead of treating
  // them as another conversation turn.
  const approvePlan = () => {
    if (!planConversation?.plan) return;
    const { originalPrompt, plan } = planConversation;
    const formatted = formatPlanAsPrompt(originalPrompt, plan);
    setChatInput(formatted);
    setPlanConversation((cur) => (cur ? { ...cur, status: "approved" } : cur));
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(
        'textarea[data-composer="chat"]',
      );
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        ta.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    toast.message("Plan added to chat", {
      description: "Review or edit the prompt, then hit Send to build.",
    });
  };

  const cancelPlanConversation = () => {
    planAbortRef.current?.abort();
    const restored = planConversation?.originalPrompt ?? "";
    setPlanConversation(null);
    setChatInput((cur) => (cur.trim().length === 0 ? restored : cur));
  };

  // ─── Verification helper (Stage 4 of the pipeline) ────────────────────
  // POST /api/ai/verify, store the result keyed by buildId. Called
  // from the build's `done` event handler once invalidateQueries has
  // settled (so the build is visible in pastBuilds when the panel
  // renders). Failures are swallowed — verification is quality-of-life,
  // not a build gate.
  const verifyBuild = async (buildId: string, originalPrompt: string) => {
    if (!username || !slug) return;
    setVerifications((cur) => ({ ...cur, [buildId]: { status: "running" } }));
    try {
      const res = await fetch(`/api/ai/verify/${username}/${slug}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: originalPrompt, buildId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = (await res.json()) as {
        summary?: string;
        checks?: unknown;
      };
      const checks: VerificationCheck[] = Array.isArray(j.checks)
        ? (j.checks as Array<Record<string, unknown>>)
            .map((c) => ({
              id: typeof c.id === "string" ? c.id : "unknown",
              title: typeof c.title === "string" ? c.title : "Check",
              status:
                c.status === "pass" || c.status === "warn" || c.status === "fail"
                  ? c.status
                  : "pass",
              summary: typeof c.summary === "string" ? c.summary : "",
              files: Array.isArray(c.files)
                ? (c.files as unknown[]).filter(
                    (f): f is string => typeof f === "string",
                  )
                : [],
              fixPrompt:
                typeof c.fixPrompt === "string" && c.fixPrompt.trim()
                  ? c.fixPrompt
                  : null,
            }))
        : [];
      setVerifications((cur) => ({
        ...cur,
        [buildId]: {
          status: "ready",
          summary:
            typeof j.summary === "string" && j.summary.trim()
              ? j.summary
              : "Build verified.",
          checks,
        },
      }));
    } catch (err) {
      setVerifications((cur) => ({
        ...cur,
        [buildId]: {
          status: "error",
          message:
            err instanceof Error ? err.message : "Couldn't verify build",
        },
      }));
    }
  };

  // Click handler for "Apply fix" on a verification check. Loads the
  // server's pre-baked fixPrompt into the chat composer so the user
  // can review/edit it before sending — auto-firing the build felt
  // pushy and also wiped quick-task chips and stream steps mid-flow.
  // We also flip plan mode OFF since fixes are concrete patches that
  // should go straight through the build pipeline (not a fresh plan
  // interview), and focus the composer so Send is one keypress away.
  const applyVerificationFix = (check: VerificationCheck) => {
    if (!check.fixPrompt) return;
    setChatInput(check.fixPrompt);
    if (planMode) setPlanMode(false);
    // Focus + scroll the composer on the next tick so the just-set
    // value is already painted when the textarea takes focus. The
    // data-composer="chat" hook is set on the textarea inside
    // ChatPanel; querying the DOM is simpler than threading a ref
    // up through three component layers for one focus call.
    requestAnimationFrame(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(
        'textarea[data-composer="chat"]',
      );
      if (ta) {
        ta.focus();
        // Move the caret to the end so the user can keep typing or
        // edit from where the prompt naturally ends.
        ta.setSelectionRange(ta.value.length, ta.value.length);
        ta.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    toast.message("Fix request loaded into chat", {
      description: "Review or edit it, then hit Send to apply.",
    });
  };

  // Click handler for the clarification chip / Submit button. Merges
  // the user's answer onto the original prompt and re-enters handleSend
  // with skipClarify=true so we don't loop on the same gate.
  const submitClarificationAnswer = (answer: string) => {
    const c = pendingClarification;
    if (!c) return;
    const trimmed = answer.trim();
    setPendingClarification(null);
    const merged = trimmed
      ? `${c.prompt}\n\nAdditional context: ${trimmed}`
      : c.prompt;
    void handleSend(merged, { ...c.overrides, skipClarify: true });
  };

  const cancelClarification = () => {
    const c = pendingClarification;
    setPendingClarification(null);
    // Restore the original prompt to the composer so the user can
    // edit and re-send without re-typing the whole thing. Also
    // clear pendingPrompt — the in-handleSend early bubble may
    // still be visible if cancel races the clarify response.
    setPendingPrompt(null);
    if (c) setChatInput((cur) => (cur.trim().length === 0 ? c.prompt : cur));
  };

  // Optional `overrides` lets callers (specifically the rehydration effect
  // and the plan-conversation "Build this" callback) pass freshly-parsed
  // composer settings without waiting for React state setters to flush —
  // eliminates the timing race on first auto-send.
  const handleSend = async (
    overridePrompt?: string,
    overrides?: {
      modelKey?: "auto" | "haiku" | "sonnet" | "opus";
      planMode?: boolean;
      urls?: string[];
      files?: File[];
      // Set by the plan-review modal once the user clicks "Build this".
      // When present we skip the planning pass and POST straight to
      // /ai/build with the plan as the locked spec.
      approvedPlan?: ApprovedPlan;
      // Set by the clarification flow (and verification's "Apply fix"
      // button) so a re-entrant call doesn't ask the same question
      // twice. Without this we'd loop forever on a thin prompt.
      skipClarify?: boolean;
    },
  ) => {
    // Defensive: callers like `<button onClick={handleSend}>` pass a
    // React event in the first slot, so guard against non-string args.
    const raw =
      typeof overridePrompt === "string" ? overridePrompt : chatInput;
    if (
      !raw.trim() ||
      isStreaming ||
      // Block new builds while a plan-mode interview is open — the
      // dispatcher (onSend) routes user replies to sendPlanReply
      // instead. The one exception is approvePlan, which calls us
      // with overrides.approvedPlan set DURING the same render that
      // clears planConversation; without the !approvedPlan escape
      // hatch the stale closure value blocks "Build this" entirely.
      (planConversation !== null && !overrides?.approvedPlan) ||
      !username ||
      !slug
    )
      return;
    const prompt = raw.trim();
    // Cancel any pending cleanup timer from the previous run so it
    // can't fire 600ms into this new send and wipe the freshly-set
    // phase / typed / streamSteps state.
    if (cleanupTimerRef.current != null) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }

    // Show the user's prompt bubble + clear the input IMMEDIATELY for
    // build-mode sends (plan mode handles its own placeholder via the
    // PlanBox stepper below). Without this the textarea empties on
    // send but no chat feedback appears for the 1-3s while clarify
    // is in flight, then again until the SSE "start" event lands —
    // it reads as if their message was eaten. The streaming-block
    // render condition `(isStreaming || currentPhase || pendingPrompt)`
    // already keys off pendingPrompt, so this single line is enough
    // to surface the user bubble + a "Thinking…" shimmer instantly.
    // We restore the input on early-exit paths below (clarification
    // needed, validation failure) so we never lose the user's text.
    const _willStartPlanInterview =
      (overrides?.planMode ?? planMode) && !overrides?.approvedPlan;
    if (!_willStartPlanInterview) {
      setChatInput("");
      setPendingPrompt(prompt);
    }

    // ─── Plan Mode interception — kicks off the conversational interview ──
    // When Plan Mode is on AND no plan has been approved yet, hand
    // control to startPlanConversation. The interview runs as a chat
    // thread inside its own card (see ChatPanel below); the user's
    // replies route through sendPlanReply via the onSend dispatcher
    // until the AI emits a final plan and the user clicks Build this,
    // which calls back into handleSend with overrides.approvedPlan set
    // — that skips this branch and runs the build.
    const _effectivePlanMode = overrides?.planMode ?? planMode;
    if (_effectivePlanMode && !overrides?.approvedPlan) {
      const _modelKey =
        overrides?.modelKey ??
        AVAILABLE_MODELS.find((m) => m.name === selectedModel)?.key;
      const _sendingUrls = overrides?.urls ?? refUrls;
      const _sendingFiles = overrides?.files ?? attachments;
      setChatInput("");
      startPlanConversation(prompt, {
        modelKey: _modelKey,
        urls: _sendingUrls,
        files: _sendingFiles,
      });
      return;
    }

    // ─── Defensive: clarification gate is about to fire, but if the
    // user already has a clarification on screen or one is racing us,
    // bail and put the prompt back in the composer so it isn't lost.
    if (
      !overrides?.approvedPlan &&
      !overrides?.skipClarify &&
      (clarifyInFlightRef.current || pendingClarification)
    ) {
      setPendingPrompt(null);
      setChatInput((cur) => (cur.trim().length === 0 ? prompt : cur));
      return;
    }

    // ─── Clarification gate (Stage 1) — fires before the build ──────────
    // Quick Haiku check: is the prompt detailed enough to build well, or
    // would ONE specific question dramatically lift quality? Only runs
    // for fresh build mode (not Plan Mode, not approved plans, and not
    // when the same call already came back from a clarification reply
    // — that's the `overrides.skipClarify` escape hatch). On a needs-
    // clarification reply we render the question inline and pause the
    // pipeline; submitClarificationAnswer re-enters handleSend with the
    // merged prompt and skipClarify set, so we don't loop.
    if (
      !_effectivePlanMode &&
      !overrides?.approvedPlan &&
      !overrides?.skipClarify
    ) {
      clarifyInFlightRef.current = true;
      try {
        const clarifyRes = await fetch(
          `/api/ai/clarify/${username}/${slug}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              prompt,
              urls: overrides?.urls ?? refUrls,
              images: (overrides?.files ?? attachments).filter((f) =>
                f.type.startsWith("image/"),
              ).length
                ? [{}] // shape-only signal so the server takes the "has images" branch
                : [],
            }),
          },
        );
        if (clarifyRes.ok) {
          const j = (await clarifyRes.json().catch(() => null)) as {
            ok?: boolean;
            question?: string;
            suggestions?: string[];
          } | null;
          if (j && j.ok === false && typeof j.question === "string") {
            // Pause here. The bubble takes over from the user's POV;
            // on submit we re-enter handleSend with the answer merged
            // into the prompt and skipClarify=true. We also drop the
            // pendingPrompt bubble we set up at the top of handleSend
            // — the clarification UI will own the conversation slot
            // until the user responds, and the prompt will be re-set
            // when the merged version flows back through handleSend.
            const _modelKey =
              overrides?.modelKey ??
              AVAILABLE_MODELS.find((m) => m.name === selectedModel)?.key;
            setPendingPrompt(null);
            setPendingClarification({
              prompt,
              question: j.question,
              suggestions: Array.isArray(j.suggestions)
                ? j.suggestions
                    .filter((s) => typeof s === "string" && s.trim())
                    .slice(0, 4)
                : [],
              overrides: {
                modelKey: _modelKey,
                urls: overrides?.urls ?? refUrls,
                files: overrides?.files ?? attachments,
              },
            });
            return;
          }
        }
      } catch {
        // Network or AI hiccup — fall through to the build. Clarify
        // never blocks the user's main flow.
      } finally {
        // Always clear the in-flight flag — both the success/return
        // path and the "no clarification needed → continue to build"
        // path want subsequent sends to work normally.
        clarifyInFlightRef.current = false;
      }
    }

    setIsStreaming(true);
    // Note: pendingPrompt + chatInput clearing already happened at the
    // top of handleSend so the user got immediate chat feedback during
    // the clarify round-trip. Setting them again here would be a
    // no-op for the bubble (still showing the same prompt) and is
    // intentionally not repeated.
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
    // Two-stage Plan Mode: when the user already approved a plan in the
    // review modal, we ship it back to /ai/build as the locked spec and
    // the server skips the legacy "write a plan first" instruction.
    if (overrides?.approvedPlan) body.approvedPlan = overrides.approvedPlan;

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

      // ─── Trigger Stage 4: verification ───────────────────────────────
      // Now that the new build is in pastBuilds and its files are
      // persisted, kick off the audit. The panel renders inside the
      // build's chat row from `verifications[buildId]`, so the spinner
      // shows the moment we set { status: "running" } and the checklist
      // pops in once the Haiku call returns. Fire-and-forget — we
      // don't await so the UI doesn't block on the audit.
      try {
        const builds = queryClient.getQueryData<ApiBuild[]>([
          "projects",
          username,
          slug,
          "builds",
        ]);
        const newest = Array.isArray(builds) ? builds[0] : undefined;
        if (newest?.id) {
          void verifyBuild(newest.id, prompt);
        }
      } catch {
        // verifyBuild handles its own errors; this catch is just a
        // belt-and-braces guard against a malformed cache snapshot.
      }
    } catch (err) {
      const aborted = (err as { name?: string })?.name === "AbortError";
      finishAll(aborted ? "done" : "error");
      if (!aborted) {
        // Stable id so back-to-back build retries (e.g. user mashes
        // Send after a flake) collapse into one toast instead of
        // stacking on top of each other.
        toast.error("Build failed", {
          id: "deploybro-build-error",
          description: err instanceof Error ? err.message : "Unknown error",
        });
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
        // Single stable toast id so a burst of errors (e.g. an unhandled
        // rejection AND a failed script-tag fetch firing back-to-back
        // from the same broken build) updates one toast in place
        // instead of stacking three "Preview hit an error" cards on
        // top of each other. The latest message wins so the user
        // always sees the most recent failure context.
        const summary = where ? `${message} (${where})` : message;
        toast.error("Preview hit an error", {
          id: "deploybro-preview-error",
          description:
            summary.length > 140 ? summary.slice(0, 137) + "…" : summary,
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
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden text-foreground">
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
          <div className="w-px h-4 bg-border hidden md:block"></div>
          {/* Project switcher — desktop only. Mobile uses the
              Chat ↔ Preview toggle below in this same slot, since
              screen real-estate at the top is too cramped to host
              both. The user can jump between projects from the
              dashboard or via the 3-dot menu on the right. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex items-center gap-1 min-w-0 rounded-md px-1.5 py-1 hover:bg-surface-raised transition-colors group">
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
          {/* Mobile Chat ↔ Preview toggle. One combined segmented
              control: Chat button, the right-pane button (whose label
              reflects the current view), and a chevron trigger that
              opens the view picker. Picking a view from the dropdown
              also flips to the right pane so the change is visible.
              Replaces both the old standalone Chat ↔ Preview toggle
              and the separate BuilderTabsMenu that used to sit
              alongside it. */}
          {(() => {
            const activeMeta = TAB_META[activeTab];
            const ActiveIcon = activeMeta.icon;
            const ALL_TABS: TabKey[] = ["preview", ...ADDABLE_TABS];
            return (
              <div
                className="md:hidden inline-flex items-center rounded-md bg-surface-raised border border-border p-0.5 ml-1"
                aria-label="Switch between chat and preview"
              >
                <button
                  type="button"
                  aria-pressed={mobileShowChat}
                  onClick={() => setMobileShowChat(true)}
                  className={`h-7 px-3 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    mobileShowChat
                      ? "bg-primary text-primary-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
                <button
                  type="button"
                  aria-pressed={!mobileShowChat}
                  onClick={() => setMobileShowChat(false)}
                  className={`h-7 pl-3 pr-2 rounded-l text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    !mobileShowChat
                      ? "bg-primary text-primary-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  <ActiveIcon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[6rem]">{activeMeta.label}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Pick a view"
                      title="Pick a view"
                      className={`h-7 px-1.5 rounded-r inline-flex items-center transition-colors ${
                        !mobileShowChat
                          ? "bg-primary text-primary-foreground"
                          : "text-secondary hover:text-foreground"
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 border-border max-h-[70vh] overflow-y-auto"
                  >
                    {ALL_TABS.map((key) => {
                      const meta = TAB_META[key];
                      const Icon = meta.icon;
                      const active = activeTab === key;
                      return (
                        <DropdownMenuItem
                          key={key}
                          onSelect={() => {
                            openTab(key);
                            setActiveTab(key);
                            setMobileShowChat(false);
                          }}
                          className={`flex items-center gap-2 cursor-pointer ${active ? "text-primary" : ""}`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="flex-1 text-sm">{meta.label}</span>
                          {active && <Check className="w-3.5 h-3.5" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })()}
        </div>

        {/* Drag handle aligned with the body's chat-resize handle so the
            entire chat column has one continuous draggable seam. */}
        <div
          onMouseDown={startDrag}
          onDoubleClick={() => setChatWidth(400)}
          className="hidden md:block w-1 self-stretch shrink-0 cursor-col-resize bg-transparent hover:bg-primary/40 active:bg-primary/60 transition-colors -ml-px"
          title="Drag to resize · double-click to reset"
        />

        {/* View picker — desktop only. Replaces the old horizontal
            tab strip with a single dropdown trigger so the navbar
            doesn't get crowded as more views (Database, Env Vars, …)
            are added. Mobile gets the same picker placed next to the
            Chat ↔ Preview toggle. */}
        <BuilderTabsMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openTab={openTab}
          className="hidden md:flex items-center gap-1 px-2 min-w-0"
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
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem onClick={() => setShowUrlBar((v) => !v)}>
                {showUrlBar ? "Hide URL bar" : "Show URL bar"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel - Chat. Always rendered (so its state and any
            in-flight stream survive mode switches), but on mobile we
            hide whichever side isn't selected by the topbar's
            Chat ↔ Preview toggle. On desktop the aside stays at its
            user-resizable `chatWidth`; on mobile it stretches to fill
            the screen because there's no preview alongside it. */}
        <aside
          className={`builder-chat-panel flex-col h-full md:shrink-0 md:w-[var(--chat-w)] w-full ${
            mobileShowChat ? "flex" : "hidden md:flex"
          }`}
          style={{ ["--chat-w" as string]: `${chatWidth}px` } as React.CSSProperties}
        >
          <ChatPanel
            chatInput={chatInput}
            setChatInput={setChatInput}
            isStreaming={isStreaming}
            currentPhase={currentStep?.phase}
            streamSteps={streamSteps}
            typed={typed}
            pendingPrompt={pendingPrompt}
            onSend={() => {
              // Dispatch: while a plan-mode interview is open and the
              // assistant is awaiting a reply, route the user's send
              // into the conversation (sendPlanReply). Otherwise fall
              // through to a normal build.
              // Both "asking" (mid-interview) and "ready" (plan is
              // finalised but user wants to refine before building)
              // route the typed input back into the plan conversation
              // — that's the "or enter something in the prompt box"
              // path that pairs with the inline color picker.
              if (
                planConversation?.status === "asking" ||
                planConversation?.status === "ready"
              ) {
                sendPlanReply();
              } else if (
                planConversation?.status === "approved" &&
                planConversation.plan
              ) {
                // User reviewed/edited the formatted plan in the
                // composer and hit Send. Fire the actual build with
                // the locked plan as the spec — handleSend's guard
                // permits this via the !approvedPlan escape hatch
                // even though planConversation is still set.
                void handleSend(undefined, {
                  ...planConversation.overrides,
                  planMode: true,
                  approvedPlan: planConversation.plan,
                });
              } else {
                void handleSend();
              }
            }}
            planConversation={planConversation}
            onPlanSuggestionClick={(text) => sendPlanReply(text)}
            onApprovePlan={approvePlan}
            onCancelPlan={cancelPlanConversation}
            onUpdatePlan={(plan) =>
              setPlanConversation((cur) => (cur ? { ...cur, plan } : cur))
            }
            openBuildId={openBuildId}
            setOpenBuildId={setOpenBuildId}
            pastBuilds={pastBuilds}
            isHistoryLoading={isBuildsLoading}
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
            // Stage 1 — clarification gate. Bubble renders inline when
            // the AI needs ONE more piece of info before building.
            pendingClarification={pendingClarification}
            onClarificationSubmit={submitClarificationAnswer}
            onClarificationCancel={cancelClarification}
            // Stage 4 — verification checklist. Keyed by buildId; each
            // past-build row reads its own entry. Fix-click hands the
            // server-baked fixPrompt back into /ai/build.
            verifications={verifications}
            onApplyVerificationFix={applyVerificationFix}
          />
        </aside>
        {/* Drag handle to resize chat */}
        <div
          onMouseDown={startDrag}
          onDoubleClick={() => setChatWidth(400)}
          className="hidden md:block w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-primary/40 active:bg-primary/60 transition-colors -ml-px relative z-10"
          title="Drag to resize · double-click to reset"
        />

        {/* Right Panel - Tabbed Workspace. Hidden on mobile when the
            topbar toggle has Chat selected; always visible on desktop. */}
        <section
          className={`flex-1 flex-col bg-background overflow-hidden min-w-0 ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* The mobile tab strip used to live here. View switching
              now happens via the BuilderTabsMenu in the topbar (next
              to the Chat ↔ Preview toggle). */}

          {/* Live URL bar (preview only) — hidden on mobile by default, toggleable via 3-dots menu */}
          {activeTab === "preview" && (
            <div className={`h-10 border-b border-border bg-surface grid-cols-[auto_1fr_auto] items-center gap-1 px-2 shrink-0 ${showUrlBar ? "grid" : "hidden md:grid"}`}>
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

      {/* Mobile chat is handled inline by the aside above + the
          Chat ↔ Preview toggle in the topbar. The old floating FAB
          and bottom-sheet pattern has been removed. */}

      {/* Plan-mode used to open a separate review modal here — that's
          gone in favour of the conversational interview rendered inline
          in the chat (see the planConversation block in ChatPanel). */}
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
  planConversation,
  onPlanSuggestionClick,
  onApprovePlan,
  onCancelPlan,
  onUpdatePlan,
  openBuildId,
  setOpenBuildId,
  pastBuilds,
  isHistoryLoading,
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
  pendingClarification,
  onClarificationSubmit,
  onClarificationCancel,
  verifications,
  onApplyVerificationFix,
}: {
  chatInput: string;
  setChatInput: (v: string) => void;
  isStreaming: boolean;
  currentPhase: string | undefined;
  streamSteps: StreamStep[];
  typed: string;
  pendingPrompt: string | null;
  onSend: () => void;
  // The active plan-mode interview, or null when no interview is in
  // progress. The plan bubble renders the messages array as an
  // alternating user/assistant thread inside its own card.
  planConversation: {
    originalPrompt: string;
    messages: Array<
      | { role: "user"; content: string }
      | { role: "assistant"; content: string; suggestions: string[] }
    >;
    status: "thinking" | "asking" | "ready" | "approved";
    plan: ApprovedPlan | null;
  } | null;
  // Click handler for a suggestion chip on an assistant bubble — sends
  // the chip text as the user's reply.
  onPlanSuggestionClick: (text: string) => void;
  // "Add to chat" button — drops the formatted plan into the chat
  // composer for the user to review/edit before they hit Send. The
  // actual build is fired by the Send dispatcher above when the user
  // is ready, NOT by this callback.
  onApprovePlan: () => void;
  // Cancel button on the conversation card — aborts the in-flight SSE
  // turn and restores the original prompt to the composer.
  onCancelPlan: () => void;
  // In-place plan edits (currently the palette color picker). Mutates
  // `planConversation.plan` so the change ships when the user clicks
  // "Build this".
  onUpdatePlan: (plan: ApprovedPlan) => void;
  openBuildId: string | null;
  setOpenBuildId: (id: string | null) => void;
  pastBuilds: PastBuild[];
  // True while the GET /builds query is in flight on initial mount.
  // Without this, navigating into a project (or refreshing) briefly
  // shows the "Tell the AI what to build" empty state before the
  // history arrives, which the user perceives as the chat thread
  // disappearing whenever they click back in. We use it to suppress
  // the empty-state copy until we actually know the thread is empty.
  isHistoryLoading: boolean;
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
  // Stage 1 — clarification gate state passed down from Builder. Set
  // when /ai/clarify returns ok:false; cleared by submit/cancel.
  pendingClarification: {
    prompt: string;
    question: string;
    suggestions: string[];
    overrides: {
      modelKey?: "auto" | "haiku" | "sonnet" | "opus";
      urls?: string[];
      files?: File[];
    };
  } | null;
  onClarificationSubmit: (answer: string) => void;
  onClarificationCancel: () => void;
  // Stage 4 — verification map keyed by buildId. Each past-build row
  // reads its own entry to render the checklist (if any).
  verifications: Record<string, VerificationState>;
  onApplyVerificationFix: (check: VerificationCheck) => void;
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
    // The plan-conversation card grows on every turn — keep the latest
    // assistant text + suggestion chips + ready plan pinned to the
    // bottom on each transition.
    planConversation?.messages.length,
    planConversation?.messages[planConversation.messages.length - 1]
      ?.content.length,
    planConversation?.status,
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

                {/* Stage 4 — verification checklist. Renders only when
                    a verifier result exists for this build. Sits
                    between the AI prose and the checkpoint footer so
                    it reads as part of the assistant's reply, not as
                    a separate card. */}
                {verifications[b.id] && (
                  <VerificationPanel
                    state={verifications[b.id]}
                    onApplyFix={onApplyVerificationFix}
                  />
                )}

                {/* Footer: Checkpoint on its own line, then an inline
                    "Worked for…" collapsible — chevron + text, no card
                    chrome. Matches the rork.com / Claude pattern of
                    inline collapsibles instead of accordion pills.
                    Clicking the row toggles the cost details below. */}
                <div className="pt-1 space-y-1 text-xs text-muted-foreground">
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
                    className="inline-flex items-center gap-1.5 font-mono hover:text-foreground transition-colors text-left"
                  >
                    <ChevronRight
                      className={`w-3 h-3 shrink-0 transition-transform duration-150 ${
                        open ? "rotate-90" : ""
                      }`}
                    />
                    <span>Worked for {durationLabel}</span>
                  </button>
                </div>

                {/* Expanded price details — indented under the row,
                    no card background, just a subtle left rule. */}
                {open && (
                  <div className="mt-2 ml-4 pl-3 border-l border-border/40 space-y-2 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
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

            {/* The AI's prose — muted, with a left-to-right shimmer
                applied to the in-flight tail (last paragraph and any
                currently-writing file label) so the user can see at
                a glance which line is "working" right now. Before
                any deltas land — i.e. while clarify is in flight or
                we're waiting on the SSE "start" event — surface a
                shimmer "Thinking…" placeholder so the user gets
                immediate feedback that we're working, instead of an
                empty min-h slot that reads as nothing happening. */}
            <div className="text-sm leading-relaxed min-h-[1.4em] whitespace-pre-wrap break-words text-muted-foreground">
              {typed.length === 0 ? (
                <span className="shimmer-text">Thinking…</span>
              ) : (
                <FileNoticeText text={typed} streaming={isStreaming} />
              )}
            </div>

            {/* The per-step icon list used to live here, but the AI's prose
                narrative above already tells the user what's happening — the
                redundant labels added noise without adding information. */}
          </div>
        )}

        {/* Plan-mode interview — rendered as a single multi-step
            "plan box" instead of alternating chat bubbles. Each
            assistant question + the user's reply collapses into one
            numbered step on a vertical stepper; the most recent
            unanswered question is the current step and shows
            suggestion chips. When the conversation reaches the
            ready state the same box swaps its body for the
            structured plan summary + Build/Cancel actions, so the
            whole planning flow lives inside one consistent
            container in the chat. */}
        {planConversation && (
          <PlanBox
            conversation={planConversation}
            onSuggestionClick={onPlanSuggestionClick}
            onApprovePlan={onApprovePlan}
            onCancelPlan={onCancelPlan}
            onUpdatePlan={onUpdatePlan}
          />
        )}

        {/* Stage 1 — clarification bubble. Pauses the pipeline with
            ONE specific question + suggestion chips when the prompt
            is too thin to build well. User taps a chip or types a
            free-form answer; submit merges it into the original
            prompt and resumes the build. Cancel restores the prompt
            to the composer for editing. */}
        {pendingClarification && (
          <ClarificationBubble
            clarification={pendingClarification}
            onSubmit={onClarificationSubmit}
            onCancel={onClarificationCancel}
          />
        )}

        {/* Empty state — only after we've actually confirmed the
            history is empty. Showing this while the first /builds
            fetch is still in flight made the chat appear to flash
            blank every time the user clicked back into a project,
            which read like the conversation had been lost. */}
        {!isStreaming &&
          !currentPhase &&
          !isHistoryLoading &&
          pastBuilds.length === 0 && (
            <div className="text-xs text-secondary text-center py-8">
              Tell the AI what to build. Watch the work happen live.
            </div>
          )}
      </div>

      <div className="builder-chat-input-bar p-3 shrink-0">
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
        <div className="prompt-glow builder-chat-input-shell rounded-xl">
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
            data-composer="chat"
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
                    // All tiers are available to every user — billing
                    // is per-token from the user's balance, so the
                    // model picker is a UX choice, not a paywall.
                    return (
                      <button
                        key={m.name}
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
                          <div className="text-[10px] text-secondary font-mono">
                            {m.costRange} · {m.note}
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
                {/* Visual checkbox indicator instead of an icon —
                    matches the homepage Plan toggle so the on/off
                    state reads at a glance. */}
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

// ─── ClarificationBubble ────────────────────────────────────────────────
// Inline assistant bubble for the Stage 1 clarification gate. Renders
// a single specific question, up to 4 chip suggestions for one-tap
// answers, a free-form input for typed replies, and a "Skip" link that
// proceeds with the original prompt unchanged. The bubble owns its
// own input state so a typed answer doesn't pollute the main composer.
function ClarificationBubble({
  clarification,
  onSubmit,
  onCancel,
}: {
  clarification: {
    prompt: string;
    question: string;
    suggestions: string[];
  };
  onSubmit: (answer: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // Auto-focus so the user can just start typing without an extra tap.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onSubmit(t);
  };
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-mono text-primary mb-1">
            Quick question
          </div>
          <div className="text-sm text-foreground leading-snug">
            {clarification.question}
          </div>
        </div>
      </div>

      {clarification.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {clarification.suggestions.map((s, i) => (
            <button
              key={`cs-${i}`}
              onClick={() => onSubmit(s)}
              className="px-2.5 py-1 rounded-full border border-primary/30 bg-background hover:bg-primary/10 hover:border-primary/50 text-[11px] text-foreground transition-colors text-left"
              title={s}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Or type your answer…"
          className="flex-1 min-w-0 h-8 px-3 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="h-8 px-3 rounded-md text-[11px] font-medium bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          Send
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <button
          onClick={() => onSubmit("")}
          className="text-secondary hover:text-foreground transition-colors"
          title="Build with the original prompt"
        >
          Skip — build with what I had
        </button>
        <button
          onClick={onCancel}
          className="text-secondary hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── VerificationPanel ──────────────────────────────────────────────────
// Stage 4 checklist that renders under each completed build. Three
// states: running (compact spinner row), error (single muted line), or
// ready (8-row checklist with click-to-fix on warn/fail entries). The
// panel is collapsible — once everything's green users usually want it
// out of the way; the header summary stays visible so scanning past
// builds still tells you the audit happened.
function VerificationPanel({
  state,
  onApplyFix,
}: {
  state: VerificationState;
  onApplyFix: (check: VerificationCheck) => void;
}) {
  // Default open while running OR when there's anything that isn't a
  // pass — users care most when something needs attention.
  const initiallyOpen =
    state.status === "running" ||
    (state.status === "ready" &&
      state.checks.some((c) => c.status !== "pass"));
  const [open, setOpen] = useState(initiallyOpen);

  if (state.status === "running") {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface-raised text-xs text-secondary">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Verifying build…</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface-raised text-xs text-secondary">
        <AlertCircle className="w-3.5 h-3.5 text-secondary" />
        <span>Verification skipped — {state.message}</span>
      </div>
    );
  }

  // status === "ready"
  const passCount = state.checks.filter((c) => c.status === "pass").length;
  const warnCount = state.checks.filter((c) => c.status === "warn").length;
  const failCount = state.checks.filter((c) => c.status === "fail").length;
  const overallTone =
    failCount > 0
      ? "fail"
      : warnCount > 0
        ? "warn"
        : "pass";

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-raised overflow-hidden">
      {/* Header — always visible. Click to expand/collapse the
          checklist. Tone color comes from the worst-case status so
          the user can scan past builds without expanding each one. */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-background/40 transition-colors"
      >
        <ChevronRight
          className={`w-3 h-3 shrink-0 text-secondary transition-transform duration-150 ${
            open ? "rotate-90" : ""
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground truncate">
            Verification · {passCount}/{state.checks.length} passed
          </div>
          <div className="text-[10px] text-secondary truncate">
            {state.summary}
          </div>
        </div>
        {(warnCount > 0 || failCount > 0) && (
          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
            {failCount > 0 ? `${failCount} fail` : `${warnCount} warn`}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
          {state.checks.map((c) => (
            <VerificationRow key={c.id} check={c} onApplyFix={onApplyFix} />
          ))}
        </div>
      )}
    </div>
  );
}

// One row in the verification checklist. Pulled out so each row owns
// its own "show files" toggle without re-rendering the whole panel.
function VerificationRow({
  check,
  onApplyFix,
}: {
  check: VerificationCheck;
  onApplyFix: (check: VerificationCheck) => void;
}) {
  const [filesOpen, setFilesOpen] = useState(false);
  const tone =
    check.status === "pass"
      ? "text-success"
      : check.status === "warn"
        ? "text-amber-500"
        : "text-red-500";
  const Icon =
    check.status === "pass"
      ? Check
      : check.status === "warn"
        ? AlertCircle
        : X;
  return (
    <div className="px-3 py-2 space-y-1.5">
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tone}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-foreground">
            {check.title}
          </div>
          {check.summary && (
            <div className="text-[11px] text-secondary leading-snug mt-0.5">
              {check.summary}
            </div>
          )}
        </div>
      </div>

      {(check.files.length > 0 || check.fixPrompt) && (
        <div className="ml-5.5 pl-0.5 flex items-center gap-3 text-[10px] font-mono">
          {check.files.length > 0 && (
            <button
              onClick={() => setFilesOpen(!filesOpen)}
              className="text-secondary hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ChevronRight
                className={`w-2.5 h-2.5 transition-transform duration-150 ${
                  filesOpen ? "rotate-90" : ""
                }`}
              />
              {check.files.length} file{check.files.length === 1 ? "" : "s"}
            </button>
          )}
          {check.fixPrompt && check.status !== "pass" && (
            <button
              onClick={() => onApplyFix(check)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors uppercase tracking-wider"
              title="Send this fix to the AI"
            >
              Apply fix
            </button>
          )}
        </div>
      )}

      {filesOpen && check.files.length > 0 && (
        <div className="ml-5.5 pl-0.5 space-y-0.5 text-[10px] font-mono text-secondary">
          {check.files.map((f, i) => (
            <div key={`vf-${i}`} className="truncate">
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
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

/* -------------------------------- PlanBox -------------------------------- */

// PlanBox renders the entire plan-mode interview as a single
// multi-step container instead of alternating chat bubbles. The
// design treats each AI question + the user's reply as one "step" on
// a vertical stepper:
//
//   ✓ 1. What kind of app?
//        > A todo list for teams
//   ✓ 2. Who's it for?
//        > Engineering managers
//   ● 3. What's the main feature?      ← current step
//        [chip] [chip] [chip]
//
// When the conversation reaches the "ready" state the same box
// re-skins as the approved plan summary with Build / Cancel actions,
// so the entire planning flow lives in one consistent surface (no
// per-message chrome floating around the chat).
type PlanConversation = {
  originalPrompt: string;
  messages: Array<
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; suggestions: string[] }
  >;
  status: "thinking" | "asking" | "ready" | "approved";
  plan: ApprovedPlan | null;
};

function PlanBox({
  conversation,
  onSuggestionClick,
  onApprovePlan,
  onCancelPlan,
  onUpdatePlan,
}: {
  conversation: PlanConversation;
  onSuggestionClick: (text: string) => void;
  onApprovePlan: () => void;
  onCancelPlan: () => void;
  // Forwarded to <PlanSummary> as `onChange` so palette swatches
  // are interactive once the plan is ready.
  onUpdatePlan: (plan: ApprovedPlan) => void;
}) {
  const { messages, status, plan } = conversation;
  const isReady = status === "ready" && plan !== null;
  const isApproved = status === "approved" && plan !== null;
  // Plan is "shown" (summary visible) once we hit either ready or
  // approved — the read-only stepper above stays the same in both
  // states; only the action footer differs.
  const showPlan = isReady || isApproved;

  // Pair every assistant question with its (optional) following user
  // reply so we can render the conversation as a numbered list of
  // steps. The interview always starts with an assistant turn (the
  // server seeds it), so the loop is straightforward — but we still
  // tolerate a leading orphan user message defensively.
  type Step = {
    question: { content: string; suggestions: string[] } | null;
    answer: string | null;
  };
  const steps: Step[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role === "assistant") {
      const next = messages[i + 1];
      const answer = next && next.role === "user" ? next.content : null;
      steps.push({
        question: { content: m.content, suggestions: m.suggestions },
        answer,
      });
      if (answer !== null) i++;
    } else {
      // Orphan user message at the head — render as an "answer"
      // with no question above it.
      steps.push({ question: null, answer: m.content });
    }
  }

  // The current step is the last one without a user reply. While
  // the conversation is "thinking" before the next assistant turn
  // arrives, the last step DOES have a reply — we surface the typing
  // indicator below the steps in that case instead of inside one.
  const lastStepIdx = steps.length - 1;
  const lastMsg = messages[messages.length - 1];
  const isAwaitingAssistant =
    status === "thinking" && lastMsg?.role === "user";

  return (
    <div className="bg-surface-raised rounded-xl p-4 space-y-3">
      {/* Header — swaps label when the plan is ready. The leading
          icon was dropped per design feedback; the title alone is
          enough chrome for the box. */}
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-foreground">
          {isApproved
            ? "Plan added to chat"
            : isReady
            ? "Plan ready"
            : "Planning your app"}
        </div>
        {!showPlan && steps.length > 0 && (
          <div className="ml-auto text-[10px] font-mono uppercase tracking-wider text-secondary">
            Step {lastStepIdx + 1}
          </div>
        )}
      </div>

      {/* Vertical stepper. The connecting line lives on each row
          (except the last) so steps can grow/shrink without breaking
          the rail. */}
      <ol className="space-y-3">
        {steps.map((step, idx) => {
          const isLastStep = idx === lastStepIdx;
          const isCurrent = !showPlan && isLastStep && step.answer === null;
          const isCompleted = showPlan || step.answer !== null;
          // Mid-stream shimmer — the current question is "writing"
          // until either the suggestions chips arrive (asking turn)
          // or the conversation flips to ready (final plan turn).
          const isMidStream =
            isCurrent &&
            status !== "asking" &&
            (step.question?.suggestions.length ?? 0) === 0 &&
            (step.question?.content.length ?? 0) > 0;

          return (
            <li key={`step-${idx}`} className="relative pl-9">
              {/* Connecting rail to the next step. */}
              {!isLastStep && (
                <span
                  className="absolute left-3 top-7 bottom-[-12px] w-px bg-border/70"
                  aria-hidden
                />
              )}
              {/* Step indicator badge. */}
              <span
                className={`absolute left-0 top-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono ${
                  isCompleted
                    ? "bg-primary/15 text-primary"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-secondary"
                }`}
                aria-label={
                  isCompleted
                    ? `Step ${idx + 1} complete`
                    : `Step ${idx + 1} current`
                }
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  idx + 1
                )}
              </span>

              {/* Step body — the question, then the answer (or chips
                  if it's the current unanswered step). */}
              <div className="space-y-1.5 min-w-0">
                {step.question && (
                  <div className="text-sm leading-snug text-foreground whitespace-pre-wrap break-words">
                    {step.question.content ? (
                      <span className={isMidStream ? "shimmer-text" : ""}>
                        {step.question.content}
                      </span>
                    ) : (
                      <span className="text-secondary italic">…</span>
                    )}
                  </div>
                )}

                {step.answer !== null && (
                  <div className="text-xs leading-snug text-secondary whitespace-pre-wrap break-words pl-2 border-l-2 border-border/50">
                    {step.answer}
                  </div>
                )}

                {isCurrent &&
                  status === "asking" &&
                  (step.question?.suggestions.length ?? 0) > 0 && (
                    // Stacked suggestion options. Used to be inline
                    // pills on a wrapped row, but at typical chat
                    // widths the AI's suggestions are full sentences
                    // that wrap mid-pill and look noisy. Stacking
                    // vertically gives each option a real click
                    // target and the hover chevron telegraphs that
                    // tapping it submits the reply.
                    <div className="flex flex-col gap-1.5 pt-1">
                      {step.question!.suggestions.map((s, j) => (
                        <button
                          key={`sug-${idx}-${j}`}
                          onClick={() => onSuggestionClick(s)}
                          className="group flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg bg-surface hover:bg-background hover:ring-1 hover:ring-primary/40 text-xs leading-snug text-foreground hover:text-primary text-left transition-all"
                          title={s}
                        >
                          <span className="flex-1 min-w-0 break-words">
                            {s}
                          </span>
                          <ChevronRight
                            className="w-3.5 h-3.5 shrink-0 text-secondary group-hover:text-primary opacity-60 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all"
                            aria-hidden
                          />
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* "Thinking…" indicator while the next assistant turn is in
          flight (i.e. user just sent a reply, server hasn't pushed
          the new assistant placeholder yet). Uses the same
          shimmer-text treatment as the build-mode streaming block
          so plan mode and build mode share one consistent
          "we're working on it" cue, instead of mixing dots here
          with shimmer there. Sits flush with the stepper rail so
          it reads as the next step taking shape. */}
      {isAwaitingAssistant && (
        <div className="pl-9 text-sm leading-snug">
          <span className="shimmer-text">Thinking…</span>
        </div>
      )}

      {/* Final plan + actions. Replaces no part of the stepper —
          the completed steps stay visible above as the paper trail
          of how we got here. The footer swaps once the user clicks
          "Add to chat": the actions disappear and a small hint
          replaces them, since the build is now driven by the chat
          composer's Send button (not the card). */}
      {showPlan && plan && (
        <>
          <div className="border-t border-border/60 pt-3">
            {/* Once the plan is approved into the composer, freeze
                the palette picker. Otherwise tapping a swatch silently
                desyncs the visual chips from the formatted hex codes
                already in the chat input — and re-formatting the
                prompt would clobber any edits the user made. The
                composer is now the source of truth. */}
            <PlanSummary
              plan={plan}
              onChange={isApproved ? undefined : onUpdatePlan}
            />
          </div>
          {isReady ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={onApprovePlan}
                className="h-8 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add to chat
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelPlan}
                className="h-8 text-xs text-secondary hover:text-foreground ml-auto"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          ) : (
            // status === "approved" — the formatted plan is now in
            // the composer below. We hide the action buttons (and
            // intentionally drop Cancel) so the planning thread
            // stays put as the paper trail. The user drives the
            // actual build from the chat input.
            <div className="flex items-center gap-1.5 text-[11px] text-secondary border-t border-border/40 pt-2">
              <ChevronDown className="w-3.5 h-3.5 text-primary" aria-hidden />
              <span>
                Edit the prompt below and hit Send to build.
              </span>
            </div>
          )}
        </>
      )}
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

  // ─── Blank-screen guard ─────────────────────────────────────────────
  // Even after `index.html` exists, the iframe can flash white in two
  // common cases: (a) the parent forces a remount via `iframeKey++`
  // after every build, and the dev server briefly serves a blank
  // document while it re-bundles; (b) the user's app renders nothing
  // (router with no matched route, runtime error caught upstream by
  // the overlay, etc.). In either case the user sees a stark white
  // frame that looks broken. We layer the branded preview state on
  // top of the iframe and only fade it out once the iframe has both
  // fired `load` AND has actual content in its body.
  const localIframeRef = useRef<HTMLIFrameElement>(null);
  const effectiveIframeRef = iframeRef ?? localIframeRef;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeBlank, setIframeBlank] = useState(true);

  // Reset the load/blank flags whenever the iframe remounts. Without
  // this a stale "loaded + not blank" snapshot would suppress the
  // overlay during the white flash on remount.
  useEffect(() => {
    setIframeLoaded(false);
    setIframeBlank(true);
  }, [previewSrc, hasIndex]);

  const checkBlank = () => {
    const frame = effectiveIframeRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.body) {
        setIframeBlank(true);
        return;
      }
      // Two signals: visible text AND any element children. Either
      // one is enough to call the page "not blank" — a SVG-only logo
      // splash has no text but plenty of children, and a streaming
      // text-only response has no children but plenty of text.
      const text = (doc.body.innerText || "").trim();
      const hasChildren = doc.body.children.length > 0;
      setIframeBlank(!text && !hasChildren);
    } catch {
      // Cross-origin guard — shouldn't fire because the sandbox
      // includes `allow-same-origin`, but if the browser ever blocks
      // the read, assume not blank rather than locking the overlay on.
      setIframeBlank(false);
    }
  };

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    // Sample now and at two follow-up beats to give a React app time
    // to mount, hydrate, and render its first frame. 600ms covers
    // most apps; 1500ms catches slower ones (lazy-loaded routes,
    // image-heavy splash screens).
    checkBlank();
    window.setTimeout(checkBlank, 600);
    window.setTimeout(checkBlank, 1500);
  };

  // Pick the best overlay for the current state. Building state when
  // the app is mid-stream OR while the iframe is still loading; empty
  // state when the iframe loaded but rendered nothing (so the user
  // gets a clear "your preview will appear here" cue instead of a
  // blank page). The overlay sits on top of the iframe and fades
  // out the moment real content shows up.
  const showLiveOverlay = hasIndex && (!iframeLoaded || iframeBlank);
  const liveOverlay =
    isBuilding || !iframeLoaded ? <PreviewBuildingState /> : <PreviewEmptyState />;

  return (
    <div className="absolute inset-0 flex flex-col bg-surface-raised">
      <div className="flex-1 p-3 md:p-8 flex items-center justify-center overflow-hidden">
        <div
          className="w-full h-full flex flex-col transition-all duration-200 ease-in-out rounded-md overflow-hidden shadow-2xl relative"
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
              ref={effectiveIframeRef}
              src={previewSrc}
              onLoad={handleIframeLoad}
              title="App preview"
              className="flex-1 w-full bg-white"
              // `allow-same-origin` is REQUIRED, not optional. Without it
              // the iframe runs at a `null` origin, which means every
              // `fetch("/api/preview/.../components/Foo.jsx")` the
              // overlay's script loader makes is treated as cross-origin
              // by the browser. Our CORS allowlist (lib/origin-allowlist
              // on the API side) does NOT include `null`, so the response
              // arrives without an `Access-Control-Allow-Origin` header
              // and Safari rejects it with the terse error string
              // "Load failed" — surfaced to the user as the bottom-right
              // "Failed to load components/Nav.jsx" badge. The AI then
              // chases its tail trying to "fix" file contents that
              // aren't actually broken, because the fetch never reached
              // the server's response body. The same iframe pattern in
              // pages/project.tsx (the public viewer) already includes
              // allow-same-origin for exactly this reason; this was a
              // long-standing oversight on the builder page only.
              //
              // The combination of `allow-scripts` + `allow-same-origin`
              // for an iframe served from our own origin does technically
              // let the iframe's JS read the parent document — but the
              // preview is user-authored code we EXPLICITLY trust to
              // run, the parent already broadcasts via postMessage("*"),
              // and the public viewer ships the same combination, so
              // there is no new exposure here.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}

          {/* Blank-screen overlay. Sits on top of the iframe (the
              parent device frame is `relative`) and only when the
              iframe is mid-load or has rendered nothing. Pointer
              events disabled so the user can still interact with
              the iframe content as soon as something paints in. */}
          {showLiveOverlay && (
            <div
              className="absolute inset-0 pointer-events-none animate-in fade-in duration-200"
              aria-hidden={iframeLoaded && !iframeBlank}
            >
              <PreviewPaneShell>{liveOverlay}</PreviewPaneShell>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Shared "device" backdrop used for every non-iframe state so the empty
// and building screens share one consistent branded surface (subtle
// radial glow on top of the dark builder canvas) instead of dropping
// the user onto a stark white card. The faint grid texture overlay
// was removed per design feedback so the canvas reads as a clean
// gradient surface.
function PreviewPaneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="preview-canvas flex-1 flex flex-col relative overflow-hidden">
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
          className="preview-glow absolute inset-0 -m-6 rounded-full blur-2xl opacity-40"
        />
        <BrandLogo className="relative h-10 w-auto text-foreground opacity-95" />
      </div>
      <div className="space-y-2 max-w-sm">
        <div className="text-lg font-semibold text-foreground">
          Your preview will appear here
        </div>
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
          className="preview-glow absolute inset-0 -m-4 rounded-full blur-2xl opacity-50"
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
                Create database
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

// Ordered visual steps for the Publishing tab step list.
// Matches the server-side pipeline phases — if you add a phase there,
// add a row here. `provisioning_db` is included for completeness even
// though it's currently skipped (auto-provisioning is opt-in); the step
// is simply marked "done" when the status jumps over it.
const DEPLOY_VISUAL_STEPS: {
  key: ApiDeployment["status"];
  label: string;
  hint: string;
}[] = [
  { key: "validating",       label: "Validating files",     hint: "Checking your project files for issues" },
  { key: "creating_project", label: "Creating project",     hint: "Setting up your Vercel project" },
  { key: "deploying",        label: "Uploading files",      hint: "Sending your app files to Vercel" },
  { key: "polling",          label: "Building app",         hint: "Vite is bundling and optimising your code" },
  { key: "live",             label: "Deployed",             hint: "Your app is live on the web" },
];

// Maps each status to its position in the visual pipeline so we can
// decide which steps are done, active, or upcoming.
const STATUS_TO_STEP_IDX: Partial<Record<ApiDeployment["status"], number>> = {
  queued:           0, // treat as "about to validate"
  validating:       0,
  provisioning_db:  1, // skipped in practice, maps to creating_project
  creating_project: 1,
  deploying:        2,
  polling:          3,
  live:             4,
};

function DeploymentStatusCard({
  deployment,
  primaryCustomDomain,
}: {
  deployment: ApiDeployment | null;
  primaryCustomDomain: string | null;
}) {
  // Empty state — no deployments yet.
  if (!deployment) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Not published yet</div>
          <div className="text-[12px] text-secondary mt-0.5">
            Hit <span className="font-medium text-text">Publish</span> in the
            toolbar to deploy your app. After the first publish you can attach
            a custom domain below.
          </div>
        </div>
      </div>
    );
  }

  const isLive   = deployment.status === "live";
  const isFailed = deployment.status === "failed";
  const isInflight = !isLive && !isFailed;

  const currentStepIdx = STATUS_TO_STEP_IDX[deployment.status] ?? 0;

  // Prefer verified custom domain over the auto-generated *.vercel.app URL.
  const displayUrl = isLive
    ? primaryCustomDomain
      ? `https://${primaryCustomDomain}`
      : deployment.liveUrl
    : null;

  const finished = deployment.finishedAt ?? null;

  // Card header accent colours.
  const headerAccent = isLive
    ? "bg-success/10 text-success"
    : isFailed
    ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";
  const HeaderIcon = isLive ? Check : isFailed ? AlertCircle : Loader2;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${headerAccent}`}>
          <HeaderIcon className={`w-4.5 h-4.5 ${isInflight ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-sm font-semibold leading-tight">
            {isLive ? "Deployed successfully" : isFailed ? "Deployment failed" : "Deploying your app…"}
          </div>
          <div className="text-[11px] text-secondary mt-0.5">
            {isInflight
              ? "Usually takes 30–90 seconds · steps update automatically"
              : finished
              ? timeAgo(finished)
              : null}
          </div>
        </div>
      </div>

      {/* ── Live URL ── */}
      {isLive && displayUrl && (
        <div className="flex flex-wrap items-center gap-2 pl-12">
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:underline truncate max-w-full"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{displayUrl.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[11px] font-mono text-secondary hover:text-text px-2 py-1 rounded hover:bg-background"
            onClick={() => { void navigator.clipboard.writeText(displayUrl); toast.success("Copied URL"); }}
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      )}
      {isLive && !displayUrl && (
        <p className="text-[12px] text-secondary pl-12">
          Live URL isn't available yet — refresh in a moment.
        </p>
      )}

      {/* ── Vertical step list ── */}
      <div className="pl-2">
        {DEPLOY_VISUAL_STEPS.map((step, i) => {
          const isLast = i === DEPLOY_VISUAL_STEPS.length - 1;
          const isDone    = isLive || (!isFailed && currentStepIdx > i);
          const isActive  = !isFailed && !isLive && currentStepIdx === i;
          const isUpcoming = !isFailed && !isLive && currentStepIdx < i;

          // When failed we render all steps in a neutral style + an error row below.
          const isMuted = isFailed;

          const dotCls = isDone
            ? "bg-success text-white"
            : isActive
            ? "bg-primary text-white"
            : isMuted
            ? "bg-border text-secondary"
            : "border-2 border-border bg-surface";

          const labelCls = isActive
            ? "text-text font-semibold"
            : isDone
            ? "text-text"
            : "text-secondary";

          return (
            <div key={step.key} className="flex items-stretch gap-3">
              {/* Dot + connector line */}
              <div className="flex flex-col items-center" style={{ width: 20 }}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${dotCls}`}>
                  {isDone && <Check className="w-3 h-3" />}
                  {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                {!isLast && (
                  <div className={`w-px flex-1 mt-1 mb-1 ${isDone ? "bg-success/30" : "bg-border"}`} />
                )}
              </div>

              {/* Label + optional hint */}
              <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
                <div className={`text-[13px] leading-5 ${labelCls}`}>{step.label}</div>
                {isActive && (
                  <div className="text-[11px] text-secondary mt-0.5">{step.hint}</div>
                )}
              </div>
            </div>
          );
        })}

        {/* Extra row when failed */}
        {isFailed && (
          <div className="flex items-start gap-3 mt-1">
            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-destructive text-white shrink-0">
              <X className="w-3 h-3" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-destructive">Failed</div>
              <div className="text-[11px] text-destructive/80 mt-0.5 break-words max-w-xs">
                {deployment.errorMessage ?? "Something went wrong."}
              </div>
              <div className="text-[11px] text-secondary mt-1">
                Tap <span className="font-medium text-text">Republish</span> in
                the toolbar to try again.
              </div>
            </div>
          </div>
        )}
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
      title="Publishing"
      subtitle="Track your deployment and connect a custom domain."
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

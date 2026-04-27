import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAppConfigQueryKey,
  useAppConfig as useGeneratedAppConfig,
} from "@workspace/api-client-react";
import type { z } from "zod";
import type {
  AdminCostByModel as GeneratedAdminCostByModel,
  AdminMe,
  AdminRecentBuild as GeneratedAdminRecentBuild,
  AdminStats as GeneratedAdminStats,
  AdminTemplateItem,
  AdminUser as GeneratedAdminUser,
  AppConfig,
  Build,
  CreateProjectResponse,
  Deployment,
  DeploymentStatus,
  DomainDnsMismatch,
  DomainSuggestedRecord,
  DomainVerificationRecord,
  AdminPayout as GeneratedAdminPayout,
  Earning as GeneratedEarning,
  EarningsSummary as GeneratedEarningsSummary,
  MyPayoutAccount as GeneratedMyPayoutAccount,
  MyReferrals as GeneratedMyReferrals,
  PayoutCycleResult as GeneratedPayoutCycleResult,
  PayoutOnboardingLink as GeneratedPayoutOnboardingLink,
  PayoutSettings as GeneratedPayoutSettings,
  UpdatePayoutSettingsBody as GeneratedUpdatePayoutSettingsBody,
  ReferralSourceBreakdown as GeneratedReferralSourceBreakdown,
  ReferredUser as GeneratedReferredUser,
  ExploreItem,
  Me,
  Project,
  ProjectDomain,
  ProjectFile,
  ProjectFileContent,
  ProjectListItem,
  PublishResponse,
  PublishStatus,
  SetPrimaryDomainResponse,
  TemplateItem,
  Transaction,
  User,
} from "@workspace/api-zod";
// `UpdateMeBody` and `DeleteProjectFileResponse` are also zod schema names —
// pull them as values and infer the shapes, since the same identifiers
// aren't re-exported as types from `@workspace/api-zod`.
import {
  DeleteProjectFileResponse as DeleteProjectFileResponseSchema,
  UpdateMeBody as UpdateMeBodySchema,
  UpdateProjectBody as UpdateProjectBodySchema,
  CompleteOnboardingBody as CompleteOnboardingBodySchema,
} from "@workspace/api-zod";

const BASE = "/api";

// Thrown for any non-2xx response. Carries the parsed JSON body when present
// so callers can branch on structured fields like `requiresUpgrade` without
// re-parsing the response.
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status}: ${text || res.statusText}`;
    throw new ApiError(res.status, body, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Types ----
// All `Api*` shapes below are aliases of the OpenAPI-derived types from
// `@workspace/api-zod`. Keeping the `Api*` names preserves the existing
// import surface (builder.tsx, dashboard.tsx) while making the spec the
// single source of truth.
export type ApiUser = User;
export type ApiMe = Me;
export type ApiProjectListItem = ProjectListItem;
export type ApiProject = Project;
export type ApiBuild = Build;
export type ApiExploreItem = ExploreItem;
export type ApiTemplateItem = TemplateItem;
export type ApiAdminTemplateItem = AdminTemplateItem;
export type ApiUpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;
export type ApiTransaction = Transaction;

export type UpdateMeBody = z.infer<typeof UpdateMeBodySchema>;
export type CompleteOnboardingBody = z.infer<typeof CompleteOnboardingBodySchema>;

// ---- Hooks ----
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => request<ApiMe>("/me"),
    // Cap to a single retry so callers (e.g. <BuildNew>) that have their
    // own bounded retry loop don't end up stacking 3 default react-query
    // retries with backoff on top of their own budget. A genuine 401 is
    // surfaced quickly; transient races (the auth cookie landing milliseconds
    // after the gate's first call) still get a second chance.
    retry: 1,
  });
}

export function useMyProjects() {
  return useQuery({
    queryKey: ["me", "projects"],
    queryFn: () => request<ApiProjectListItem[]>("/me/projects"),
  });
}

export function useMyTransactions() {
  return useQuery({
    queryKey: ["me", "transactions"],
    queryFn: () => request<ApiTransaction[]>("/me/transactions"),
  });
}

export type ApiEarning = GeneratedEarning;
export type ApiEarningsSummary = GeneratedEarningsSummary;

export function useMyEarningsSummary() {
  return useQuery({
    queryKey: ["me", "earnings", "summary"],
    queryFn: () => request<ApiEarningsSummary>("/me/earnings/summary"),
  });
}

export function useMyEarnings() {
  return useQuery({
    queryKey: ["me", "earnings"],
    queryFn: () => request<ApiEarning[]>("/me/earnings"),
  });
}

export type ApiMyReferrals = GeneratedMyReferrals;
export type ApiReferralSourceBreakdown = GeneratedReferralSourceBreakdown;
export type ApiReferredUser = GeneratedReferredUser;

export function useMyReferrals() {
  return useQuery({
    queryKey: ["me", "referrals"],
    queryFn: () => request<ApiMyReferrals>("/me/referrals"),
  });
}

export function useUser(username: string | undefined) {
  return useQuery({
    queryKey: ["users", username],
    queryFn: () => request<ApiUser>(`/users/${username}`),
    enabled: !!username,
  });
}

export function useUserProjects(username: string | undefined) {
  return useQuery({
    queryKey: ["users", username, "projects"],
    queryFn: () => request<ApiProjectListItem[]>(`/users/${username}/projects`),
    enabled: !!username,
  });
}

// Re-exported from the shared API contract so existing callers that
// imported `ApiAppConfig` from this module keep compiling. New code
// should import `AppConfig` directly from `@workspace/api-zod`.
export type ApiAppConfig = AppConfig;

// Server-advertised limits for the Files panel size gauge and the
// per-file upload pre-flight. The server is the single source of truth
// (see `GET /api/config`); these fallback numbers only render the gauge
// during the very first paint before the config query resolves, so the
// bar doesn't briefly show "X / 0 MB". They're intentionally generous
// enough that nothing renders as "over" in that window.
const FALLBACK_APP_CONFIG: AppConfig = {
  publishSizeLimitBytes: 90 * 1024 * 1024,
  perFileUploadLimitBytes: 10 * 1024 * 1024,
};

// One-shot fetch of the public config endpoint. Cached forever (the
// values can only change via a server redeploy) and seeded with
// fallbacks so consumers never see `undefined` even on the first paint.
// The query is mounted once at the app root via <ConfigPrewarm/> so
// any later consumer hits the warmed cache immediately.
//
// Delegates to the codegen'd hook from `@workspace/api-client-react` so
// the URL, query key, and response type all flow from the OpenAPI spec
// — adding the next public-config field becomes "edit the spec, run
// codegen". The wrapper only layers on the cache-forever / fallback
// behaviour the deploybro UI relies on.
export function useAppConfig() {
  return useGeneratedAppConfig({
    query: {
      queryKey: getAppConfigQueryKey(),
      staleTime: Infinity,
      gcTime: Infinity,
      placeholderData: FALLBACK_APP_CONFIG,
    },
  });
}

// Convenience wrapper that always returns a non-nullable AppConfig
// by collapsing the loading state into the fallback. Use this when the
// caller just wants the numbers (gauge widths, pre-flight bounds) and
// has no need to distinguish "loading" from "loaded".
export function useAppConfigValues(): AppConfig {
  const { data } = useAppConfig();
  return data ?? FALLBACK_APP_CONFIG;
}

// "utf8" for source code, "base64" for binary uploads (images,
// fonts, favicons, etc.). The Files panel uses this to show a
// binary badge and to switch the editor over to a preview pane.
// `contentType` is the browser-supplied MIME type captured at upload
// time — null for AI-generated text files (the iframe preview falls
// back to an extension-derived type in that case).
export type ApiProjectFile = ProjectFile;

// For utf8 files `content` is the source string. For base64 files
// it's the raw base64 of the bytes — combine with `contentType` to
// build a `data:` URL for an <img> preview.
export type ApiProjectFileContent = ProjectFileContent;

export function useProjectFiles(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "files"],
    queryFn: () =>
      request<ApiProjectFile[]>(`/projects/${username}/${slug}/files`),
    enabled: !!username && !!slug,
  });
}

export function useProjectFile(
  username: string | undefined,
  slug: string | undefined,
  path: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "file", path],
    queryFn: () =>
      request<ApiProjectFileContent>(
        `/projects/${username}/${slug}/files/${path}`,
      ),
    enabled: !!username && !!slug && !!path,
  });
}

// Reads a File as a base64 string (no `data:` prefix). Used by the
// upload mutation below — the server expects raw base64 in the JSON
// body so it can decode and size-check before persisting.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file as data URL"));
        return;
      }
      // result is `data:<mime>;base64,<payload>` — strip the prefix.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

// Upload a binary asset (image, font, favicon, etc.) into the project.
// `path` is what the user wants the file stored as — typically just the
// File.name dropped into the project root, but callers can prefix a
// folder if they want (e.g. "public/logo.png").
export function useUploadProjectFile(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; path?: string }) => {
      if (!username || !slug) throw new Error("Project not loaded");
      const path = (input.path ?? input.file.name).trim();
      if (!path) throw new Error("Missing file path");
      const contentBase64 = await fileToBase64(input.file);
      return request<ApiProjectFile>(
        `/projects/${username}/${slug}/files/upload`,
        {
          method: "POST",
          body: JSON.stringify({
            path,
            contentBase64,
            contentType: input.file.type || undefined,
          }),
        },
      );
    },
    onSuccess: (uploaded) => {
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "files"],
      });
      // Drop the cached single-file content so the editor re-fetches if
      // the user re-uploads the same path.
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "file", uploaded.path],
      });
    },
  });
}

// Delete a file from the project. Used by the Files panel to undo a
// mistaken upload.
export function useDeleteProjectFile(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      if (!username || !slug) throw new Error("Project not loaded");
      return request<z.infer<typeof DeleteProjectFileResponseSchema>>(
        `/projects/${username}/${slug}/files/${path}`,
        { method: "DELETE" },
      );
    },
    onSuccess: (_data, path) => {
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "files"],
      });
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "file", path],
      });
    },
  });
}

export function useProject(username: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["projects", username, slug],
    queryFn: () => request<ApiProject>(`/projects/${username}/${slug}`),
    enabled: !!username && !!slug,
  });
}

export function useProjectBuilds(username: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["projects", username, slug, "builds"],
    queryFn: () => request<ApiBuild[]>(`/projects/${username}/${slug}/builds`),
    enabled: !!username && !!slug,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => request<ApiTemplateItem[]>("/templates"),
  });
}

export function useUpdateProject(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiUpdateProjectBody) => {
      if (!username || !slug) throw new Error("Project not loaded");
      return request<ApiProject>(`/projects/${username}/${slug}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug] });
      qc.invalidateQueries({ queryKey: ["users", username, "projects"] });
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
      qc.invalidateQueries({ queryKey: ["templates"] });
      // Slug never changes on this PATCH (rename has its own endpoint),
      // so this is just a faster path to the freshest data.
      qc.setQueryData(["projects", username, updated.slug], updated);
    },
  });
}

export function useExplore(params: { q?: string; framework?: string; sort?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.framework && params.framework !== "all") search.set("framework", params.framework);
  if (params.sort) search.set("sort", params.sort);
  const qs = search.toString();
  return useQuery({
    queryKey: ["explore", params],
    queryFn: () => request<ApiExploreItem[]>(`/explore${qs ? `?${qs}` : ""}`),
  });
}

export function useCreateBuild(username: string | undefined, slug: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { prompt: string; model?: string }) =>
      request<ApiBuild>(`/projects/${username}/${slug}/builds`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug] });
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "builds"] });
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

// ---- Admin ----
export type AdminStats = GeneratedAdminStats;
export type AdminRecentBuild = GeneratedAdminRecentBuild;
export type AdminUser = GeneratedAdminUser;
export type AdminCostByModel = GeneratedAdminCostByModel;

export function useIsAdmin() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => request<AdminMe>("/admin/me"),
    retry: false,
  });
}
export function useAdminStats() {
  return useQuery({ queryKey: ["admin", "stats"], queryFn: () => request<AdminStats>("/admin/stats") });
}
export function useAdminRecentBuilds() {
  return useQuery({ queryKey: ["admin", "recent-builds"], queryFn: () => request<AdminRecentBuild[]>("/admin/recent-builds") });
}
export function useAdminUsers() {
  return useQuery({ queryKey: ["admin", "users"], queryFn: () => request<AdminUser[]>("/admin/users") });
}

export function useUpdateUserCommissionPct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; referralCommissionPct: number | null }) =>
      request<AdminUser>(`/admin/users/${vars.id}/commission-pct`, {
        method: "PATCH",
        body: JSON.stringify({
          referralCommissionPct: vars.referralCommissionPct,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
export function useAdminCostByModel() {
  return useQuery({ queryKey: ["admin", "cost-by-model"], queryFn: () => request<AdminCostByModel[]>("/admin/cost-by-model") });
}

export function useAdminTemplates() {
  return useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => request<ApiAdminTemplateItem[]>("/admin/templates"),
  });
}

export function useSetFeaturedTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; isFeaturedTemplate: boolean }) =>
      request<ApiAdminTemplateItem>(
        `/admin/projects/${vars.id}/feature-template`,
        {
          method: "PATCH",
          body: JSON.stringify({ isFeaturedTemplate: vars.isFeaturedTemplate }),
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "templates"] });
      qc.invalidateQueries({ queryKey: ["templates"] });
      // Also refresh any open project / dashboard views so the
      // "Featured template" badge reflects the new state immediately.
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeBody) =>
      request<ApiMe>(`/me`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// Submit the post-signup onboarding answers. The server stamps
// `onboardedAt` on success, which is what the AuthGate reads to decide
// whether to keep bouncing the user back into the flow on subsequent
// gated route mounts.
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CompleteOnboardingBody) =>
      request<ApiMe>(`/me/onboarding`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      // Seed the cache with the just-returned Me row so the AuthGate
      // (and any other useMe() readers) see the onboardedAt update
      // immediately — without this we'd race the next refetch and
      // potentially redirect the user back to /onboarding for a frame.
      qc.setQueryData(["me"], data);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRenameProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { slug: string; name: string }) =>
      request<ApiProjectListItem>(`/me/projects/${vars.slug}`, {
        method: "PATCH",
        body: JSON.stringify({ name: vars.name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      request<void>(`/me/projects/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; framework?: string }) =>
      request<CreateProjectResponse>(`/me/projects`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

// ---- Publish / Deployments ----
export type { DeploymentStatus };

export type ApiDeployment = Deployment;

// `primaryCustomDomain` is the user's verified custom domain that should
// replace `liveUrl` in the navbar chip. Null when no custom domain is set
// or none have verified.
export type ApiPublishStatus = PublishStatus;

export const TERMINAL_DEPLOYMENT_STATUSES: ReadonlySet<DeploymentStatus> = new Set([
  "live",
  "failed",
]);

// Human-readable label for each pipeline phase. Used in the navbar pill and
// the History pane so they stay in sync.
export function deploymentStepLabel(s: DeploymentStatus): string {
  switch (s) {
    case "queued":
      return "Queued";
    case "validating":
      return "Validating files";
    case "provisioning_db":
      return "Provisioning DB";
    case "creating_project":
      return "Creating project";
    case "deploying":
      return "Deploying";
    case "polling":
      return "Going live";
    case "live":
      return "Live";
    case "failed":
      return "Failed";
  }
}

export function usePublishProject(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request<PublishResponse>(
        `/projects/${username}/${slug}/publish`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "deployments"],
      });
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "publish-status"],
      });
    },
  });
}

export function useDeployments(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "deployments"],
    queryFn: () =>
      request<ApiDeployment[]>(`/projects/${username}/${slug}/deployments`),
    enabled: !!username && !!slug,
  });
}

// Polls every 3s while the deployment is still in flight. Once the row hits
// `live` or `failed`, the interval drops to a slow refresh so the History
// pane stays accurate without hammering the API. On terminal transition we
// also invalidate the deployments list and the navbar publish-status chip
// so they refresh without a manual reload.
export function useDeploymentStatus(
  username: string | undefined,
  slug: string | undefined,
  deploymentId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["projects", username, slug, "deployments", deploymentId],
    queryFn: async () => {
      const data = await request<ApiDeployment>(
        `/projects/${username}/${slug}/deployments/${deploymentId}`,
      );
      if (TERMINAL_DEPLOYMENT_STATUSES.has(data.status)) {
        qc.invalidateQueries({
          queryKey: ["projects", username, slug, "deployments"],
        });
        qc.invalidateQueries({
          queryKey: ["projects", username, slug, "publish-status"],
        });
      }
      return data;
    },
    enabled: !!username && !!slug && !!deploymentId,
    refetchInterval: (q) => {
      const data = q.state.data as ApiDeployment | undefined;
      if (!data) return 3000;
      return TERMINAL_DEPLOYMENT_STATUSES.has(data.status) ? false : 3000;
    },
  });
}

export function usePublishStatus(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "publish-status"],
    queryFn: () =>
      request<ApiPublishStatus>(
        `/projects/${username}/${slug}/publish-status`,
      ),
    enabled: !!username && !!slug,
  });
}

// ---- Custom domains ----
export type ApiDomainVerificationRecord = DomainVerificationRecord;
export type ApiDomainSuggestedRecord = DomainSuggestedRecord;
export type ApiDomainDnsMismatch = DomainDnsMismatch;
// `aValues`/`cnames` are the resolver-side DNS values the server learned
// from Vercel — null until a refresh has succeeded at least once.
// `dnsMismatch` is a pre-computed hint for the UI: present when the user's
// DNS points somewhere clearly other than the expected Vercel target.
export type ApiProjectDomain = ProjectDomain;

export function useProjectDomains(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "domains"],
    queryFn: () =>
      request<ApiProjectDomain[]>(`/projects/${username}/${slug}/domains`),
    enabled: !!username && !!slug,
    // While at least one row is unverified or misconfigured, poll so the
    // UI flips to "Active" without the user clicking "Refresh status".
    refetchInterval: (q) => {
      const data = q.state.data as ApiProjectDomain[] | undefined;
      if (!data || data.length === 0) return false;
      const anyPending = data.some((d) => !d.verified || d.misconfigured);
      return anyPending ? 15000 : false;
    },
  });
}

export function useAddDomain(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (host: string) =>
      request<ApiProjectDomain>(`/projects/${username}/${slug}/domains`, {
        method: "POST",
        body: JSON.stringify({ host }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "domains"] });
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "publish-status"] });
    },
  });
}

export function useRemoveDomain(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (host: string) =>
      request<void>(
        `/projects/${username}/${slug}/domains/${encodeURIComponent(host)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "domains"] });
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "publish-status"] });
    },
  });
}

export function useVerifyDomain(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (host: string) =>
      request<ApiProjectDomain>(
        `/projects/${username}/${slug}/domains/${encodeURIComponent(host)}/verify`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "domains"] });
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "publish-status"] });
    },
  });
}

export function useSetPrimaryDomain(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (host: string) =>
      request<SetPrimaryDomainResponse>(
        `/projects/${username}/${slug}/domains/${encodeURIComponent(host)}/primary`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "domains"] });
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "publish-status"] });
    },
  });
}

// ---- Per-project database (Database tab) ----

export type ApiProjectDbInfo =
  | { provisioned: false }
  | {
      provisioned: true;
      provider: "neon";
      host: string;
      database: string;
      size: string;
      version: string;
      connectionString: string;
    };

export type ApiProjectDbTable = {
  schema: string;
  name: string;
  rows: number;
  exact: boolean;
  size: string;
  lastChange: string | null;
};

export type ApiProjectDbTables = {
  provisioned: boolean;
  tables: ApiProjectDbTable[];
};

export function useProjectDbInfo(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "db", "info"],
    enabled: !!username && !!slug,
    queryFn: () =>
      request<ApiProjectDbInfo>(`/projects/${username}/${slug}/db/info`),
  });
}

export function useProjectDbTables(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "db", "tables"],
    enabled: !!username && !!slug,
    queryFn: () =>
      request<ApiProjectDbTables>(`/projects/${username}/${slug}/db/tables`),
  });
}

export function useProvisionProjectDb(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request<{ provisioned: true; alreadyProvisioned: boolean }>(
        `/projects/${username}/${slug}/db/provision`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", username, slug, "db"] });
    },
  });
}

// ---------- Project env vars ----------
//
// Mirror of `project_env_vars` rows. The list endpoint masks secret
// values (returns "••••••••") and only returns plaintext for non-secret
// flags. Use `useRevealProjectEnvVar` for an explicit one-shot reveal.
export type ApiProjectEnvVar = {
  id: string;
  key: string;
  // Either the masked placeholder ("••••••••") for secrets, or the
  // plaintext value for non-secret flags.
  value: string;
  isSecret: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useProjectEnvVars(
  username: string | undefined,
  slug: string | undefined,
) {
  return useQuery({
    queryKey: ["projects", username, slug, "env-vars"],
    enabled: !!username && !!slug,
    queryFn: () =>
      request<ApiProjectEnvVar[]>(`/projects/${username}/${slug}/env-vars`),
  });
}

export function useUpsertProjectEnvVar(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      key: string;
      value: string;
      isSecret?: boolean;
      description?: string | null;
    }) =>
      request<{
        id: string;
        key: string;
        isSecret: boolean;
        description: string | null;
        updatedAt: string;
      }>(
        `/projects/${username}/${slug}/env-vars/${encodeURIComponent(input.key)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            value: input.value,
            isSecret: input.isSecret,
            description: input.description,
          }),
          headers: { "Content-Type": "application/json" },
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "env-vars"],
      });
    },
  });
}

export function useDeleteProjectEnvVar(
  username: string | undefined,
  slug: string | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      request<void>(
        `/projects/${username}/${slug}/env-vars/${encodeURIComponent(key)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["projects", username, slug, "env-vars"],
      });
    },
  });
}

// One-shot reveal of a single secret env var's plaintext value. The UI
// uses this for the "Show" button next to a masked row — the value is
// returned only for the duration of the request and never cached.
export function useRevealProjectEnvVar(
  username: string | undefined,
  slug: string | undefined,
) {
  return useMutation({
    mutationFn: (key: string) =>
      request<{ key: string; value: string }>(
        `/projects/${username}/${slug}/env-vars/${encodeURIComponent(key)}/reveal`,
        { method: "POST" },
      ),
  });
}

// ────────────────────────────────────────────────────────────────────
// Creator payouts (Stripe Connect)
// ────────────────────────────────────────────────────────────────────

export type ApiMyPayoutAccount = GeneratedMyPayoutAccount;
export type ApiPayoutOnboardingLink = GeneratedPayoutOnboardingLink;
export type ApiAdminPayout = GeneratedAdminPayout;
export type ApiPayoutCycleResult = GeneratedPayoutCycleResult;

export function useMyPayoutAccount() {
  return useQuery({
    queryKey: ["me", "payouts", "account"],
    queryFn: () => request<ApiMyPayoutAccount>("/me/payouts/account"),
  });
}

// Returns the Stripe-hosted onboarding URL. The caller should redirect
// the browser to it; on completion Stripe sends the user back to
// `returnUrl` (or `refreshUrl` if they bail out mid-flow).
export function useStartPayoutOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { returnUrl: string; refreshUrl: string }) =>
      request<ApiPayoutOnboardingLink>(
        "/me/payouts/account/onboarding-link",
        { method: "POST", body: JSON.stringify(vars) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "payouts", "account"] });
    },
  });
}

export function useAdminPayouts() {
  return useQuery({
    queryKey: ["admin", "payouts"],
    queryFn: () => request<ApiAdminPayout[]>("/admin/payouts"),
  });
}

export function useRunAdminPayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      request<ApiPayoutCycleResult>("/admin/payouts/run", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
    },
  });
}

export function useRetryAdminPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<{ requeued: boolean; reason: string | null }>(
        `/admin/payouts/${id}/retry`,
        { method: "POST" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
    },
  });
}

export type ApiPayoutSettings = GeneratedPayoutSettings;
export type ApiUpdatePayoutSettingsBody = GeneratedUpdatePayoutSettingsBody;

export function useAdminPayoutSettings() {
  return useQuery({
    queryKey: ["admin", "payout-settings"],
    queryFn: () => request<ApiPayoutSettings>("/admin/payout-settings"),
  });
}

export function useUpdateAdminPayoutSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApiUpdatePayoutSettingsBody) =>
      request<ApiPayoutSettings>("/admin/payout-settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["admin", "payout-settings"], data);
      // The threshold also drives the creator-facing earnings page,
      // so invalidate that cache too.
      qc.invalidateQueries({ queryKey: ["me", "payouts", "account"] });
    },
  });
}

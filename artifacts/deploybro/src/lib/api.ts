import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import type {
  AdminCostByModel as GeneratedAdminCostByModel,
  AdminMe,
  AdminRecentBuild as GeneratedAdminRecentBuild,
  AdminStats as GeneratedAdminStats,
  AdminUser as GeneratedAdminUser,
  AppConfig,
  Build,
  CreateProjectResponse,
  Deployment,
  DeploymentStatus,
  DomainDnsMismatch,
  DomainSuggestedRecord,
  DomainVerificationRecord,
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
  Transaction,
  User,
} from "@workspace/api-zod";
// `UpdateMeBody` and `DeleteProjectFileResponse` are also zod schema names —
// pull them as values and infer the shapes, since the same identifiers
// aren't re-exported as types from `@workspace/api-zod`.
import {
  DeleteProjectFileResponse as DeleteProjectFileResponseSchema,
  UpdateMeBody as UpdateMeBodySchema,
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
export type ApiTransaction = Transaction;

export type UpdateMeBody = z.infer<typeof UpdateMeBodySchema>;

// ---- Hooks ----
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => request<ApiMe>("/me"),
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
export function useAppConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => request<AppConfig>("/config"),
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: FALLBACK_APP_CONFIG,
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
export function useAdminCostByModel() {
  return useQuery({ queryKey: ["admin", "cost-by-model"], queryFn: () => request<AdminCostByModel[]>("/admin/cost-by-model") });
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

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
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Types ----
export type ApiUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  plan: string;
  balance: number;
  status: string;
  signupDate: string;
  publicProjects: number;
  totalClones: number;
};

export type ApiMe = Omit<ApiUser, "publicProjects" | "totalClones" | "avatarUrl">;

export type ApiProjectListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: string;
  status: string;
  isPublic: boolean;
  clones: number;
  lastBuiltAt: string;
  createdAt?: string;
  buildsCount: number;
};

export type ApiProject = {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: string;
  status: string;
  isPublic: boolean;
  clones: number;
  createdAt: string;
  lastBuiltAt: string;
  owner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  buildsCount: number;
  lastBuildAt: string | null;
};

export type ApiBuild = {
  id: string;
  projectId: string;
  number: number;
  prompt: string;
  aiMessage: string;
  durationSec: number;
  cost: number;
  filesChanged: number;
  tokensIn: number;
  tokensOut: number;
  model: string;
  status: string;
  createdAt: string;
};

export type ApiExploreItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: string;
  clones: number;
  lastBuiltAt: string;
  author: string;
  authorDisplayName: string;
};

export type ApiTransaction = {
  id: string;
  amount: number;
  status: string;
  method: string;
  createdAt: string;
};

export type UpdateMeBody = Partial<{
  username: string;
  displayName: string;
  bio: string;
}>;

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

export type ApiProjectFile = {
  path: string;
  size: number;
  updatedAt: string;
};

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
      request<{ path: string; content: string }>(
        `/projects/${username}/${slug}/files/${path}`,
      ),
    enabled: !!username && !!slug && !!path,
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
export type AdminStats = {
  totalUsers: number;
  totalProjects: number;
  buildsToday: number;
  revenueGbp: number;
  spendGbp: number;
};
export type AdminRecentBuild = {
  id: string;
  duration: number;
  cost: number;
  status: string;
  createdAt: string;
  project: string;
  username: string;
};
export type AdminUser = {
  id: string;
  username: string;
  email: string;
  plan: string;
  balance: number;
  status: string;
  signupDate: string;
};
export type AdminCostByModel = { model: string; total: number };

export function useIsAdmin() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => request<{ isAdmin: boolean; configured: boolean }>("/admin/me"),
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
      request<{ id: string; slug: string; name: string; ownerUsername: string }>(`/me/projects`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

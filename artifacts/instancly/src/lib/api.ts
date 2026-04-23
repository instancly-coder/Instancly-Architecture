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

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string; framework?: string }) =>
      request<{ id: string; slug: string; name: string }>(`/me/projects`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "projects"] });
    },
  });
}

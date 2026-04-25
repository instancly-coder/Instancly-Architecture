// Thin typed wrapper around the Vercel REST API. Only the surface used by
// the publish pipeline is exposed — `createProject`, `upsertEnvVar`,
// `createDeployment`, `getDeployment`. All requests carry a 30s timeout
// and surface structured errors so the orchestrator can decide whether
// to mark the deployment failed.

const BASE = "https://api.vercel.com";
const REQUEST_TIMEOUT_MS = 30_000;

export class VercelApiError extends Error {
  status: number;
  bodyExcerpt: string;
  constructor(status: number, bodyExcerpt: string) {
    super(`Vercel API ${status}: ${bodyExcerpt.slice(0, 200)}`);
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

function token(): string {
  const t = process.env.VERCEL_API_TOKEN;
  if (!t) throw new Error("VERCEL_API_TOKEN is not configured");
  return t;
}

function teamQuery(): string {
  const team = process.env.VERCEL_TEAM_ID;
  return team ? `?teamId=${encodeURIComponent(team)}` : "";
}

function teamQueryAppend(existing: string): string {
  const team = process.env.VERCEL_TEAM_ID;
  if (!team) return existing;
  const sep = existing.includes("?") ? "&" : "?";
  return `${existing}${sep}teamId=${encodeURIComponent(team)}`;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      throw new VercelApiError(resp.status, text);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new VercelApiError(resp.status, `Non-JSON response: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export type VercelInlinedFile = {
  file: string;
  data: string; // base64
  encoding: "base64";
};

export type VercelProject = {
  id: string;
  name: string;
};

export type VercelDeployment = {
  id: string;
  url: string; // hostname (no protocol)
  inspectorUrl?: string;
  readyState?:
    | "QUEUED"
    | "BUILDING"
    | "READY"
    | "ERROR"
    | "CANCELED"
    | "INITIALIZING";
  alias?: string[];
};

// Vercel project names are 1-100 chars, lowercase, allow `[a-z0-9-]`. We
// derive from `<slug>-<username>` so re-publishes can find the same project.
export function projectNameFor(username: string, slug: string): string {
  const raw = `${slug}-${username}`.toLowerCase();
  const safe = raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return safe.slice(0, 100) || "deploybro-app";
}

export async function getOrCreateProject(name: string): Promise<VercelProject> {
  // Try GET first — cheap idempotency. If 404, create.
  try {
    const existing = await request<VercelProject>(
      "GET",
      `/v9/projects/${encodeURIComponent(name)}${teamQuery()}`,
    );
    return existing;
  } catch (err) {
    if (!(err instanceof VercelApiError) || err.status !== 404) throw err;
  }
  // `framework: "vite"` lets Vercel auto-detect the build command + output dir.
  return request<VercelProject>("POST", `/v11/projects${teamQuery()}`, {
    name,
    framework: "vite",
  });
}

export async function upsertEnvVar(
  projectIdOrName: string,
  key: string,
  value: string,
): Promise<void> {
  // Vercel rejects an env-var creation when the key already exists in the
  // same target. Easiest path: try POST, if 409/400-conflict, fetch and PATCH.
  const targets = ["production", "preview", "development"];
  try {
    await request("POST", `/v10/projects/${encodeURIComponent(projectIdOrName)}/env${teamQuery()}`, {
      key,
      value,
      type: "encrypted",
      target: targets,
    });
    return;
  } catch (err) {
    if (!(err instanceof VercelApiError)) throw err;
    if (err.status !== 400 && err.status !== 409) throw err;
  }
  // Find existing var and patch it.
  const list = await request<{ envs: Array<{ id: string; key: string }> }>(
    "GET",
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/env${teamQuery()}`,
  );
  const existing = list.envs?.find((e) => e.key === key);
  if (!existing) {
    // Re-throw original — we couldn't reconcile.
    throw new VercelApiError(409, `Env var ${key} conflict and not found in list`);
  }
  await request(
    "PATCH",
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/env/${existing.id}${teamQuery()}`,
    { value, target: targets, type: "encrypted" },
  );
}

export async function createDeployment(
  name: string,
  files: VercelInlinedFile[],
): Promise<VercelDeployment> {
  // The `target: "production"` flag aliases the deployment to the production
  // domain on success. Without it the URL changes every deploy.
  return request<VercelDeployment>("POST", teamQueryAppend("/v13/deployments"), {
    name,
    files,
    projectSettings: { framework: "vite" },
    target: "production",
  });
}

export async function getDeployment(id: string): Promise<VercelDeployment> {
  return request<VercelDeployment>(
    "GET",
    `/v13/deployments/${encodeURIComponent(id)}${teamQuery()}`,
  );
}

// Best-effort cleanup helpers. The orchestrator calls these inside catch
// blocks; they MUST swallow their own errors so they never mask the original
// failure. We log via the orchestrator's logger when invoked.

export async function deleteProject(nameOrId: string): Promise<void> {
  await request(
    "DELETE",
    `/v9/projects/${encodeURIComponent(nameOrId)}${teamQuery()}`,
  );
}

export async function cancelDeployment(id: string): Promise<void> {
  // Vercel uses PATCH on /v12/deployments/{id}/cancel for in-flight builds.
  await request(
    "PATCH",
    `/v12/deployments/${encodeURIComponent(id)}/cancel${teamQuery()}`,
  );
}

// ---------- Custom domains ----------
//
// Vercel returns a `verification` array when the domain isn't yet owned by
// the project. Each entry is a TXT record the user must place in their DNS
// before we can call `verifyProjectDomain` to flip the domain to verified.
// Once verified, traffic for that hostname is served by the project.

export type VercelDomainVerification = {
  type: string;
  domain: string;
  value: string;
  reason: string;
};

export type VercelDomain = {
  name: string;
  verified: boolean;
  verification?: VercelDomainVerification[];
  // Returned on add when Vercel detects another project already owns it.
  // Surfaced verbatim so the route layer can decide how to message the user.
  apexName?: string;
  projectId?: string;
};

export type VercelDomainConfig = {
  // True when Vercel can't see the expected DNS yet.
  misconfigured?: boolean;
  // Convenience: the recommended target for the user's CNAME or A record.
  configuredBy?: string | null;
  aValues?: string[];
  cnames?: string[];
  serviceType?: string;
};

// Add a domain to a Vercel project. Returns the verification challenges
// the user needs to set in DNS (when applicable).
export async function addProjectDomain(
  projectIdOrName: string,
  name: string,
): Promise<VercelDomain> {
  return request<VercelDomain>(
    "POST",
    `/v10/projects/${encodeURIComponent(projectIdOrName)}/domains${teamQuery()}`,
    { name },
  );
}

// Look up the current state (verified / verification array) of a domain
// already attached to the project. Used to refresh status after the user
// updates their DNS.
export async function getProjectDomain(
  projectIdOrName: string,
  name: string,
): Promise<VercelDomain> {
  return request<VercelDomain>(
    "GET",
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(name)}${teamQuery()}`,
  );
}

// Trigger Vercel to re-check the verification TXT records. Returns the
// updated domain row (verified flips to true on success).
export async function verifyProjectDomain(
  projectIdOrName: string,
  name: string,
): Promise<VercelDomain> {
  return request<VercelDomain>(
    "POST",
    `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(name)}/verify${teamQuery()}`,
  );
}

export async function removeProjectDomain(
  projectIdOrName: string,
  name: string,
): Promise<void> {
  try {
    await request(
      "DELETE",
      `/v9/projects/${encodeURIComponent(projectIdOrName)}/domains/${encodeURIComponent(name)}${teamQuery()}`,
    );
  } catch (err) {
    // 404 = already gone on Vercel — treat as success so the local row can
    // be cleaned up regardless.
    if (err instanceof VercelApiError && err.status === 404) return;
    throw err;
  }
}

// Returns the resolver-side view of the domain's DNS — used to surface
// "your CNAME isn't pointing at us yet" without making the user click a
// separate verify button.
export async function getDomainConfig(
  name: string,
): Promise<VercelDomainConfig> {
  return request<VercelDomainConfig>(
    "GET",
    `/v6/domains/${encodeURIComponent(name)}/config${teamQuery()}`,
  );
}

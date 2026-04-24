// Thin wrapper around the Neon Console API. We provision one branch +
// dedicated role + database per deployed app under a shared parent project
// so each user app has its own isolated Postgres without paying for a full
// Neon project per app.

const BASE = "https://console.neon.tech/api/v2";
const REQUEST_TIMEOUT_MS = 30_000;

export class NeonApiError extends Error {
  status: number;
  bodyExcerpt: string;
  constructor(status: number, bodyExcerpt: string) {
    super(`Neon API ${status}: ${bodyExcerpt.slice(0, 200)}`);
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

function apiKey(): string {
  const k = process.env.NEON_API_KEY;
  if (!k) throw new Error("NEON_API_KEY is not configured");
  return k;
}

export function parentProjectId(): string {
  const p = process.env.NEON_PARENT_PROJECT_ID;
  if (!p) throw new Error("NEON_PARENT_PROJECT_ID is not configured");
  return p;
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
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
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
      throw new NeonApiError(resp.status, text);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new NeonApiError(resp.status, `Non-JSON response: ${text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// Neon names are restricted: lowercase letters, digits, hyphens, underscores.
function safeName(raw: string, max = 63): string {
  const s = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_");
  return s.slice(0, max) || "app";
}

export type NeonBranch = {
  id: string;
  name: string;
};

export type NeonProvisionResult = {
  branchId: string;
  roleName: string;
  databaseName: string;
  connectionUri: string;
};

type CreateBranchResponse = {
  branch: NeonBranch;
  endpoints: Array<{ id: string; host: string; type: string }>;
};

type CreateRoleResponse = {
  role: { name: string; password?: string };
};

type GetRolePasswordResponse = {
  password: string;
};

type ListEndpointsResponse = {
  endpoints: Array<{ id: string; host: string; type: string; branch_id: string }>;
};

// Provision a fresh branch with a dedicated role and database. Returns
// everything needed to build the connection string the deployed app will use.
export async function provisionAppDatabase(
  appName: string,
): Promise<NeonProvisionResult> {
  const projectId = parentProjectId();
  const branchName = safeName(`app-${appName}-${Date.now()}`);
  const roleName = safeName(`app_${appName}`, 63);
  const databaseName = safeName(`app_${appName}`, 63);

  // 1) Branch — Neon will spin up a read-write endpoint by default.
  const branchResp = await request<CreateBranchResponse>(
    "POST",
    `/projects/${encodeURIComponent(projectId)}/branches`,
    {
      branch: { name: branchName },
      endpoints: [{ type: "read_write" }],
    },
  );
  const branch = branchResp.branch;

  // 2) Role on the new branch.
  const roleResp = await request<CreateRoleResponse>(
    "POST",
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branch.id)}/roles`,
    { role: { name: roleName } },
  );
  let password = roleResp.role.password;
  if (!password) {
    // Older API responses omit the password — fetch it explicitly.
    const reveal = await request<GetRolePasswordResponse>(
      "GET",
      `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branch.id)}/roles/${encodeURIComponent(roleName)}/reveal_password`,
    );
    password = reveal.password;
  }
  if (!password) throw new Error("Neon did not return a role password");

  // 3) Database owned by the new role.
  await request(
    "POST",
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branch.id)}/databases`,
    { database: { name: databaseName, owner_name: roleName } },
  );

  // 4) Find the endpoint host so we can assemble a libpq URI.
  let host: string | undefined = branchResp.endpoints?.[0]?.host;
  if (!host) {
    const listed = await request<ListEndpointsResponse>(
      "GET",
      `/projects/${encodeURIComponent(projectId)}/endpoints`,
    );
    host = listed.endpoints.find((e) => e.branch_id === branch.id)?.host;
  }
  if (!host) throw new Error("Neon branch endpoint host could not be resolved");
  const resolvedHost: string = host;

  const connectionUri = `postgresql://${encodeURIComponent(roleName)}:${encodeURIComponent(password)}@${resolvedHost}/${encodeURIComponent(databaseName)}?sslmode=require`;
  return {
    branchId: branch.id,
    roleName,
    databaseName,
    connectionUri,
  };
}

// Best-effort cleanup. Removes the branch (which cascades to its role,
// database, and endpoint) so a failed publish doesn't leave orphaned Neon
// resources behind. Caller swallows errors.
export async function deleteBranch(branchId: string): Promise<void> {
  const projectId = parentProjectId();
  await request(
    "DELETE",
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}`,
  );
}

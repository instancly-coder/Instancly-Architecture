// Tiny fetch-based wrapper around the slice of the Stripe REST API the
// payout pipeline needs: Connect Express account creation, hosted
// onboarding links, account status, and transfers. Same shape as
// `lib/vercel.ts` so the rest of the codebase has one mental model for
// outbound HTTP wrappers (a `*ApiError` class, a 30s timeout, structured
// error excerpts).
//
// Stripe expects `application/x-www-form-urlencoded` request bodies
// with bracket-notation for nested objects (`metadata[foo]=bar`). We
// flatten arbitrary objects into URLSearchParams here so callers can
// pass plain JS values without thinking about the wire format.

const BASE = "https://api.stripe.com/v1";
const REQUEST_TIMEOUT_MS = 30_000;

export class StripeApiError extends Error {
  status: number;
  bodyExcerpt: string;
  stripeCode: string | null;
  constructor(status: number, bodyExcerpt: string, stripeCode: string | null) {
    super(`Stripe API ${status}: ${bodyExcerpt.slice(0, 200)}`);
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
    this.stripeCode = stripeCode;
  }
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function token(): string {
  const t = process.env.STRIPE_SECRET_KEY;
  if (!t) throw new Error("STRIPE_SECRET_KEY is not configured");
  return t;
}

/**
 * Recursively flatten an arbitrary value into URLSearchParams entries
 * using Stripe's bracket-notation convention. `{ metadata: { x: "y" } }`
 * becomes `metadata[x]=y`. `null`/`undefined` values are dropped.
 */
function appendForm(
  params: URLSearchParams,
  key: string,
  value: unknown,
): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendForm(params, `${key}[${i}]`, v));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      appendForm(params, `${key}[${k}]`, v);
    }
    return;
  }
  params.append(key, String(value));
}

function toForm(body: Record<string, unknown> | undefined): string {
  if (!body) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    appendForm(params, k, v);
  }
  return params.toString();
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  opts?: { idempotencyKey?: string },
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token()}`,
    };
    let bodyStr: string | undefined;
    if (method === "POST") {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      bodyStr = toForm(body);
    }
    if (opts?.idempotencyKey) {
      headers["Idempotency-Key"] = opts.idempotencyKey;
    }
    const resp = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers,
      body: bodyStr,
    });
    const text = await resp.text();
    if (!resp.ok) {
      let code: string | null = null;
      try {
        const parsed = JSON.parse(text) as {
          error?: { code?: unknown; type?: unknown };
        };
        if (typeof parsed.error?.code === "string") code = parsed.error.code;
        else if (typeof parsed.error?.type === "string")
          code = parsed.error.type;
      } catch {
        /* keep null */
      }
      throw new StripeApiError(resp.status, text, code);
    }
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Connect Express ----

export type StripeAccount = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: {
    currently_due?: string[];
    disabled_reason?: string | null;
  };
};

export async function createConnectExpressAccount(opts: {
  email: string;
  country?: string;
  metadata?: Record<string, string>;
}): Promise<StripeAccount> {
  return request<StripeAccount>("POST", "/accounts", {
    type: "express",
    email: opts.email,
    country: opts.country ?? "GB",
    capabilities: {
      transfers: { requested: true },
    },
    metadata: opts.metadata,
  });
}

export async function getConnectAccount(
  accountId: string,
): Promise<StripeAccount> {
  return request<StripeAccount>("GET", `/accounts/${accountId}`);
}

export async function createAccountLink(opts: {
  account: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<{ url: string; expires_at: number }> {
  return request<{ url: string; expires_at: number }>(
    "POST",
    "/account_links",
    {
      account: opts.account,
      refresh_url: opts.refreshUrl,
      return_url: opts.returnUrl,
      type: "account_onboarding",
    },
  );
}

// ---- Transfers ----

export type StripeTransfer = {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  metadata?: Record<string, string>;
};

export async function createTransfer(opts: {
  destination: string;
  amountMinor: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}): Promise<StripeTransfer> {
  return request<StripeTransfer>(
    "POST",
    "/transfers",
    {
      destination: opts.destination,
      amount: opts.amountMinor,
      currency: opts.currency ?? "gbp",
      description: opts.description,
      metadata: opts.metadata,
    },
    { idempotencyKey: opts.idempotencyKey },
  );
}

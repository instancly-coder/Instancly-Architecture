// Tiny transactional email sender backed by Resend's HTTP API.
//
// We talk to Resend over plain `fetch` instead of pulling in their SDK so
// the bundler stays unaffected and so we can no-op cleanly when the API
// key isn't configured (e.g. in dev or before the operator has wired up
// email). Callers should treat sending as best-effort.

import { logger } from "./logger";

const RESEND_BASE = "https://api.resend.com";
const REQUEST_TIMEOUT_MS = 10_000;

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email is not configured (missing RESEND_API_KEY)");
  }
}

export class EmailSendError extends Error {
  status: number;
  bodyExcerpt: string;
  constructor(status: number, bodyExcerpt: string) {
    super(`Resend ${status}: ${bodyExcerpt.slice(0, 200)}`);
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// True when the operator has configured an API key. Routes/jobs can use
// this to skip enqueueing work when there's no chance it will deliver.
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  // `EMAIL_FROM` lets the operator override per-environment without a
  // code change. The default points at our marketing root domain so
  // bounces are at least diagnosable in Resend.
  return process.env.EMAIL_FROM || "DeployBro <noreply@deploybro.app>";
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new EmailNotConfiguredError();
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(`${RESEND_BASE}/emails`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      throw new EmailSendError(resp.status, text);
    }
    logger.info({ to: input.to, subject: input.subject }, "email sent");
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Templates ----------

export function renderDomainVerifiedEmail(args: {
  recipientName: string;
  host: string;
  projectSlug: string;
}): { subject: string; text: string; html: string } {
  const url = `https://${args.host}`;
  const subject = `Your domain ${args.host} is live`;
  const text = [
    `Hi ${args.recipientName},`,
    ``,
    `Good news — ${args.host} just finished verifying and is now serving your project "${args.projectSlug}" on DeployBro.`,
    ``,
    `Visit it: ${url}`,
    ``,
    `If you didn't expect this, you can remove the domain from the Domains tab in your project.`,
    ``,
    `— DeployBro`,
  ].join("\n");
  const html = `
    <div style="font-family: -apple-system, system-ui, Segoe UI, sans-serif; line-height: 1.5; color: #111;">
      <p>Hi ${escapeHtml(args.recipientName)},</p>
      <p>
        Good news — <strong>${escapeHtml(args.host)}</strong> just finished
        verifying and is now serving your project
        <strong>${escapeHtml(args.projectSlug)}</strong> on DeployBro.
      </p>
      <p>
        <a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">
          Open ${escapeHtml(args.host)}
        </a>
      </p>
      <p style="color:#555;font-size:13px;">
        If you didn't expect this, you can remove the domain from the
        Domains tab in your project.
      </p>
      <p style="color:#999;font-size:12px;">— DeployBro</p>
    </div>
  `.trim();
  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

import { pgTable, text, timestamp, numeric, uuid, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio").default("").notNull(),
  // Short one-line headline shown under the display name on the
  // public profile (e.g. "Designer — Building Next-Level Sites").
  // Distinct from `bio` (paragraph) so the profile sidebar can
  // render the two with different typography.
  tagline: text("tagline").default("").notNull(),
  // Free-form profile metadata surfaced as icon rows on the public
  // profile sidebar. Empty string = "not set" (the row is hidden).
  // `websiteUrl` is rendered as a link if it parses; we don't try to
  // validate it on insert beyond a length check so users can paste
  // partials like "moyin.design" and we'll still show them.
  location: text("location").default("").notNull(),
  websiteUrl: text("website_url").default("").notNull(),
  // Skill / topic chips shown at the bottom of the profile sidebar.
  // Free-form strings; the UI caps the count and length on input but
  // the column itself is permissive so historical data isn't lost
  // if those caps shift later.
  skills: text("skills").array().default(sql`'{}'::text[]`).notNull(),
  avatarUrl: text("avatar_url"),
  plan: text("plan").default("Free").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  status: text("status").default("active").notNull(),
  // Last time this user received the monthly Free-tier credit grant
  // ($2.50 top-up, see `grantFreeMonthlyIfDue` in
  // artifacts/api-server/src/lib/free-credits.ts). NULL means "never
  // granted" — that user is eligible immediately on next auth check.
  // Existing rows get NULL on backfill so every Free user receives the
  // first grant the next time they hit an authed endpoint.
  freeMonthlyGrantAt: timestamp("free_monthly_grant_at", {
    withTimezone: true,
  }),
  // Referral attribution. Set once at signup time from the cookie that
  // the public template/explore pages drop on first visit. We do NOT
  // FK-constrain `referredViaProjectId` here to avoid a circular
  // import with `projectsTable`; it's a loose reference and a deleted
  // template just leaves the original credit row in place.
  referredByUserId: uuid("referred_by_user_id"),
  referredViaProjectId: uuid("referred_via_project_id"),
  // Admin override of the platform-default referral commission %.
  // NULL means "use the global default" (currently 15). Stored as an
  // integer for clean JSON; values are interpreted as a percentage.
  referralCommissionPct: integer("referral_commission_pct"),
  // Stripe Connect Express account that earnings get paid out to.
  // NULL until the creator clicks "Connect payout method" on the
  // earnings page. Once present, the payout pipeline can transfer
  // pending earnings to this destination on its next run.
  stripeConnectAccountId: text("stripe_connect_account_id"),
  // Cached high-level state of the linked Connect account so the
  // earnings UI can render the right CTA without round-tripping to
  // Stripe on every page load. Refreshed via the `account.updated`
  // webhook AND on every onboarding-link request:
  //   NULL        — never connected
  //   "pending"   — account created but onboarding incomplete OR
  //                 `payouts_enabled` is still false
  //   "verified"  — `payouts_enabled === true`; eligible for payouts
  stripeConnectStatus: text("stripe_connect_status"),
  // Onboarding answers collected after first signup. All three fields
  // start NULL and are populated when the user submits the multi-step
  // onboarding flow (see /me/onboarding endpoint). `onboardedAt` is the
  // gate the AuthGate checks to decide whether to redirect a freshly
  // signed-in user into the flow vs let them through to the dashboard.
  //   role         — self-described persona (developer, entrepreneur, …)
  //   signupSource — how they heard about us (google, twitter, friend, …)
  //   onboardedAt  — timestamp the flow was completed; NULL = pending
  role: text("role"),
  signupSource: text("signup_source"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

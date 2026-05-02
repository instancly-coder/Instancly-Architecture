import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Event log of "user X cloned user Y's template Z". This is the
 * attribution table that the Stripe webhook reads from when crediting
 * template authors on the cloner's subsequent payments.
 *
 * Why an event log (and not just a counter on projects.clones)?
 *   - We need to know WHO cloned (cloner_user_id) so the webhook can
 *     look it up at payment time.
 *   - We need to know WHEN they cloned so the "most recent clone wins
 *     attribution" rule has a stable ordering.
 *   - We snapshot the commission % at clone-time so a creator who
 *     later reduces their cut doesn't retroactively cut earnings on
 *     existing cloners.
 *
 * Idempotency: there's a unique index on (cloner_user_id,
 * source_project_id) so the same user can't multiply their own
 * footprint by re-clicking Clone. The clone API endpoint uses
 * `ON CONFLICT … DO UPDATE` to bump `created_at` instead of inserting
 * a new row — that way "most recent clone wins" attribution still
 * works for users who re-engage with a template, while the
 * `projects.clones` counter stays a true count of unique cloners.
 *
 * `author_user_id` is denormalised from `source_project_id`'s owner so
 * the webhook can credit the right person without a join, and so a
 * later renaming of the project's owner (which we don't currently
 * support but might) doesn't silently re-route historical attribution.
 *
 * Foreign keys:
 *   - cloner_user_id → users (cascade): if the cloner is deleted, drop
 *     the attribution; we don't credit ghost users.
 *   - author_user_id → users (cascade): same logic — deleted authors
 *     can't be credited.
 *   - source_project_id is intentionally NOT FK-constrained so the row
 *     survives the original project being deleted; the historical
 *     attribution stays valid for any in-flight earning rows.
 */
export const templateClonesTable = pgTable(
  "template_clones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clonerUserId: uuid("cloner_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sourceProjectId: uuid("source_project_id").notNull(),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    // Snapshot of the author's templateAuthorCommissionPct at clone
    // time. Falls back to the platform default
    // (DEFAULT_TEMPLATE_CLONE_COMMISSION_PCT in the api-server lib).
    // Stored as an integer percentage for clean JSON; same convention
    // as users.referralCommissionPct.
    commissionPct: integer("commission_pct").notNull(),
    // Free-text label so the UI can show what the user actually saw
    // when they clicked Clone — useful when a project later changes
    // name or is deleted.
    sourceProjectName: text("source_project_name").default("").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    clonerIdx: index("template_clones_cloner_idx").on(t.clonerUserId),
    authorIdx: index("template_clones_author_idx").on(t.authorUserId),
    sourceIdx: index("template_clones_source_idx").on(t.sourceProjectId),
    // Each user counts once per template — the API uses ON CONFLICT
    // DO UPDATE on this constraint to bump created_at when the same
    // user re-clones, so attribution stays "most recent" without
    // inflating the counter.
    clonerSourceUniq: uniqueIndex("template_clones_cloner_source_uniq").on(
      t.clonerUserId,
      t.sourceProjectId,
    ),
  }),
);

export type TemplateClone = typeof templateClonesTable.$inferSelect;
export type InsertTemplateClone = typeof templateClonesTable.$inferInsert;

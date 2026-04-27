import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

export const projectsTable = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").default("").notNull(),
    framework: text("framework").default("React").notNull(),
    status: text("status").default("live").notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    // Admin-curated flag — only featured projects appear on the public
    // /templates page. Authors can set isPublic themselves; only admins
    // can flip this on.
    isFeaturedTemplate: boolean("is_featured_template").default(false).notNull(),
    // Bullet-list of headline features shown on the project's marketing
    // card and the dedicated template page. Stored as a Postgres text[]
    // for cheap server-side filtering later if needed.
    features: text("features").array().default(sql`'{}'::text[]`).notNull(),
    // Hosted image URL used as the card thumbnail on /templates and
    // /explore. Nullable — falls back to the first-letter avatar.
    coverImageUrl: text("cover_image_url"),
    // Auto-captured above-the-fold screenshot of the live Vercel URL.
    // Populated after a successful publish; owner can retrigger via
    // POST /projects/:username/:slug/screenshot. Takes precedence over
    // coverImageUrl in card thumbnails when both are present.
    screenshotUrl: text("screenshot_url"),
    clones: integer("clones").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastBuiltAt: timestamp("last_built_at", { withTimezone: true }).defaultNow().notNull(),

    // Vercel + Neon publish state. All nullable — populated on first publish
    // and reused on every subsequent publish so we don't recreate projects or
    // databases on each deploy.
    vercelProjectId: text("vercel_project_id"),
    vercelDeploymentId: text("vercel_deployment_id"),
    neonProjectId: text("neon_project_id"),
    neonBranchId: text("neon_branch_id"),
    neonRoleName: text("neon_role_name"),
    // Connection string with credentials. Treated as sensitive — never echoed
    // to the client, only used server-side to inject into Vercel env vars.
    databaseUrl: text("database_url"),
    liveUrl: text("live_url"),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    publishStatus: text("publish_status").default("none").notNull(),
    // The custom domain that should be served as the canonical "live URL"
    // in place of the auto-generated `*.vercel.app` host. NULL means the
    // user hasn't set a primary custom domain (or the verified one was
    // removed) and we fall back to `liveUrl`.
    primaryCustomDomain: text("primary_custom_domain"),
  },
  (t) => ({
    userSlugUnique: uniqueIndex("projects_user_slug_unique").on(t.userId, t.slug),
  }),
);

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;

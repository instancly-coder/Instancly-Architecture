import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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
  },
  (t) => ({
    userSlugUnique: uniqueIndex("projects_user_slug_unique").on(t.userId, t.slug),
  }),
);

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;

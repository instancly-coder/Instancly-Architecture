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
  },
  (t) => ({
    userSlugUnique: uniqueIndex("projects_user_slug_unique").on(t.userId, t.slug),
  }),
);

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;

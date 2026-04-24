import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const projectFilesTable = pgTable(
  "project_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    content: text("content").default("").notNull(),
    size: integer("size").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectPathUnique: uniqueIndex("project_files_project_path_unique").on(
      t.projectId,
      t.path,
    ),
  }),
);

export type ProjectFile = typeof projectFilesTable.$inferSelect;
export type InsertProjectFile = typeof projectFilesTable.$inferInsert;

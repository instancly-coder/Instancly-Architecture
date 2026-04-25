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
    // For text files this is the raw UTF-8 source. For binary uploads
    // (images, fonts, etc.) it's the base64-encoded bytes — see
    // `encoding`. Postgres `text` is fine for both since base64 is
    // 7-bit ASCII.
    content: text("content").default("").notNull(),
    // "utf8" for AI-generated source, "base64" for binary uploads. The
    // publish pipeline and preview routes branch on this to either
    // pass-through or decode before serving.
    encoding: text("encoding").default("utf8").notNull(),
    // Optional MIME hint for binary uploads — set from the browser's
    // File.type at upload time. Used by the preview route to send the
    // right Content-Type, and by the editor to decide whether to show
    // an image preview vs. a generic "binary file" placeholder.
    contentType: text("content_type"),
    // Byte length of the *decoded* content. For text: UTF-8 byte
    // length; for base64: the raw binary length (NOT the base64 string
    // length). This way the publish-size budget reflects the bytes
    // that will actually be deployed.
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

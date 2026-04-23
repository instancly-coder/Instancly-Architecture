import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  uuid,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const buildsTable = pgTable("builds", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  prompt: text("prompt").notNull(),
  aiMessage: text("ai_message").default("").notNull(),
  durationSec: integer("duration_sec").default(0).notNull(),
  cost: numeric("cost", { precision: 10, scale: 4 }).default("0").notNull(),
  filesChanged: integer("files_changed").default(0).notNull(),
  tokensIn: integer("tokens_in").default(0).notNull(),
  tokensOut: integer("tokens_out").default(0).notNull(),
  model: text("model").default("Claude Sonnet 4.5").notNull(),
  status: text("status").default("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Build = typeof buildsTable.$inferSelect;
export type InsertBuild = typeof buildsTable.$inferInsert;

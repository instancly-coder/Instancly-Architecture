import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export const deploymentsTable = pgTable(
  "deployments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    // queued | provisioning_db | creating_project | deploying | polling | live | failed
    status: text("status").default("queued").notNull(),
    vercelDeploymentId: text("vercel_deployment_id"),
    vercelInspectorUrl: text("vercel_inspector_url"),
    liveUrl: text("live_url"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => ({
    projectIdx: index("deployments_project_idx").on(t.projectId),
  }),
);

export type Deployment = typeof deploymentsTable.$inferSelect;
export type InsertDeployment = typeof deploymentsTable.$inferInsert;

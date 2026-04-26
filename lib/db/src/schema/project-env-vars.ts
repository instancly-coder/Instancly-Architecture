import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

// Per-project environment variables. Stored encrypted-at-rest using the
// same secret-cipher the projects.databaseUrl column uses, so a database
// dump alone can't reveal the underlying secrets without the key. The
// publish pipeline reads this table on every Vercel deployment and
// injects each row as a Vercel encrypted env var on the project.
//
// Two creation paths feed this table:
//   1. The user manages variables manually from the new "Env Vars" tab
//      in the builder UI.
//   2. The AI emits `<deploybro:request-secret name="…" />` in chat,
//      which renders a masked input bubble; submitting it POSTs the
//      value here. The AI never sees the raw value — only that the
//      named key is now set.
//
// `isSecret` controls whether the UI ever reveals the value at rest
// (true for things like API keys; false for safe-to-display flags like
// FEATURE_FLAG_X). The server still encrypts both kinds at rest.
export const projectEnvVarsTable = pgTable(
  "project_env_vars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueEncrypted: text("value_encrypted").notNull(),
    isSecret: boolean("is_secret").default(true).notNull(),
    // Optional human-readable hint shown in the UI ("Stripe secret key
    // from dashboard.stripe.com/apikeys"). The AI fills this in when it
    // emits a request-secret directive so the user knows where to grab
    // the value from.
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    projectKeyUnique: uniqueIndex("project_env_vars_project_id_key_unique").on(
      t.projectId,
      t.key,
    ),
  }),
);

import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";

export type DomainVerificationRecord = {
  type: string;
  domain: string;
  value: string;
  reason: string;
};

export const projectDomainsTable = pgTable(
  "project_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    verified: boolean("verified").default(false).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    verificationRecords: jsonb("verification_records").$type<DomainVerificationRecord[]>(),
    misconfigured: boolean("misconfigured").default(false).notNull(),
    // Resolver-side DNS values Vercel sees right now. We persist these so
    // the UI can tell the user "your CNAME is pointing at X, expected Y"
    // without having to re-fetch from Vercel on every render. Null until
    // the first config refresh succeeds.
    aValues: jsonb("a_values").$type<string[]>(),
    cnames: jsonb("cnames").$type<string[]>(),
    configuredBy: text("configured_by"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectHostUnique: uniqueIndex("project_domains_project_host_unique").on(
      t.projectId,
      t.host,
    ),
  }),
);

export type ProjectDomain = typeof projectDomainsTable.$inferSelect;
export type InsertProjectDomain = typeof projectDomainsTable.$inferInsert;

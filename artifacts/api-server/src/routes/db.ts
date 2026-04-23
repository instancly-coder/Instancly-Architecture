import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/db/ping", async (_req, res) => {
  try {
    const result = await db.execute(
      sql`select 1 as ok, now() as now, current_database() as database, version() as version`,
    );
    const row =
      (result as { rows?: unknown[] }).rows?.[0] ??
      (result as unknown as unknown[])[0];
    res.json({ status: "ok", row });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", message });
  }
});

router.get("/db/info", async (_req, res) => {
  try {
    const conn =
      process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
    let masked = "";
    let host = "";
    let database = "";
    try {
      const u = new URL(conn);
      host = u.hostname;
      database = u.pathname.replace(/^\//, "");
      masked = `postgres://${u.username}:••••••••@${u.hostname}${u.pathname}`;
    } catch {
      masked = "(invalid connection string)";
    }
    const isNeon = /neon\.tech/i.test(conn);

    const sizeRes = await db.execute(
      sql`select pg_size_pretty(pg_database_size(current_database())) as size, current_database() as database, version() as version`,
    );
    const sizeRow =
      ((sizeRes as { rows?: Array<Record<string, unknown>> }).rows?.[0] ??
        (sizeRes as unknown as Array<Record<string, unknown>>)[0]) ?? {};

    res.json({
      provider: isNeon ? "neon" : "postgres",
      host,
      database: (sizeRow.database as string) ?? database,
      size: sizeRow.size as string,
      version: sizeRow.version as string,
      connectionString: masked,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", message });
  }
});

router.get("/db/tables", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      select
        c.relname as name,
        n.nspname as schema,
        c.reltuples::bigint as row_estimate,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size,
        pg_total_relation_size(c.oid) as size_bytes,
        greatest(coalesce(s.last_autoanalyze, s.last_analyze, s.last_autovacuum, s.last_vacuum), to_timestamp(0)) as last_change
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_stat_user_tables s on s.relid = c.oid
      where c.relkind = 'r'
        and n.nspname not in ('pg_catalog', 'information_schema')
      order by pg_total_relation_size(c.oid) desc
      limit 200
    `);
    const rows =
      (result as { rows?: Array<Record<string, unknown>> }).rows ??
      (result as unknown as Array<Record<string, unknown>>);

    const base = (rows ?? []).map((r) => ({
      name: String(r.name),
      schema: String(r.schema),
      rowEstimate: Number(r.row_estimate ?? 0),
      size: String(r.size ?? "0 B"),
      sizeBytes: Number(r.size_bytes ?? 0),
      lastChange: r.last_change ? new Date(r.last_change as string).toISOString() : null,
    }));

    const tables = await Promise.all(
      base.map(async (t) => {
        let exact: number | null = null;
        if (t.rowEstimate < 0 || (t.sizeBytes < 5_000_000 && t.rowEstimate < 100_000)) {
          try {
            const countRes = await db.execute(
              sql`select count(*)::bigint as n from ${sql.identifier(t.schema)}.${sql.identifier(t.name)}`,
            );
            const cRow =
              ((countRes as { rows?: Array<Record<string, unknown>> }).rows?.[0] ??
                (countRes as unknown as Array<Record<string, unknown>>)[0]) ?? {};
            exact = Number(cRow.n ?? 0);
          } catch {
            exact = null;
          }
        }
        return {
          name: t.name,
          schema: t.schema,
          rows: exact ?? Math.max(0, t.rowEstimate),
          exact: exact !== null,
          size: t.size,
          sizeBytes: t.sizeBytes,
          lastChange: t.lastChange,
        };
      }),
    );

    res.json({ tables });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", message });
  }
});

export default router;

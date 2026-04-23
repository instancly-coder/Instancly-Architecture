import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/db/ping", async (_req, res) => {
  try {
    const result = await db.execute(sql`select 1 as ok, now() as now, current_database() as database`);
    const row = (result as { rows?: unknown[] }).rows?.[0] ?? (result as unknown[])[0];
    res.json({ status: "ok", row });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", message });
  }
});

export default router;

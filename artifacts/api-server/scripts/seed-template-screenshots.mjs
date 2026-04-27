// One-shot backfill: captures an above-the-fold screenshot for every
// featured starter template that already has a `live_url` but no
// `screenshot_url` yet, and persists the resulting hosted image URL to
// the `projects.screenshot_url` column.
//
// Why this exists:
//   The three seeded starter templates (`bro-cloud-saas`,
//   `studio-bro-agency`, `bro-folio-portfolio`) were published before
//   automatic screenshot capture shipped, so their cards on the landing
//   page and Explore still render the CSS mock / letter placeholder.
//   Running this script once paints them with real screenshots.
//
// Idempotent: skips any project that already has `screenshot_url` set,
// so re-running is safe.
//
// Mirrors the provider logic in `src/lib/screenshot.ts` so the same env
// vars work (SCREENSHOT_API_URL / SCREENSHOT_API_KEY for a custom
// provider, otherwise Microlink with optional MICROLINK_API_KEY).
//
// Usage (from repo root):
//   cd artifacts/api-server && node ./scripts/seed-template-screenshots.mjs

import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.NEON_DATABASE_URL;
if (!DATABASE_URL) {
  console.error("NEON_DATABASE_URL is not set");
  process.exit(1);
}

const SCREENSHOT_TIMEOUT_MS = 30_000;

async function captureScreenshot(liveUrl) {
  try {
    const customApiUrl = process.env.SCREENSHOT_API_URL;
    const customApiKey = process.env.SCREENSHOT_API_KEY;

    if (customApiUrl) {
      const qs = new URLSearchParams({ url: liveUrl });
      const headers = { Accept: "application/json" };
      if (customApiKey) headers["Authorization"] = `Bearer ${customApiKey}`;

      const resp = await fetch(`${customApiUrl}?${qs}`, {
        headers,
        signal: AbortSignal.timeout(SCREENSHOT_TIMEOUT_MS),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.warn(
          `  ! custom provider non-2xx (${resp.status}): ${text.slice(0, 200)}`,
        );
        return null;
      }
      const json = await resp.json();
      const url = json.screenshotUrl ?? json?.data?.screenshot?.url;
      if (!url) {
        console.warn("  ! custom provider response missing URL");
        return null;
      }
      return url;
    }

    const microlinkKey = process.env.MICROLINK_API_KEY;
    const qs = new URLSearchParams({
      url: liveUrl,
      screenshot: "true",
      meta: "false",
      "screenshot.type": "png",
      "screenshot.fullPage": "false",
    });
    const resp = await fetch(`https://api.microlink.io?${qs}`, {
      headers: microlinkKey ? { "x-api-key": microlinkKey } : {},
      signal: AbortSignal.timeout(SCREENSHOT_TIMEOUT_MS),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.warn(
        `  ! microlink non-2xx (${resp.status}): ${text.slice(0, 200)}`,
      );
      return null;
    }
    const json = await resp.json();
    const url = json?.data?.screenshot?.url;
    if (!url) {
      console.warn("  ! microlink response missing screenshot URL");
      return null;
    }
    return url;
  } catch (err) {
    console.warn(`  ! capture failed (non-fatal): ${err?.message ?? err}`);
    return null;
  }
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, slug, name, live_url
         FROM projects
        WHERE is_featured_template = TRUE
          AND live_url IS NOT NULL
          AND screenshot_url IS NULL
        ORDER BY slug`,
    );

    if (rows.length === 0) {
      console.log("No featured templates need a screenshot. Nothing to do.");
      return;
    }

    console.log(`Backfilling screenshots for ${rows.length} template(s):`);

    let captured = 0;
    let skipped = 0;
    for (const row of rows) {
      console.log(`- ${row.slug} → ${row.live_url}`);
      const screenshotUrl = await captureScreenshot(row.live_url);
      if (!screenshotUrl) {
        console.log("  (no screenshot returned, leaving column NULL)");
        skipped++;
        continue;
      }
      await client.query(
        "UPDATE projects SET screenshot_url = $1 WHERE id = $2",
        [screenshotUrl, row.id],
      );
      console.log(`  ✓ saved ${screenshotUrl}`);
      captured++;
    }

    console.log(
      `\nDone. captured=${captured} skipped=${skipped} total=${rows.length}`,
    );
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

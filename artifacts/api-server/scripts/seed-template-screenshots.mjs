// Backfill / refresh: captures an above-the-fold screenshot for every
// `is_featured_template = TRUE` project and persists the hosted image URL
// to the `projects.screenshot_url` column.
//
// Source URL preference per row:
//   1. `live_url` (the project's real Vercel deployment) — used whenever
//      set. Vercel deployments are static, fast, and reachable by
//      Microlink. Featured templates' projects must first have their
//      Vercel `ssoProtection` / `passwordProtection` cleared (see
//      `disableProjectProtection` in `src/lib/vercel.ts`) so Microlink
//      doesn't capture a sign-in wall.
//   2. Public preview endpoint `${SITE_URL}/api/preview/{u}/{s}/` as a
//      fallback for never-deployed projects. SITE_URL defaults to
//      https://deploybro.app and can be overridden for staging. NOTE:
//      the local Replit dev URL is NOT reachable by Microlink (mTLS
//      proxy), so SITE_URL must point at a publicly-served instance.
//
// Why this exists:
//   The three seeded starter templates (`bro-cloud-saas`,
//   `studio-bro-agency`, `bro-folio-portfolio`) were published before
//   automatic screenshot capture shipped, so their cards on the landing
//   page and Explore showed placeholders. Running this script paints
//   them with real screenshots.
//
// NOT idempotent in the "skip-existing" sense: this script re-screenshots
// every featured template every run (no `IS NULL` filter on
// `screenshot_url`) so an operator can refresh the homepage cards after
// a content change without first hand-clearing the column. It IS safe to
// re-run — the only side effect is overwriting `screenshot_url` with the
// freshly-captured Microlink URL.
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
      // Bust Microlink's URL-keyed cache so re-captures after a deploy
      // change actually re-fetch instead of serving the previous PNG.
      force: "true",
      // Wait for the React/Vite bundle to finish rendering before taking
      // the snapshot — without this Microlink fires the screenshot at
      // first paint and captures a blank page.
      waitUntil: "networkidle0",
      "screenshot.type": "png",
      "screenshot.fullPage": "false",
      "viewport.width": "1280",
      "viewport.height": "800",
      "viewport.deviceScaleFactor": "1",
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
  const SITE_URL = (process.env.SITE_URL ?? "https://deploybro.app").replace(/\/+$/, "");
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    // Re-screenshots ALL featured templates every run (no IS NULL filter)
    // so an operator can refresh the homepage cards after a content
    // change without first hand-clearing screenshot_url.
    //
    // Source URL preference per row:
    //   1. `live_url` (the project's real Vercel deployment) — used
    //      whenever set. Vercel deployments are static, fast, and
    //      reachable by Microlink. For featured templates we run a
    //      one-shot to clear `ssoProtection` / `passwordProtection` so
    //      Microlink doesn't capture a sign-in wall (see Vercel client's
    //      `disableProjectProtection`).
    //   2. Public preview endpoint `${SITE_URL}/api/preview/{u}/{s}/`
    //      as a fallback for never-deployed projects. Note: the local
    //      Replit dev URL is NOT reachable by Microlink (mTLS proxy),
    //      so SITE_URL must point at a publicly-served instance.
    const { rows } = await client.query(
      `SELECT p.id, p.slug, p.name, p.live_url, u.username
         FROM projects p
         JOIN users u ON p.user_id = u.id
        WHERE p.is_featured_template = TRUE
        ORDER BY p.slug`,
    );

    if (rows.length === 0) {
      console.log("No featured templates need a screenshot. Nothing to do.");
      return;
    }

    console.log(`Backfilling screenshots for ${rows.length} template(s):`);

    let captured = 0;
    let skipped = 0;
    for (const row of rows) {
      const targetUrl = row.live_url
        ? row.live_url
        : `${SITE_URL}/api/preview/${encodeURIComponent(row.username)}/${encodeURIComponent(row.slug)}/`;
      console.log(`- ${row.slug} → ${targetUrl}`);
      const screenshotUrl = await captureScreenshot(targetUrl);
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

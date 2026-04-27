import { logger } from "./logger";

const MICROLINK_API = "https://api.microlink.io";
const SCREENSHOT_TIMEOUT_MS = 30_000;

/**
 * Capture an above-the-fold screenshot of a live URL and return a hosted
 * image URL (from Microlink's CDN) to persist on the project row.
 *
 * Returns null on any failure — callers treat this as non-fatal so a
 * screenshot hiccup never blocks or fails a publish.
 *
 * Env vars:
 *   MICROLINK_API_KEY — optional; unlocks higher rate limits + quality on
 *                       the Microlink Pro plan.
 */
export async function captureScreenshot(liveUrl: string): Promise<string | null> {
  try {
    const qs = new URLSearchParams({
      url: liveUrl,
      screenshot: "true",
      meta: "false",
      "screenshot.type": "png",
      "screenshot.fullPage": "false",
    });

    const key = process.env.MICROLINK_API_KEY;
    if (key) qs.set("apiKey", key);

    const resp = await fetch(`${MICROLINK_API}?${qs}`, {
      headers: key ? { "x-api-key": key } : {},
      signal: AbortSignal.timeout(SCREENSHOT_TIMEOUT_MS),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      logger.warn(
        { status: resp.status, body: text.slice(0, 300), liveUrl },
        "Microlink screenshot API returned non-2xx",
      );
      return null;
    }

    const json = (await resp.json()) as {
      data?: { screenshot?: { url?: string } };
    };
    const url: string | undefined = json?.data?.screenshot?.url;
    if (!url) {
      logger.warn({ json, liveUrl }, "Microlink response missing screenshot URL");
      return null;
    }

    return url;
  } catch (err) {
    logger.warn({ err, liveUrl }, "Screenshot capture failed (non-fatal)");
    return null;
  }
}

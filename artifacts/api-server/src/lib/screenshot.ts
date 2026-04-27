import { logger } from "./logger";

const SCREENSHOT_TIMEOUT_MS = 30_000;

/**
 * Capture an above-the-fold screenshot of a live URL and return a hosted
 * image URL to persist on the project row.
 *
 * Returns null on any failure — callers treat this as non-fatal so a
 * screenshot hiccup never blocks or fails a publish.
 *
 * Provider configuration (env vars):
 *   SCREENSHOT_API_URL  — base URL of a custom screenshot provider.
 *                         When set the custom provider is used instead of
 *                         Microlink. The provider must accept a `url` query
 *                         param and return JSON containing either:
 *                           { screenshotUrl: string }  — preferred shape
 *                         or the Microlink-compatible shape:
 *                           { data: { screenshot: { url: string } } }
 *   SCREENSHOT_API_KEY  — API key sent as `Authorization: Bearer <key>` to
 *                         the custom provider (SCREENSHOT_API_URL must also
 *                         be set).
 *
 *   MICROLINK_API_KEY   — optional; used with the default Microlink provider
 *                         to unlock higher rate limits / quality (Pro plan).
 */
export async function captureScreenshot(liveUrl: string): Promise<string | null> {
  try {
    const customApiUrl = process.env.SCREENSHOT_API_URL;
    const customApiKey = process.env.SCREENSHOT_API_KEY;

    if (customApiUrl) {
      // --- Custom provider ---
      const qs = new URLSearchParams({ url: liveUrl });
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (customApiKey) {
        headers["Authorization"] = `Bearer ${customApiKey}`;
      }

      const resp = await fetch(`${customApiUrl}?${qs}`, {
        headers,
        signal: AbortSignal.timeout(SCREENSHOT_TIMEOUT_MS),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        logger.warn(
          { status: resp.status, body: text.slice(0, 300), liveUrl, customApiUrl },
          "Custom screenshot provider returned non-2xx",
        );
        return null;
      }

      // Accept either { screenshotUrl } or the Microlink { data.screenshot.url } shape.
      const json = (await resp.json()) as {
        screenshotUrl?: string;
        data?: { screenshot?: { url?: string } };
      };
      const url = json.screenshotUrl ?? json.data?.screenshot?.url;
      if (!url) {
        logger.warn({ json, liveUrl }, "Custom screenshot provider: missing URL in response");
        return null;
      }
      return url;
    }

    // --- Default: Microlink ---
    const microlinkKey = process.env.MICROLINK_API_KEY;
    const qs = new URLSearchParams({
      url: liveUrl,
      screenshot: "true",
      meta: "false",
      "screenshot.type": "png",
      "screenshot.fullPage": "false",
    });
    if (microlinkKey) qs.set("apiKey", microlinkKey);

    const resp = await fetch(`https://api.microlink.io?${qs}`, {
      headers: microlinkKey ? { "x-api-key": microlinkKey } : {},
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
    const url = json?.data?.screenshot?.url;
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

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
    // - `force=true` bypasses Microlink's URL-keyed response cache so a
    //   re-capture after we change the underlying page actually re-fetches
    //   instead of serving the previous PNG.
    // - `waitUntil=networkidle0` waits for all in-flight network requests
    //   to settle. Vite-built React apps load their bundle as a single JS
    //   file, so once the network is idle the React tree has mounted.
    // - Explicit viewport keeps the captured PNG at a predictable
    //   aspect ratio across all template/project cards.
    const microlinkKey = process.env.MICROLINK_API_KEY;
    const qs = new URLSearchParams({
      url: liveUrl,
      screenshot: "true",
      meta: "false",
      force: "true",
      waitUntil: "networkidle0",
      "screenshot.type": "png",
      "screenshot.fullPage": "false",
      "viewport.width": "1280",
      "viewport.height": "800",
      "viewport.deviceScaleFactor": "1",
    });
    // API key is sent via header only — keeping it out of the query string
    // avoids the key appearing in server/proxy access logs.
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

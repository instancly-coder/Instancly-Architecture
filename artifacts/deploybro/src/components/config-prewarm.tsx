import { useAppConfig } from "@/lib/api";

/**
 * Mounted once at the App root so the public `/api/config` query is
 * fired on app mount and its result is cached globally. Any later
 * consumer (e.g. the Files panel size gauge) hits the warmed cache
 * immediately instead of triggering its own first fetch.
 */
export function ConfigPrewarm() {
  useAppConfig();
  return null;
}

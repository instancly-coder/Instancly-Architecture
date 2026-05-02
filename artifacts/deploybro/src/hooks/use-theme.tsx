import { useCallback, useSyncExternalStore } from "react";

/**
 * App theme: real light / dark toggle backed by `localStorage` and a
 * window-level subscription so every consumer of `useTheme()`
 * re-renders when the theme flips, no matter who flipped it (the
 * sidebar toggle, another tab, etc.).
 *
 * Storage key + class name are kept stable (`deploybro:theme`,
 * `dark`) so users who already have a saved preference from before
 * the rewrite keep it.
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "deploybro:theme";
const EVENT_NAME = "deploybro:theme-change";

function readStored(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return null;
}

function preferredTheme(): Theme {
  const stored = readStored();
  if (stored) return stored;
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  // `color-scheme` lets the browser theme native form controls,
  // scrollbars, etc. so they don't look out of place when the rest
  // of the UI flips.
  root.style.colorScheme = theme;
}

function persistTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
}

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(EVENT_NAME, handler);
  // Cross-tab sync.
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
      applyTheme(e.newValue);
      onChange();
    }
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

function setThemeGlobal(theme: Theme) {
  applyTheme(theme);
  persistTheme(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    getCurrentTheme,
    () => "dark" as Theme,
  );
  const setTheme = useCallback((t: Theme) => setThemeGlobal(t), []);
  const toggleTheme = useCallback(() => {
    setThemeGlobal(getCurrentTheme() === "dark" ? "light" : "dark");
  }, []);
  return { theme, setTheme, toggleTheme };
}

/**
 * Called once at boot from App.tsx so the correct theme is applied
 * before React renders — avoids a flash of the wrong theme.
 */
export function initThemeOnce() {
  applyTheme(preferredTheme());
}

import { useCallback } from "react";

type Theme = "dark";

function applyDark() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("dark");
}

export function useTheme() {
  const noop = useCallback(() => {}, []);
  return { theme: "dark" as Theme, setTheme: noop, toggleTheme: noop };
}

export function initThemeOnce() {
  applyDark();
  try {
    localStorage.setItem("deploybro:theme", "dark");
  } catch {}
}

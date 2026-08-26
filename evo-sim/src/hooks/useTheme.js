import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "");
  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, setTheme };
}

export function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function getThemePalette() {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches &&
      !document.documentElement.hasAttribute("data-theme"));
  return {
    isDark,
    bg: isDark ? "#0b0f14" : "#ffffff",
    gridMinor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
    gridMajor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    food: "#39FF14", // neon green
    obstacle: isDark ? "#6b4423" : "#7b4a2f", // brown
    preyStroke: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.65)",
    predStroke: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.45)",
    camoStroke: "#ffffff",
    text: getCssVar("--text") || (isDark ? "#e8edf3" : "#0a0a0a"),
    chartAxis: isDark ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.35)",
    chartGrid: isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.08)",
    chartPrey: isDark ? "#60a5fa" : "#2563eb", // blue
    chartPred: isDark ? "#f87171" : "#dc2626", // red
    chartFood: isDark ? "#22c55e" : "#16a34a", // green
  };
}

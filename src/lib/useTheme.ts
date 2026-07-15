"use client";

import { useEffect, useState } from "react";

export const THEME_CHANGE_EVENT = "asygnuz-theme-change";

export function useTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    read();
    window.addEventListener(THEME_CHANGE_EVENT, read);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, read);
  }, []);

  return theme;
}

export const CHART_COLORS = {
  dark: {
    grid: "#2b3140",
    axis: "#8b93a6",
    tooltipBg: "#12151d",
    tooltipBorder: "#2b3140",
    tooltipText: "#edeef2",
  },
  light: {
    grid: "#d8dbe2",
    axis: "#5c6370",
    tooltipBg: "#ffffff",
    tooltipBorder: "#d8dbe2",
    tooltipText: "#12151d",
  },
};

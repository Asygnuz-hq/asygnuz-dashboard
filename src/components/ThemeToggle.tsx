"use client";

import { useEffect, useState } from "react";
import { THEME_CHANGE_EVENT } from "@/lib/useTheme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Reads the theme the init script already applied to <html> before hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("asygnuz-theme", next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="flex items-center gap-2 rounded-full border border-border bg-surface-alt px-3 py-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
    >
      {theme === "dark" ? "☾ Noche" : "☀ Día"}
    </button>
  );
}

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "nord" | "forest";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "nord";

    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) return stored;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "forest"
      : "nord";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme === "forest" ? "dark" : "light";
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "nord" ? "forest" : "nord"));
  };

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost btn-sm btn-circle"
      aria-label="Toggle theme"
    >
      {theme === "forest" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

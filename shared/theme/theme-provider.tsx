"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

export type Theme = "dark" | "light" | "system";
const ThemeContext = createContext<{
  resolved: "dark" | "light";
  setTheme(theme: Theme): void;
  theme: Theme;
} | null>(null);

function resolveTheme(theme: Theme) {
  return theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
    : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"dark" | "light">("light");

  const apply = useCallback((next: Theme) => {
    const value = resolveTheme(next);
    document.documentElement.classList.toggle("dark", value === "dark");
    document.documentElement.dataset.theme = next;
    setResolved(value);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("syra-theme") as Theme | null;
    const initial = stored && ["light", "dark", "system"].includes(stored) ? stored : "system";
    setThemeState(initial);
    apply(initial);
  }, [apply]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => theme === "system" && apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [apply, theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      localStorage.setItem("syra-theme", next);
      setThemeState(next);
      apply(next);
    },
    [apply]
  );
  const value = useMemo(() => ({ resolved, setTheme, theme }), [resolved, setTheme, theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}

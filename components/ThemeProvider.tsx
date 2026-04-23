"use client";

import * as React from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

const THEME_STORAGE_KEY = "lifetrack-theme";

const ThemeContext = React.createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "light",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => defaultTheme);

  React.useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark" || (enableSystem && saved === "system")) {
      setThemeState(saved);
      return;
    }
    setThemeState(defaultTheme);
  }, [defaultTheme, enableSystem]);

  React.useEffect(() => {
    const root = window.document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      root.classList.remove("light", "dark");
      const resolved: "light" | "dark" =
        theme === "dark"
          ? "dark"
          : theme === "light"
            ? "light"
            : enableSystem
              ? media.matches
                ? "dark"
                : "light"
              : "light";
      root.classList.add(resolved);
    };

    applyTheme();
    if (theme !== "system" || !enableSystem) return;

    const handleChange = () => applyTheme();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [theme, enableSystem]);

  const setTheme = React.useCallback((t: Theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

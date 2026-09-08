"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = "pulso-theme";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

function isValidTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidTheme(stored)) return stored;
  } catch {
    // localStorage indisponível (modo privado, quota cheia, etc.) — cai no default
  }
  return null;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

/**
 * Hook que sincroniza o tema com localStorage e com a preferência do sistema.
 * - Lê o tema persistido uma única vez via lazy initializer (sem effect, sem
 *   re-render em cascata).
 * - Observa mudanças em `prefers-color-scheme` apenas quando o tema é "system".
 * - Aplica a classe no <html> em cada mudança de tema resolvido.
 */
function useThemeState(defaultTheme: Theme): {
  theme: Theme;
  setTheme: (next: Theme) => void;
  systemTheme: ResolvedTheme;
  actualTheme: ResolvedTheme;
} {
  // Inicialização preguiçosa: só lê localStorage no client, na primeira
  // renderização. Em SSR, retorna defaultTheme.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return readStoredTheme() ?? defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  // Observa mudanças em prefers-color-scheme (apenas para tema "system").
  // Aplica a classe no <html> sempre que o tema resolvido muda.
  useEffect(() => {
    const resolved: ResolvedTheme = theme === "system" ? systemTheme : theme;
    applyThemeClass(resolved);

    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent): void => {
      const next: ResolvedTheme = event.matches ? "dark" : "light";
      setSystemTheme(next);
      applyThemeClass(next);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, systemTheme]);

  const setTheme = useCallback((next: Theme): void => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage indisponível — segue sem persistir
    }
    setThemeState(next);
  }, []);

  const actualTheme = useMemo<ResolvedTheme>(() => {
    if (theme === "system") return systemTheme;
    return theme;
  }, [theme, systemTheme]);

  return { theme, setTheme, systemTheme, actualTheme };
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps): JSX.Element {
  const { theme, setTheme, actualTheme } = useThemeState(defaultTheme);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, actualTheme }),
    [theme, setTheme, actualTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return context;
}

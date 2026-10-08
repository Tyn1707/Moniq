import { useSyncExternalStore } from 'react';

/**
 * Light/dark theme.
 *
 * A tiny module-level store rather than a React context: the theme has to be
 * applied to <html> before React renders (see the inline script in index.html,
 * which prevents a light flash on load), and non-React code such as chart
 * colour choices can read it too. Components subscribe via `useTheme()`.
 *
 * The first visit follows the OS preference; an explicit choice is remembered.
 */

export type Theme = 'light' | 'dark';

/** Must match the key read by the inline script in index.html. */
export const THEME_STORAGE_KEY = 'moniq.theme';

const listeners = new Set<() => void>();

const readInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage unavailable (private mode); fall through to the OS preference.
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

let currentTheme: Theme = typeof document === 'undefined' ? 'light' : readInitialTheme();
applyTheme(currentTheme);

export const getTheme = (): Theme => currentTheme;

export const setTheme = (theme: Theme) => {
  if (theme === currentTheme) return;
  currentTheme = theme;
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted, but the switch still applies for this session.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as Theme);
  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
  };
};

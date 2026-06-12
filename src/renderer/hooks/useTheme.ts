import { useEffect, useState } from 'react';
import { useStore } from '../utils/store';

export type EffectiveTheme = 'light' | 'dark';

/**
 * Resolves the user's theme preference ('light' | 'dark' | 'system') to the
 * effective theme. For 'system' it follows the OS prefers-color-scheme media
 * query and updates live when the OS setting changes.
 *
 * Components that render theme-dependent content outside the CSS cascade
 * (e.g. Chart.js canvases) can call this to re-render on theme changes.
 */
export function useEffectiveTheme(): EffectiveTheme {
  const theme = useStore((state) => state.settings.theme);
  const [systemDark, setSystemDark] = useState<boolean>(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  if (theme === 'light' || theme === 'dark') return theme;
  return systemDark ? 'dark' : 'light';
}

/**
 * Applies the effective theme by toggling the 'dark' class on <html>
 * (Tailwind darkMode: 'class'). Call once near the app root, after settings
 * are loaded into the store. Returns the effective theme so the caller can
 * pass it on (e.g. to react-toastify's ToastContainer).
 */
export function useApplyTheme(): EffectiveTheme {
  const effective = useEffectiveTheme();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }, [effective]);

  return effective;
}

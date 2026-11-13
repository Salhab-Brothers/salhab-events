import { useEffect, useState } from 'react';
import type { Theme } from '@/types';

const KEY = 'theme';

/** The saved choice, else what the device prefers. Storage can be blocked (private windows), so every access is guarded. */
export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* storage unavailable: fall through to the device preference */ }
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Sets the page theme before the first paint, so a saved dark choice does not flash white. */
export function applyInitialTheme() {
  document.documentElement.classList.toggle('dark', initialTheme() === 'dark');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = () => setTheme(t => {
    const next = t === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch { /* the choice just will not be remembered */ }
    return next;
  });

  return { theme, toggle };
}

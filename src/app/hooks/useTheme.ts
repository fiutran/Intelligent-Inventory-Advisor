import { useCallback, useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof document === 'undefined') return 'system';
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const dark =
        t === 'dark' ||
        (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      return dark ? 'light' : 'dark';
    });
  }, []);

  return { toggle };
}

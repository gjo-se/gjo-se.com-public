import { useEffect,useState } from 'react';

/**
 * useDarkMode – Dark-Mode-State + localStorage + HTML-Klasse.
 * Liefert [isDark, toggle] zurück.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggle = () => setIsDark((d) => !d);

  return [isDark, toggle] as const;
}

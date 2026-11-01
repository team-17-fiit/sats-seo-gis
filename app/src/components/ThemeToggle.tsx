'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const set = document.documentElement.dataset.theme;
    setTheme(set === 'light' || set === 'dark' ? set : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
    }
    setTheme(next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label="Zmeniť tému / Toggle theme" title="Zmeniť tému / Toggle theme">
      <span aria-hidden="true" className={theme === 'dark' ? 'is-dark' : undefined}>{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}

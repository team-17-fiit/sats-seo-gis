'use client';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle({ label }: { label: string }) {
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
      // localStorage môže byť zablokovaný; téma platí aspoň do zatvorenia stránky
    }
    setTheme(next);
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label} aria-pressed={theme === null ? undefined : theme === 'dark'}>
      <span aria-hidden="true" className={theme === 'dark' ? 'is-dark' : undefined}>{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}

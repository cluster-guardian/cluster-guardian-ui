import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cg-theme';

function readStored(): Theme {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

/**
 * Stamps data-theme on <html>. tokens.css declares dark under both the OS media
 * query and the [data-theme] scope, so an explicit choice wins in either
 * direction and "system" simply removes the stamp.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readStored());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem(STORAGE_KEY);
    } else {
      root.setAttribute('data-theme', theme);
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  return (
    <label className="app-header__switch">
      <span className="visually-hidden">Color theme</span>
      <select
        className="toolbar__select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as Theme)}
        aria-label="Color theme"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}

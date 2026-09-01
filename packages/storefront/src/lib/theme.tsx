'use client';
import { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('linnxy-theme');
    if (stored === 'light') setIsDark(false);
    else if (stored === 'dark') setIsDark(true);
    else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Wait until the storage/preference read has run so we never persist a stale value.
    if (!hydrated) return;
    // H11: a mounted store shell owns the page theme — don't stomp it here.
    if (document.documentElement.dataset.storeTheme) return;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('linnxy-theme', isDark ? 'dark' : 'light');
  }, [isDark, hydrated]);

  const toggleDark = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {}
});

const THEME_STORAGE_KEY = 'strokecrm_theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Initial sync from DOM attribute (set by head script) or localStorage
    if (typeof window !== 'undefined') {
      const rootTheme = document.documentElement.getAttribute('data-theme');
      if (rootTheme === 'light' || rootTheme === 'dark') return rootTheme;
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  const applyTheme = useCallback((newTheme) => {
    const validTheme = newTheme === 'light' ? 'light' : 'dark';
    setThemeState(validTheme);
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', validTheme);
      if (validTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, applyTheme]);

  // Listen to OS system preference changes if no manual preference stored
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    const handleChange = (e) => {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  const value = {
    theme,
    isDark: theme === 'dark',
    setTheme: applyTheme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

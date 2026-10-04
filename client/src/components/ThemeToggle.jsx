import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="tap-press relative p-2 rounded-lg bg-surface border border-subtle text-secondary hover:text-primary hover:bg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs"
      aria-label="Toggle dark and light theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      <span className="sr-only">Toggle theme</span>
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transform transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transform transition-transform duration-200 rotate-0 hover:-rotate-12" />
        )}
      </div>
    </button>
  );
}

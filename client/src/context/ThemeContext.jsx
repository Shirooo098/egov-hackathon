import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * Light-only Theme Provider for DICT eGov Platform
 * Government platforms should default to light mode for accessibility and readability.
 * Dark mode is disabled per DICT design guidelines.
 */
export function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Force light theme on document
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
    localStorage.setItem('ebuhay-theme', 'light');
  }, []);

  // No theme switching - always light for government accessibility
  const value = {
    theme: 'light',
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: false,
    mounted
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
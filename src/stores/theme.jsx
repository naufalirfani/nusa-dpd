import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load theme from localStorage or default to false (light mode)
    const savedTheme = localStorage.getItem('theme');
    
    // Clean up any existing dark class on initial load
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      return true;
    } else {
      document.documentElement.classList.remove('dark');
      return false;
    }
  });

  useEffect(() => {
    // Force remove/add to ensure clean state
    document.documentElement.classList.remove('dark', 'light');
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      // Explicitly ensure dark is removed
      localStorage.setItem('theme', 'light');
    }
    
    // Double-check after a tick
    requestAnimationFrame(() => {
      const hasClass = document.documentElement.classList.contains('dark');
      if (isDarkMode && !hasClass) {
        document.documentElement.classList.add('dark');
      } else if (!isDarkMode && hasClass) {
        document.documentElement.classList.remove('dark');
      }
    });
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      return !prev;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export default {
  ThemeProvider,
  useTheme,
};

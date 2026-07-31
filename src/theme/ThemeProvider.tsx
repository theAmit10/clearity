import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, type Theme, type ThemeName } from './themes';
import { FREE_THEMES } from '../constants/appInfo';
import { useHabitStore } from '../store/habitStore';

const STORAGE_KEY = '@theme';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => Promise<void>;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const proExpired = useHabitStore(s => s.proExpired);
  const [themeName, setThemeName] = useState<ThemeName>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored && stored in themes) {
        setThemeName(stored as ThemeName);
      } else if (systemScheme === 'dark') {
        setThemeName('dark');
      }
    });
  }, [systemScheme]);

  const setTheme = useCallback(async (name: ThemeName) => {
    setThemeName(name);
    await AsyncStorage.setItem(STORAGE_KEY, name);
  }, []);

  // Full-revoke: a lapsed Pro user must not keep a premium theme.
  useEffect(() => {
    if (!proExpired) return;
    if (FREE_THEMES.includes(themeName)) return;
    setTheme(systemScheme === 'dark' ? 'dark' : 'light');
  }, [proExpired, themeName, systemScheme, setTheme]);

  const theme = themes[themeName];

  const value: ThemeContextValue = {
    theme,
    themeName,
    setTheme,
    availableThemes: Object.values(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, ThemeScheme, paletteFor } from '../utils/theme';

const STORAGE_KEY = 'finassist.theme';

type ThemePreference = 'system' | ThemeScheme;

type ThemeContextValue = {
  /** Resolved light/dark used by UI */
  scheme: ThemeScheme;
  /** User choice: system | light | dark */
  preference: ThemePreference;
  colors: ColorPalette;
  setPreference: (next: ThemePreference) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      } catch {
        // ignore
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const scheme: ThemeScheme =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  useEffect(() => {
    if (!ready) return;
    try {
      // Reset to system when preference is system; otherwise force light/dark.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Appearance as any).setColorScheme(preference === 'system' ? null : preference);
    } catch {
      // older RN
    }
  }, [preference, ready]);

  const cycleTheme = useCallback(() => {
    setPreference(
      preference === 'dark' ? 'light' : preference === 'light' ? 'system' : 'dark'
    );
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      preference,
      colors: paletteFor(scheme),
      setPreference,
      cycleTheme,
    }),
    [scheme, preference, setPreference, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

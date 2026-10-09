import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../store/ThemeContext';
import type { ColorPalette } from '../utils/theme';

/** Rebuild styles when light/dark palette changes. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (c: ColorPalette) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}

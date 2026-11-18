import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useSettingsStore } from '@/features/settings/state/settings.store';
import {
  resolveColorScheme,
  type ResolvedColorScheme,
  type ThemePreference,
} from '@/shared/utils/theme/themePreference';
import { darkColors, lightColors, type ColorPalette } from './colorPalettes';
import { applyColorPalette } from './constants';
type ThemeContextValue = {
  colors: ColorPalette;
  resolvedScheme: ResolvedColorScheme;
  preference: ThemePreference;
};
const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  resolvedScheme: 'dark',
  preference: 'system',
});
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSettingsStore((s) => s.themePreference);
  const systemScheme = useColorScheme();
  const resolvedScheme = resolveColorScheme(preference, systemScheme);
  const colors = resolvedScheme === 'light' ? lightColors : darkColors;
  const value = useMemo(
    () => ({ colors, resolvedScheme, preference }),
    [colors, resolvedScheme, preference],
  );
  // Keep legacy `Colors` in sync before children render (useEffect ran one frame late).
  applyColorPalette(resolvedScheme);
  useLayoutEffect(() => {
    // react-native-web has no Appearance.setColorScheme; calling it crashed the
    // web build (Windows/Mac) on startup. The palette above already follows
    // the preference there.
    if (typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
    }
  }, [preference]);
  useEffect(() => {
    // Android is always edge-to-edge (SDK 55+), and the navigation bar buttons
    // follow the colour scheme set above, so only the root background is set here.
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [resolvedScheme, colors.background]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useThemedColors(): ColorPalette {
  return useContext(ThemeContext).colors;
}
export function useResolvedColorScheme(): ResolvedColorScheme {
  return useContext(ThemeContext).resolvedScheme;
}

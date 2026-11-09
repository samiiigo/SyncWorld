// ──────────────────────────────────────────────
// useSettingsStore.ts — App-wide user settings
// SRP: persistable UI preferences (theme) only
// ──────────────────────────────────────────────

import { create } from 'zustand';
import type { ThemePreference } from '@/shared/utils/theme/themePreference';

type SettingsState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

/**
 * Global settings store. The {@link ThemeProvider} subscribes to
 * `themePreference` to drive the active color scheme and OS chrome.
 */
export const useSettingsStore = create<SettingsState>((set, get) => ({
  themePreference: 'system',
  setThemePreference: (preference) => set({ themePreference: preference }),
  toggleTheme: () =>
    set({ themePreference: get().themePreference === 'dark' ? 'light' : 'dark' }),
}));

// ──────────────────────────────────────────────
// useSettingsStore.ts — App-wide user settings
// SRP: persistable UI preferences (theme) only
// ──────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemePreference } from '@/shared/utils/theme/themePreference';

type SettingsState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

/**
 * Global settings store. The {@link ThemeProvider} subscribes to
 * `themePreference` to drive the active color scheme and OS chrome.
 * Persisted, so a light/dark choice survives reloads and app restarts.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Spec §7.4: dark mode is the default; users can switch to light or system.
      themePreference: 'dark',
      setThemePreference: (preference) => set({ themePreference: preference }),
      toggleTheme: () => set({ themePreference: get().themePreference === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'syncworld.settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ themePreference }) => ({ themePreference }),
    },
  ),
);

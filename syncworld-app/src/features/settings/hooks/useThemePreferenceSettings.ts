import { useCallback, useMemo } from 'react';

import {
  themePreferenceDescription,
  themePreferenceTitle,
  type ThemePreference,
} from '@/shared/utils/theme/themePreference';
import { useSettingsStore } from '@/features/settings/state/settings.store';

export const THEME_PREFERENCE_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export function useThemePreferenceSettings() {
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const selectPreference = useCallback(
    (option: ThemePreference) => setThemePreference(option),
    [setThemePreference],
  );

  const options = useMemo(
    () =>
      THEME_PREFERENCE_OPTIONS.map((option) => ({
        option,
        selected: themePreference === option,
        title: themePreferenceTitle(option),
        subtitle: themePreferenceDescription(option),
      })),
    [themePreference],
  );

  return { themePreference, options, selectPreference };
}

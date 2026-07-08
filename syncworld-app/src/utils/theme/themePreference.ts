// ──────────────────────────────────────────────
// themePreference.ts — Theme preference model
// SRP: maps the user's stored preference to a concrete color scheme
// ──────────────────────────────────────────────

import type { ColorSchemeName } from 'react-native';

/** What the user picked in settings. `system` follows the OS appearance. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** The concrete scheme the UI renders with, after resolving `system`. */
export type ResolvedColorScheme = 'light' | 'dark';

/**
 * Resolves a stored {@link ThemePreference} against the current OS scheme.
 * Falls back to `dark` (the design system default) when the OS scheme is unknown.
 */
export function resolveColorScheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName,
): ResolvedColorScheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  return systemScheme === 'light' ? 'light' : 'dark';
}

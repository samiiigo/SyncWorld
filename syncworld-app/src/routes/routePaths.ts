/**
 * Canonical Expo Router path literals used across the app.
 * Values must match file-based routes under `app/`.
 */
export const RoutePaths = {
  index: '/',
  onboarding: '/onboarding',
  armed: '/armed',
  rooms: '/(tabs)/rooms',
  roomDetail: (id: string) => `/(tabs)/rooms/${id}` as const,
  world: '/(tabs)/world',
  settings: '/(tabs)/settings',
  settingsPage: (page: string) => `/(tabs)/settings/${page}` as const,
} as const;

export type AppRoutePath =
  | typeof RoutePaths.index
  | typeof RoutePaths.onboarding
  | typeof RoutePaths.armed
  | typeof RoutePaths.rooms
  | typeof RoutePaths.world
  | typeof RoutePaths.settings
  | `/(tabs)/rooms/${string}`
  | `/(tabs)/settings/${string}`;

import { RoutePaths } from './routePaths';

/** Primary app routes that expect an established display name. */
export const protectedRoutes = [
  RoutePaths.rooms,
  RoutePaths.world,
  RoutePaths.settings,
  RoutePaths.armed,
] as const;

import { Redirect } from 'expo-router';

import { useAppContext } from '@/context/AppContext';
import { RoutePaths } from '@/routes';

export default function Index() {
  const { displayName, hydrated } = useAppContext();

  // Wait for the persisted profile so returning users skip onboarding (spec line 21).
  if (!hydrated) return null;

  if (!displayName || !displayName.trim()) {
    return <Redirect href={RoutePaths.onboarding} />;
  }

  return <Redirect href={RoutePaths.rooms} />;
}

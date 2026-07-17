import { Redirect } from 'expo-router';

import { useAppContext } from '@/context/AppContext';
import { RoutePaths } from '@/routes';

export default function Index() {
  const { displayName } = useAppContext();

  if (!displayName || !displayName.trim()) {
    return <Redirect href={RoutePaths.onboarding} />;
  }

  return <Redirect href={RoutePaths.rooms} />;
}

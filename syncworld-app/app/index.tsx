import { Redirect } from 'expo-router';
import { useAppContext } from '../src/context/AppContext';

export default function Index() {
  const { displayName } = useAppContext();

  if (!displayName || !displayName.trim()) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/rooms" />;
}

import { Stack } from 'expo-router';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { AppProvider } from '../src/context/AppContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
    </ThemeProvider>
  );
}

import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDrawer } from '@/components/app-drawer';
import { SessionProvider } from '@/features/auth/session-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          {/* Auth is restored in the background; access stays open during the demo. */}
          <AppDrawer />
          <AnimatedSplashOverlay />
        </SessionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

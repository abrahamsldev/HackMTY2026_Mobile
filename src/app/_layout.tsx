import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppDrawer } from '@/components/app-drawer';
import { SessionProvider } from '@/features/auth/session-provider';
import { AccessibilityProvider, useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SessionProvider><AccessibilityProvider><AccessibleNavigation /></AccessibilityProvider></SessionProvider></GestureHandlerRootView>;
}
function AccessibleNavigation() {
  const { colorScheme } = useAccessibility();
  const theme = useTheme();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  return <ThemeProvider value={{ ...base, colors: { ...base.colors, background: theme.background, card: theme.background, text: theme.text, border: theme.border, primary: theme.accent } }}><AppDrawer /><AnimatedSplashOverlay /></ThemeProvider>;
}

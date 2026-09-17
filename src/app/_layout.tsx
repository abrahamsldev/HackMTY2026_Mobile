import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { AccessibilityProvider, useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useTheme } from '@/hooks/use-theme';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 320, fade: true });

export default function RootLayout() {
  // Fonts load outside the providers: the face is needed by the first painted
  // frame, and nothing about it depends on session or preferences.
  const fontsSettled = useAppFonts();
  return <GestureHandlerRootView style={{ flex: 1 }}><SessionProvider><AccessibilityProvider><AccessibleNavigation fontsSettled={fontsSettled} /></AccessibilityProvider></SessionProvider></GestureHandlerRootView>;
}
function AccessibleNavigation({ fontsSettled }: { fontsSettled: boolean }) {
  const { colorScheme } = useAccessibility();
  const { session, isLoading, isRecovering } = useSession();
  const theme = useTheme();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  // Paint the window itself, so a navigation transition never reveals a white
  // gap behind the screens in dark mode.
  useEffect(() => { void SystemUI.setBackgroundColorAsync(theme.background); }, [theme.background]);
  // Hold the splash until the app can paint its real first frame: the session
  // decides which route mounts, the face decides what that route looks like.
  useEffect(() => { if (!isLoading && fontsSettled) void SplashScreen.hideAsync(); }, [isLoading, fontsSettled]);
  if (isLoading || !fontsSettled) return <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Verificando tu sesión" /></View>;
  return <ThemeProvider value={{ ...base, colors: { ...base.colors, background: theme.background, card: theme.background, text: theme.text, border: theme.border, primary: theme.accent } }}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(session) && !isRecovering}><Stack.Screen name="(app)" /></Stack.Protected>
      <Stack.Protected guard={Boolean(session)}><Stack.Screen name="reset-password" /></Stack.Protected>
      <Stack.Protected guard={!session}><Stack.Screen name="sign-in" /></Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  </ThemeProvider>;
}

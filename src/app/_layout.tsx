import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { AccessibilityProvider, useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

void SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><SessionProvider><AccessibilityProvider><AccessibleNavigation /></AccessibilityProvider></SessionProvider></GestureHandlerRootView>;
}
function AccessibleNavigation() {
  const { colorScheme } = useAccessibility();
  const { session, isLoading, isRecovering } = useSession();
  const theme = useTheme();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  useEffect(() => { if (!isLoading) void SplashScreen.hideAsync(); }, [isLoading]);
  if (isLoading) return <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Verificando tu sesión" /></View>;
  return <ThemeProvider value={{ ...base, colors: { ...base.colors, background: theme.background, card: theme.background, text: theme.text, border: theme.border, primary: theme.accent } }}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(session) && !isRecovering}><Stack.Screen name="(app)" /></Stack.Protected>
      <Stack.Protected guard={Boolean(session)}><Stack.Screen name="reset-password" /></Stack.Protected>
      <Stack.Protected guard={!session}><Stack.Screen name="sign-in" /></Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  </ThemeProvider>;
}

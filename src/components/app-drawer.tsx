import { useNavigation } from 'expo-router';
import {
  Drawer,
  DrawerContentScrollView,
  DrawerToggleButton,
  type DrawerContentComponentProps,
  type DrawerNavigationProp,
} from 'expo-router/drawer';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';

function AccountDrawerContent(props: DrawerContentComponentProps) {
  const { profile, session, isLoading, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      props.navigation.navigate('index');
      props.navigation.closeDrawer();
    } catch {
      setError('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.drawerHeader}>
        <ThemedText type="smallBold">Mi cuenta</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar menú"
          onPress={() => props.navigation.closeDrawer()}
          style={styles.headerButton}>
          <ThemedText style={styles.closeIcon}>×</ThemedText>
        </Pressable>
      </View>
      <View style={styles.profile}>
        <ThemedText style={styles.name}>{profile.fullName || 'Invitado'}</ThemedText>
        {profile.email ? <ThemedText themeColor="textSecondary">{profile.email}</ThemedText> : null}
        {!session && <ThemedText type="small" themeColor="textSecondary">Modo de prueba</ThemedText>}
      </View>
      <ActionButton
        label="Configuración"
        variant="secondary"
        size="lg"
        fullWidth
        disabled={signingOut}
        onPress={() => {
          props.navigation.navigate('settings');
          props.navigation.closeDrawer();
        }}
      />
      <View style={styles.footer}>
        {error && <InfoBanner tone="danger" message={error} />}
        <ActionButton
          label="Cerrar sesión"
          variant="outline"
          size="lg"
          fullWidth
          disabled={isLoading}
          loading={signingOut}
          onPress={handleSignOut}
        />
      </View>
    </DrawerContentScrollView>
  );
}

function BackToMainButton() {
  const navigation = useNavigation<DrawerNavigationProp<{ index: undefined; settings: undefined }>>();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver al inicio"
      style={styles.headerButton}
      onPress={() => navigation.navigate('index')}>
      <ThemedText style={styles.backIcon}>←</ThemedText>
    </Pressable>
  );
}

export function AppDrawer() {
  const theme = useTheme();
  const { session, resetVersion } = useSession();
  return (
    <Drawer
      // Discard generated surfaces and form drafts when the account changes or signs out.
      key={`${session?.user.id ?? 'guest'}:${resetVersion}`}
      initialRouteName="index"
      backBehavior="initialRoute"
      drawerContent={(props) => <AccountDrawerContent {...props} />}
      screenOptions={{
        drawerType: 'front',
        drawerStyle: { backgroundColor: theme.background, width: 300 },
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
        overlayAccessibilityLabel: 'Cerrar menú',
        headerLeft: () => <DrawerToggleButton accessibilityLabel="Abrir menú" tintColor={theme.text} />,
      }}>
      {/* All banking requests update this A2UI surface; there are no feature tabs. */}
      <Drawer.Screen name="index" options={{ title: 'Inicio' }} />
      <Drawer.Screen name="settings" options={{ title: 'Configuración', headerLeft: () => <BackToMainButton /> }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContent: { flexGrow: 1, paddingHorizontal: Spacing.three, gap: Spacing.four },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 28, lineHeight: 32 },
  backIcon: { fontSize: 28, lineHeight: 32 },
  profile: { gap: Spacing.two },
  name: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  footer: { marginTop: 'auto', gap: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three },
});

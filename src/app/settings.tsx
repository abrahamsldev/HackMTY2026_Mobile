import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { Spacing } from '@/constants/theme';
import { profileSchema, type UserProfile } from '@/features/auth/profile';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { profile, session, isLoading, error } = useSession();
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <Page>
        <View style={styles.content}>
          <ThemedText style={styles.title}>Tus datos</ThemedText>
          <ThemedText themeColor="textSecondary">Actualiza tu nombre y correo electrónico.</ThemedText>
          {error && <InfoBanner tone="warning" message={error} />}
          {isLoading ? <ActivityIndicator accessibilityLabel="Cargando datos de usuario" /> : (
            <ProfileForm
              key={session?.user.id ?? 'guest'}
              initialProfile={profile}
              isGuest={!session}
            />
          )}
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

function ProfileForm({ initialProfile, isGuest }: { initialProfile: UserProfile; isGuest: boolean }) {
  const theme = useTheme();
  const { updateProfile } = useSession();
  const [draft, setDraft] = useState(initialProfile);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  async function save() {
    if (saving) return;
    setFeedback(null);
    const parsed = profileSchema.safeParse(draft);
    if (!parsed.success) {
      setFeedback({ tone: 'danger', message: parsed.error.issues[0].message });
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile(parsed.data);
      setDraft(parsed.data);
      setFeedback({
        tone: 'success',
        message: result.savedLocally
          ? 'Datos guardados en este dispositivo.'
          : result.emailConfirmationRequired
            ? 'Nombre actualizado. Revisa tu correo para confirmar el cambio de dirección.'
            : 'Tus datos se actualizaron.',
      });
    } catch {
      setFeedback({ tone: 'danger', message: 'No se pudieron guardar los cambios. Inténtalo de nuevo.' });
    } finally {
      setSaving(false);
    }
  }

  function change(field: keyof UserProfile, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  return (
    <View style={styles.content}>
      {isGuest && <InfoBanner message="Estás en modo de prueba. Tus datos se guardan solo en este dispositivo mientras no tengas una sesión iniciada." />}
      <View style={styles.field}>
        <ThemedText type="smallBold">Nombre completo</ThemedText>
        <TextInput
          accessibilityLabel="Nombre completo"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          value={draft.fullName}
          onChangeText={(value) => change('fullName', value)}
          editable={!saving}
          maxLength={80}
          placeholder="Tu nombre"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
        />
      </View>
      <View style={styles.field}>
        <ThemedText type="smallBold">Correo electrónico</ThemedText>
        <TextInput
          accessibilityLabel="Correo electrónico"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={draft.email}
          onChangeText={(value) => change('email', value)}
          editable={!saving}
          maxLength={254}
          placeholder="nombre@correo.com"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="done"
          onSubmitEditing={save}
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
        />
      </View>
      {feedback && <View accessibilityLiveRegion="polite"><InfoBanner {...feedback} /></View>}
      <ActionButton label="Guardar cambios" size="lg" fullWidth loading={saving} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.four },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  field: { gap: Spacing.two },
  input: { minHeight: 52, borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.three, fontSize: 16 },
});

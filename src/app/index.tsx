import { TextInput, type TextInputHandle } from '@/components/accessible-primitives';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { Spacing } from '@/constants/theme';
import { A2UISurface } from '@/features/assistant/components/a2ui-surface';
import { QuestionBank } from '@/features/assistant/components/question-bank';
import { useAssistant } from '@/features/assistant/use-assistant';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const { profile, isLoading } = useSession();
  const email = profile.email.trim();
  const navigation = useNavigation<DrawerNavigationProp<{ index: undefined; settings: undefined; explore: undefined }>>();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <Page>
        <View style={styles.content}>
          <View style={styles.intro}>
            <ThemedText style={styles.title}>¿Qué necesitas hoy?</ThemedText>
            <ThemedText themeColor="textSecondary">Cuéntame qué quieres revisar. La pantalla se adapta a tu consulta.</ThemedText>
          </View>
          {isLoading ? <ActivityIndicator accessibilityLabel="Cargando tu perfil" /> : email ? (
            // Remounting also aborts requests and discards the previous user's data.
            <AssistantWorkspace key={email} email={email} />
          ) : (
            <View style={styles.intro}>
              <InfoBanner message="Agrega tu correo electrónico en tu perfil para usar el asistente." />
              <ActionButton label="Completar mi perfil" onPress={() => navigation.navigate('settings')} />
            </View>
          )}
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

function AssistantWorkspace({ email }: { email: string }) {
  const theme = useTheme();
  const assistant = useAssistant(email);
  const [query, setQuery] = useState('');
  const queryInput = useRef<TextInputHandle>(null);

  function submit(value: string) {
    if (!value.trim() || assistant.pending || !assistant.isConfigured) return;
    setQuery(value);
    Keyboard.dismiss();
    void assistant.send(value);
  }

  return (
    <View style={styles.content}>
      {!assistant.isConfigured && <InfoBanner message="El asistente estará disponible cuando se configure su conexión." />}
      <QuestionBank disabled={assistant.pending} onSelect={(question) => {
        setQuery(question);
        queryInput.current?.focus();
      }} />
      <View style={styles.intro}>
        <ThemedText type="smallBold">Tu consulta</ThemedText>
        <TextInput
          ref={queryInput}
          accessibilityLabel="Escribe tu consulta"
          placeholder="Por ejemplo: ¿en qué puedo ahorrar este mes?"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          multiline
          maxLength={4000}
          editable={!assistant.pending}
          textAlignVertical="top"
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}
        />
        <ActionButton label="Consultar" fullWidth size="lg" loading={assistant.pending} disabled={!query.trim() || !assistant.isConfigured} onPress={() => submit(query)} />
      </View>
      {assistant.pending && <View style={styles.intro} accessibilityLiveRegion="polite">
        <ActivityIndicator accessibilityLabel="Consultando al agente" />
        <ThemedText themeColor="textSecondary">Preparando tu respuesta…</ThemedText>
        <ActionButton label="Cancelar consulta" variant="outline" onPress={assistant.cancel} />
      </View>}
      {assistant.error && <View style={styles.intro} accessibilityLiveRegion="polite">
        <InfoBanner tone="danger" message={assistant.error} />
        <ActionButton label="Reintentar" variant="outline" onPress={() => { void assistant.retry(); }} />
      </View>}
      {assistant.surface && <View key={assistant.surface.revision} style={styles.content}>
        {assistant.surface.reply.message !== '' && <View style={styles.intro} accessibilityLiveRegion="polite">
          <ThemedText type="smallBold" accessibilityRole="header">Respuesta del asistente</ThemedText>
          <ThemedText selectable>{assistant.surface.reply.message}</ThemedText>
        </View>}
        {assistant.surface.reply.payload && <A2UISurface payload={assistant.surface.reply.payload} disabled={assistant.pending} onDispatch={assistant.dispatch} />}
        {assistant.surface.reply.hasUnsupportedSurface && <InfoBanner message="El detalle visual no está disponible. Puedes consultar la respuesta de texto." />}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.four },
  intro: { gap: Spacing.two },
  title: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  input: { minHeight: 100, maxHeight: 200, borderWidth: 1, borderRadius: 12, padding: Spacing.three, fontSize: 17, lineHeight: 24 },
});

import { TextInput, type TextInputHandle } from '@/components/accessible-primitives';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { Spacing } from '@/constants/theme';
import { A2UISurface } from '@/features/assistant/components/a2ui-surface';
import { AssistantFallback } from '@/features/assistant/components/assistant-fallback';
import { QuestionBank } from '@/features/assistant/components/question-bank';
import { useAssistant } from '@/features/assistant/use-assistant';
import { useSession } from '@/features/auth/session-provider';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const { session } = useSession();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <Page>
        <View style={styles.content}>
          <View style={styles.intro}>
            <ThemedText style={styles.title}>¿Qué necesitas hoy?</ThemedText>
            <ThemedText themeColor="textSecondary">Cuéntame qué quieres revisar. La pantalla se adapta a tu consulta.</ThemedText>
          </View>
          {session && <AssistantWorkspace key={session.user.id} currentUserId={session.user.id} />}
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

function AssistantWorkspace({ currentUserId }: { currentUserId: string }) {
  const theme = useTheme();
  const assistant = useAssistant(currentUserId);
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
      {!assistant.pending && assistant.error && <AssistantFallback
        message={assistant.error}
        onRetry={() => { void assistant.retry(); }}
        onEdit={() => queryInput.current?.focus()}
      />}
      {!assistant.pending && !assistant.error && assistant.surface && <View key={assistant.surface.revision} style={styles.content}>
        {assistant.surface.reply.message !== '' && <View style={styles.intro} accessibilityLiveRegion="polite">
          <ThemedText type="smallBold" accessibilityRole="header">Respuesta del asistente</ThemedText>
          <ThemedText selectable>{assistant.surface.reply.message}</ThemedText>
        </View>}
        {!assistant.surface.reply.a2uiError && assistant.surface.a2uiSurfaces.map((surface) => (
          <A2UISurface
            key={surface.surfaceId}
            surface={surface}
            disabled={assistant.pending}
            onDispatch={assistant.dispatch}
          />
        ))}
        {assistant.surface.reply.a2uiError && <AssistantFallback
          message={assistant.surface.reply.a2uiError}
          onRetry={() => { void assistant.retry(); }}
          onEdit={() => queryInput.current?.focus()}
        />}
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

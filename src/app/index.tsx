import { TextInput, Pressable, type TextInputHandle } from '@/components/accessible-primitives';
import { useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Page } from '@/components/layout/page';
import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { InfoBanner } from '@/components/ui/info-banner';
import { Spacing } from '@/constants/theme';
import { type Persona } from '@/features/assistant/agent';
import { A2UISurface } from '@/features/assistant/components/a2ui-surface';
import { QuestionBank } from '@/features/assistant/components/question-bank';
import { useAssistant } from '@/features/assistant/use-assistant';
import { useTheme } from '@/hooks/use-theme';

const personas: { id: Persona; label: string }[] = [
  { id: 'ana', label: 'Ana' }, { id: 'luis', label: 'Luis' }, { id: 'sofia', label: 'Sofía' },
];

export default function HomeScreen() {
  const [persona, setPersona] = useState<Persona>('ana');
  const theme = useTheme();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <Page>
        <View style={styles.content}>
          <View style={styles.intro}>
            <ThemedText style={styles.title}>¿Qué necesitas hoy?</ThemedText>
            <ThemedText themeColor="textSecondary">Cuéntame qué quieres revisar. La pantalla se adapta a tu consulta.</ThemedText>
          </View>
          <View style={styles.intro}>
            <ThemedText type="smallBold">Perfil de demostración</ThemedText>
            <View style={styles.personas}>
              {personas.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`Perfil de ${item.label}`}
                  accessibilityState={{ checked: item.id === persona }}
                  onPress={() => setPersona(item.id)}
                  style={[styles.persona, { backgroundColor: item.id === persona ? theme.backgroundSelected : theme.backgroundElement }]}>
                  <ThemedText>{item.label}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">Las consultas usan perfiles de prueba. No se contratan productos ni se modifican suscripciones.</ThemedText>
          </View>
          {/* Remounting also aborts requests and discards the previous persona's data. */}
          <AssistantWorkspace key={persona} persona={persona} />
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}

function AssistantWorkspace({ persona }: { persona: Persona }) {
  const theme = useTheme();
  const assistant = useAssistant(persona);
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
      {assistant.surface && <A2UISurface key={assistant.surface.revision} payload={assistant.surface.payload} disabled={assistant.pending} onDispatch={assistant.dispatch} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.four },
  intro: { gap: Spacing.two },
  title: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  personas: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  persona: { paddingHorizontal: Spacing.four, minHeight: 48, borderRadius: 12, justifyContent: 'center' },
  input: { minHeight: 100, maxHeight: 200, borderWidth: 1, borderRadius: 12, padding: Spacing.three, fontSize: 17, lineHeight: 24 },
});

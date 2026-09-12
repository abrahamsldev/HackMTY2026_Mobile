import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { questionBank, questionCount, searchQuestions } from '../question-bank';

export function QuestionBank({ onSelect, disabled = false }: {
  onSelect: (question: string) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [openArea, setOpenArea] = useState<string | null>(null);
  const results = searchQuestions(search);

  return (
    <View style={[styles.container, { borderColor: theme.backgroundSelected }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Banco de preguntas"
        onPress={() => setExpanded((value) => !value)}
        style={styles.heading}>
        <View style={styles.label}>
          <ThemedText type="smallBold">Banco de preguntas</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{questionBank.length} áreas · {questionCount} preguntas</ThemedText>
        </View>
        <ThemedText>{expanded ? '−' : '+'}</ThemedText>
      </Pressable>
      {expanded && <View style={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          Elige una pregunta para completar tu consulta. Puedes editarla antes de enviarla.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Las vistas y acciones descritas son una referencia del producto. Su disponibilidad depende del agente; elegir un ejemplo no ejecuta operaciones.
        </ThemedText>
        <TextInput
          accessibilityLabel="Buscar en el banco de preguntas"
          placeholder="Buscar tema o pregunta"
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        {results.length === 0 && <ThemedText type="small" accessibilityLiveRegion="polite">No encontramos preguntas. Prueba con otro término.</ThemedText>}
        {results.map((intent) => {
          const isOpen = Boolean(search.trim()) || openArea === intent.id;
          return (
            <View key={intent.id} style={styles.area}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => {
                  setSearch('');
                  setOpenArea(isOpen ? null : intent.id);
                }}
                style={[styles.heading, { backgroundColor: theme.backgroundElement, borderRadius: 8 }]}>
                <ThemedText type="smallBold" style={styles.label}>{intent.area}</ThemedText>
                <ThemedText>{isOpen ? '−' : '+'}</ThemedText>
              </Pressable>
              {isOpen && intent.questions.map((question) => (
                <Pressable
                  key={question}
                  accessibilityRole="button"
                  accessibilityLabel={`Usar pregunta: ${question}`}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => {
                    setExpanded(false);
                    onSelect(question);
                  }}
                  style={({ pressed }) => [styles.question, { borderColor: theme.backgroundSelected, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
                  <ThemedText>{question}</ThemedText>
                </Pressable>
              ))}
              {isOpen && <View style={[styles.reference, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">Vista esperada</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{intent.expectedDisplay}</ThemedText>
                <ThemedText type="smallBold">Acciones posibles · referencia</ThemedText>
                {intent.possibleActions.map((action) => (
                  <ThemedText key={action} type="small" themeColor="textSecondary">• {action}</ThemedText>
                ))}
              </View>}
            </View>
          );
        })}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 12 },
  heading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  label: { flex: 1 },
  content: { padding: Spacing.three, paddingTop: 0, gap: Spacing.three },
  search: { minHeight: 48, borderRadius: 8, padding: Spacing.three, fontSize: 16 },
  area: { gap: Spacing.two },
  reference: { borderRadius: 8, padding: Spacing.three, gap: Spacing.two },
  question: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderRadius: 8, padding: Spacing.three },
});

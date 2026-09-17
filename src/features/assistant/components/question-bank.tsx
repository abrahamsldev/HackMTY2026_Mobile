import { TextInput, Pressable } from '@/components/accessible-primitives';
import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { questionBank, questionCount, searchQuestions } from '../question-bank';
import { financialViewCatalog } from '@/features/financial-ui/catalog';
import type { FinancialViewIntent } from '@/features/financial-ui/model';

export type QuestionBankSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (question: string) => void;
  disabled?: boolean;
};

/**
 * The 13-area question bank, presented as a sheet.
 *
 * `presentationStyle="pageSheet"` is the platform's own sheet on iOS, while the
 * content stays plain React Native — so it keeps the app's text scaling,
 * palette and tap targets. Hosting this inside a SwiftUI sheet would mean
 * bridging a scrollable, searchable list across the boundary and competing with
 * the sheet's own drag gesture.
 *
 * It is a sheet rather than the inline accordion it used to be because
 * expanding in place pushes the composer off the welcome screen.
 */
export function QuestionBankSheet({ visible, onClose, onSelect, disabled = false }: QuestionBankSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [openArea, setOpenArea] = useState<string | null>(null);
  const results = searchQuestions(search);

  function handleSelect(question: string) {
    onSelect(question);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={Platform.OS === 'android'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}>
      <View
        style={[
          styles.backdrop,
          // Android has no sheet presentation style, so the sheet shape is drawn
          // here: a scrim, and a panel that stops short of the status bar.
          Platform.OS === 'android' && {
            backgroundColor: theme.overlay,
            paddingTop: insets.top + Spacing.xxl,
          },
        ]}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.background },
            Platform.OS === 'android' && styles.sheetAndroid,
          ]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerText}>
              <ThemedText type="smallBold">Banco de preguntas</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {questionBank.length} áreas · {questionCount} preguntas
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar banco de preguntas"
              onPress={onClose}
              style={styles.closeButton}>
              <AppIcon name="close" size={22} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}
            keyboardShouldPersistTaps="handled">
            <ThemedText type="small" themeColor="textSecondary">
              Elige una pregunta para completar tu consulta. Puedes editarla antes de enviarla.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Las vistas y acciones descritas son una referencia del producto. Su disponibilidad depende del agente; elegir un ejemplo no ejecuta operaciones.
            </ThemedText>

            <View style={[styles.searchRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <AppIcon name="search" size={18} color={theme.textSecondary} />
              <TextInput
                accessibilityLabel="Buscar en el banco de preguntas"
                placeholder="Buscar tema o pregunta"
                placeholderTextColor={theme.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                style={[styles.search, { color: theme.text }]}
              />
            </View>

            {results.length === 0 && (
              <ThemedText type="small" accessibilityLiveRegion="polite">
                No encontramos preguntas. Prueba con otro término.
              </ThemedText>
            )}

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
                    style={[styles.areaHeading, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="smallBold" style={styles.label}>{intent.area}</ThemedText>
                    <AppIcon name={isOpen ? 'collapse' : 'expand'} size={18} color={theme.text} />
                  </Pressable>
                  {isOpen && intent.questions.map((question) => (
                    <Pressable
                      key={question}
                      accessibilityRole="button"
                      accessibilityLabel={`Usar pregunta: ${question}`}
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() => handleSelect(question)}
                      style={({ pressed }) => [
                        styles.question,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
                        },
                      ]}>
                      <ThemedText>{question}</ThemedText>
                    </Pressable>
                  ))}
                  {isOpen && (
                    <View style={[styles.reference, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                      <ThemedText type="smallBold">Vista esperada</ThemedText>
                      <ThemedText type="smallBold">{financialViewCatalog[intent.id as FinancialViewIntent]?.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">{intent.expectedDisplay}</ThemedText>
                      <ThemedText type="smallBold">Acciones posibles · referencia</ThemedText>
                      {intent.possibleActions.map((action) => (
                        <ThemedText key={action} type="small" themeColor="textSecondary">• {action}</ThemedText>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { flex: 1 },
  sheetAndroid: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: { flex: 1, gap: Spacing.xxs },
  closeButton: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.md },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  search: { flex: 1, minHeight: 48, fontSize: 16, paddingVertical: Spacing.sm },
  label: { flex: 1 },
  area: { gap: Spacing.sm },
  areaHeading: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  reference: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  question: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
});

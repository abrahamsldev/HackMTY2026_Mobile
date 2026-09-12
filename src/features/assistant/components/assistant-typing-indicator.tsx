import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AssistantTypingIndicatorProps = {
  onCancel?: () => void;
};

export function AssistantTypingIndicator({ onCancel }: AssistantTypingIndicatorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View
        style={[
          styles.statusLine,
          {
            backgroundColor: theme.background,
            borderColor: theme.accent,
          },
        ]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="El asistente está analizando tus finanzas"
        accessibilityValue={{ text: 'En curso' }}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Analizando tus finanzas…
        </ThemedText>
      </View>

      {onCancel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar consulta"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            { opacity: pressed ? 0.55 : 1 },
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            Cancelar
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.half,
  },
  statusLine: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});

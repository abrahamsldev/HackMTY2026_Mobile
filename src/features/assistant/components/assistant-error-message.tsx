import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AssistantErrorMessageProps = {
  message?: string;
  onRetry?: () => void;
};

export function AssistantErrorMessage({
  message = 'No pude completar la consulta.',
  onRetry,
}: AssistantErrorMessageProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            borderColor: theme.accent,
          },
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive">
        <ThemedText style={[styles.message, { color: theme.danger }]}>
          {message}
        </ThemedText>
      </View>

      {onRetry && <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar consulta"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: pressed ? theme.backgroundElement : 'transparent',
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <AppIcon name="retry" color={theme.accent} />
        </Pressable>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  container: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  actionButton: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

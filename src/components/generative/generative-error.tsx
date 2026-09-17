import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GenerativeErrorProps = {
  nodeId: string;
  type: string;
  error: string;
};

export function GenerativeError({ nodeId, type, error }: GenerativeErrorProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: '#EF4444',
        },
      ]}>
      <ThemedText type="smallBold" style={styles.errorTitle}>
        [Generative UI Error] Component &apos;{type}&apos; (id: {nodeId})
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {error}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: Spacing.md,
    borderWidth: 1,
    gap: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  errorTitle: {
    color: '#EF4444',
  },
});

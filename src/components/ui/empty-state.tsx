import { Text } from '@/components/accessible-primitives';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type EmptyStateProps = {
  title: string;
  description?: string;
  tone?: 'default' | 'muted';
};

export function EmptyState({
  title,
  description,
  tone = 'default',
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}${description ? `. ${description}` : ''}`}
      style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            color: tone === 'muted' ? theme.textSecondary : theme.text,
          },
        ]}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  description: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

export type SectionProps = {
  children?: React.ReactNode;
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const spacingMap = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.md,
  lg: Spacing.lg,
  xl: Spacing.xl,
} as const;

const paddingMap = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.md,
  lg: Spacing.lg,
} as const;

export function Section({
  children,
  spacing = 'md',
  padding = 'none',
}: SectionProps) {
  return (
    <View
      style={[
        styles.section,
        {
          gap: spacingMap[spacing],
          padding: paddingMap[padding],
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
});

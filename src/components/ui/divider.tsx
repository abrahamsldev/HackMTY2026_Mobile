import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DividerProps = {
  inset?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted';
};

export function Divider({
  inset = 'none',
  tone = 'default',
}: DividerProps) {
  const theme = useTheme();

  const insetMap = {
    none: 0,
    sm: Spacing.sm,
    md: Spacing.lg,
    lg: Spacing.huge,
  };

  const marginHorizontal = insetMap[inset];
  const color =
    tone === 'muted'
      ? theme.backgroundSelected
      : theme.backgroundSelected;

  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: color,
          marginHorizontal,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: 'auto',
  },
});

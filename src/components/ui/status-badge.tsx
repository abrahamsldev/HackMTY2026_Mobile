import { Text } from '@/components/accessible-primitives';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
};

export function StatusBadge({
  label,
  tone = 'neutral',
  size = 'md',
}: StatusBadgeProps) {
  const theme = useTheme();

  const getColors = () => {
    switch (tone) {
      case 'info':
        return {
          bg: theme.backgroundElement,
          text: theme.info,
          dot: theme.info,
        };
      case 'success':
        return {
          bg: theme.backgroundElement,
          text: theme.success,
          dot: theme.success,
        };
      case 'warning':
        return {
          bg: theme.backgroundElement,
          text: theme.warning,
          dot: theme.warning,
        };
      case 'danger':
        return {
          bg: theme.backgroundElement,
          text: theme.danger,
          dot: theme.danger,
        };
      case 'neutral':
      default:
        return {
          bg: theme.backgroundSelected,
          text: theme.textSecondary,
          dot: theme.textSecondary,
        };
    }
  };

  const colors = getColors();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Estado: ${label}`}
      style={[
        styles.badge,
        styles[size],
        { backgroundColor: colors.bg },
      ]}>
      <View style={[styles.dot, { backgroundColor: colors.dot }]} />
      <Text
        style={[
          styles.text,
          styles[`text_${size}`],
          { color: colors.text },
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.lg,
    gap: Spacing.xs,
  },
  sm: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  md: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  text_sm: {
    fontSize: 12,
    lineHeight: 16,
  },
  text_md: {
    fontSize: 13,
    lineHeight: 18,
  },
});

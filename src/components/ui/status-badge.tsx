import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
          bg: '#E0F2FE',
          text: '#0284C7',
          dot: '#0284C7',
        };
      case 'success':
        return {
          bg: '#DCFCE7',
          text: '#16A34A',
          dot: '#16A34A',
        };
      case 'warning':
        return {
          bg: '#FEF3C7',
          text: '#D97706',
          dot: '#D97706',
        };
      case 'danger':
        return {
          bg: '#FEE2E2',
          text: '#DC2626',
          dot: '#DC2626',
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
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  sm: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.two,
  },
  md: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two + 2,
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

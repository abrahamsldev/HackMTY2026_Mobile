import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextBlockProps = {
  value: string;
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'amount';
  color?: 'default' | 'muted' | 'success' | 'danger';
  align?: 'left' | 'center' | 'right';
};

export function TextBlock({
  value,
  variant = 'body',
  color = 'default',
  align = 'left',
}: TextBlockProps) {
  const theme = useTheme();

  const textColor =
    color === 'muted'
      ? theme.textSecondary
      : color === 'success'
        ? '#10B981'
        : color === 'danger'
          ? '#EF4444'
          : theme.text;

  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        {
          color: textColor,
          textAlign: align,
        },
      ]}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Fonts.sans,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
});

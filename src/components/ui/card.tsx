import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { Pressable } from '@/components/accessible-primitives';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = {
  children?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated' | 'highlighted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
};

const paddingMap = {
  none: 0,
  sm: Spacing.two,
  md: Spacing.four,
  lg: Spacing.five,
} as const;

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
}: CardProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();

  const isElevated = variant === 'elevated';
  const isOutlined = variant === 'outlined';
  const isHighlighted = variant === 'highlighted';

  const backgroundColor =
    variant === 'default'
      ? theme.backgroundElement
      : isHighlighted
        ? theme.backgroundElement
        : theme.background;

  const borderColor = settings.highContrast ? theme.border : isHighlighted
    ? theme.border
    : isOutlined
      ? theme.border
      : isElevated
        ? theme.border
        : 'transparent';

  const borderWidth = settings.highContrast ? 1.5 : isHighlighted ? 1.5 : isOutlined || isElevated ? 1 : 0;

  const cardStyle = [
    styles.card,
    {
      backgroundColor,
      borderColor,
      borderWidth,
      padding: paddingMap[padding],
    },
    isElevated && styles.elevated,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

export type CardHeaderProps = {
  children?: React.ReactNode;
  spacing?: 'none' | 'sm' | 'md';
};

export function CardHeader({ children, spacing = 'sm' }: CardHeaderProps) {
  const gap = spacing === 'none' ? 0 : spacing === 'sm' ? Spacing.one : Spacing.two;
  return <View style={[styles.header, { gap }]}>{children}</View>;
}

export type CardTitleProps = {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

export function CardTitle({ children, size = 'md' }: CardTitleProps) {
  const textType = size === 'lg' ? 'subtitle' : size === 'sm' ? 'default' : 'smallBold';
  return <ThemedText type={textType}>{children}</ThemedText>;
}

export type CardDescriptionProps = {
  children?: React.ReactNode;
};

export function CardDescription({ children }: CardDescriptionProps) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

export type CardContentProps = {
  children?: React.ReactNode;
};

export function CardContent({ children }: CardContentProps) {
  return <View style={styles.content}>{children}</View>;
}

export type CardFooterProps = {
  children?: React.ReactNode;
};

export function CardFooter({ children }: CardFooterProps) {
  return <View style={styles.footer}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  header: {
    width: '100%',
    marginBottom: Spacing.two,
  },
  content: {
    width: '100%',
  },
  footer: {
    width: '100%',
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});

import { Text, Pressable } from '@/components/accessible-primitives';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ActionButtonProps = {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
};

export function ActionButton({
  label,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onPress,
}: ActionButtonProps) {
  const theme = useTheme();

  const isInteractive = !disabled && !loading;

  // Variant color mapping
  const getBackgroundColor = (pressed: boolean) => {
    if (disabled) {
      return theme.backgroundSelected;
    }
    switch (variant) {
      case 'primary':
        return pressed ? theme.accent : theme.accent;
      case 'secondary':
        return pressed ? theme.backgroundSelected : theme.backgroundElement;
      case 'outline':
        return pressed ? theme.backgroundElement : 'transparent';
      case 'danger':
        return theme.dangerBackground;
      default:
        return theme.accent;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return theme.textSecondary;
    }
    switch (variant) {
      case 'primary':
        return theme.onAccent;
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'outline':
        return theme.text;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (disabled) {
      return 'transparent';
    }
    if (variant === 'outline') {
      return theme.backgroundSelected;
    }
    return 'transparent';
  };

  const textColor = getTextColor();

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        fullWidth ? styles.fullWidth : styles.selfStart,
        {
          backgroundColor: getBackgroundColor(pressed),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
        },
        pressed && isInteractive && styles.pressed,
      ]}>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator
            size="small"
            color={textColor}
            style={styles.spinner}
          />
          <Text
            style={[
              styles.label,
              styles[`label_${size}`],
              { color: textColor },
            ]}>
            {label}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            styles.label,
            styles[`label_${size}`],
            { color: textColor },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    width: '100%',
  },
  sm: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
  },
  md: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
  },
  lg: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.five,
  },
  label: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    textAlign: 'center',
  },
  label_sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  label_md: {
    fontSize: 15,
    lineHeight: 20,
  },
  label_lg: {
    fontSize: 17,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.85,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  spinner: {
    marginRight: 4,
  },
});

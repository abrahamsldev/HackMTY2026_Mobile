import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ProgressBarProps = {
  value: number;
  label?: string;
  showValue?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export function ProgressBar({
  value,
  label,
  showValue = false,
  tone = 'default',
  size = 'md',
}: ProgressBarProps) {
  const theme = useTheme();

  const clampedValue = Math.max(0, Math.min(100, value));

  const getToneColor = () => {
    switch (tone) {
      case 'success':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'danger':
        return '#EF4444';
      case 'default':
      default:
        return '#208AEF';
    }
  };

  const toneColor = getToneColor();

  const heightMap = {
    sm: 4,
    md: 8,
    lg: 12,
  };

  const barHeight = heightMap[size];

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clampedValue }}
      accessibilityLabel={`${label ?? 'Progreso'}: ${clampedValue}%`}
      style={styles.container}>
      {(label || showValue) && (
        <View style={styles.headerRow}>
          {label ? (
            <Text style={[styles.label, { color: theme.text }]}>
              {label}
            </Text>
          ) : <View />}
          {showValue && (
            <Text style={[styles.valueText, { color: theme.textSecondary }]}>
              {`${Math.round(clampedValue)}%`}
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          {
            height: barHeight,
            backgroundColor: theme.backgroundSelected,
            borderRadius: barHeight / 2,
          },
        ]}>
        <View
          style={[
            styles.fill,
            {
              width: `${clampedValue}%`,
              backgroundColor: toneColor,
              borderRadius: barHeight / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '500',
  },
  valueText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

import { Text } from '@/components/accessible-primitives';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Fonts, Spacing } from '@/constants/theme';
import { creditUtilization, type UtilizationLevel } from '@/features/financial-ui/model';
import { useTheme } from '@/hooks/use-theme';

export type CreditUtilizationGaugeProps = {
  used: number;
  limit: number;
  available?: number;
  currency?: 'MXN' | 'USD';
  label?: string;
};

const levelLabels: Record<UtilizationLevel, string> = {
  healthy: 'Uso bajo',
  moderate: 'Uso moderado',
  high: 'Uso alto',
  critical: 'Al límite',
};

/** Point on a half circle that opens upward: 0° is the left end, 180° the right end. */
function point(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: cx - radius * Math.cos(radians), y: cy - radius * Math.sin(radians) };
}

function arc(cx: number, cy: number, radius: number, degrees: number) {
  const start = point(cx, cy, radius, 0);
  const end = point(cx, cy, radius, degrees);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

export function CreditUtilizationGauge({
  used,
  limit,
  available,
  currency = 'MXN',
  label = 'Uso de tu línea de crédito',
}: CreditUtilizationGaugeProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(280);
  const { percentage, level } = creditUtilization(used, limit);
  const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value);
  const rounded = Math.round(percentage);
  const toneColor = level === 'healthy'
    ? theme.success
    : level === 'moderate'
      ? theme.accent
      : level === 'high'
        ? theme.warning
        : theme.danger;

  const stroke = 16;
  const radius = Math.max(40, width / 2 - stroke);
  const centerX = width / 2;
  const centerY = radius + stroke / 2;
  const height = centerY + stroke / 2;
  const remaining = available ?? Math.max(0, limit - used);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: rounded }}
      accessibilityLabel={`${label}: usaste ${money(used)} de ${money(limit)}, ${rounded} por ciento. ${levelLabels[level]}. Disponible ${money(remaining)}.`}
      style={styles.container}
      onLayout={(event: LayoutChangeEvent) => setWidth(Math.max(200, event.nativeEvent.layout.width))}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.gaugeArea}>
        <Svg width={width} height={height}>
          <Path d={arc(centerX, centerY, radius, 180)} stroke={theme.backgroundSelected} strokeWidth={stroke} strokeLinecap="round" fill="none" />
          {percentage > 0 && (
            <Path
              d={arc(centerX, centerY, radius, Math.max(1, (percentage / 100) * 180))}
              stroke={toneColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </Svg>
        <View style={styles.readout} pointerEvents="none">
          <Text style={[styles.percentage, { color: theme.text }]}>{`${rounded}%`}</Text>
          <Text style={[styles.level, { color: toneColor }]}>{levelLabels[level]}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {[
          { key: 'used', caption: 'Usado', value: money(used) },
          { key: 'available', caption: 'Disponible', value: money(remaining) },
          { key: 'limit', caption: 'Límite', value: money(limit) },
        ].map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <Text style={[styles.legendCaption, { color: theme.textSecondary }]}>{item.caption}</Text>
            <Text style={[styles.legendValue, { color: theme.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '500',
  },
  gaugeArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  readout: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  percentage: {
    fontFamily: Fonts.sans,
    fontSize: 30,
    fontWeight: '700',
  },
  level: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  legendItem: {
    flexGrow: 1,
    flexBasis: 96,
    gap: Spacing.xxs,
  },
  legendCaption: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  legendValue: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '600',
  },
});

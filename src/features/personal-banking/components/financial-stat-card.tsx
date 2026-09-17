import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { TextBlock } from '@/components/ui/text-block';
import { Spacing } from '@/constants/theme';

export type FinancialStatCardProps = {
  label: string;
  value: number;
  format?: 'currency' | 'percentage' | 'number';
  currency?: 'MXN' | 'USD';
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  comparison?: {
    value: number;
    label: string;
  };
  onPress?: () => void;
};

export function FinancialStatCard({
  label,
  value,
  format = 'currency',
  currency = 'MXN',
  tone = 'default',
  comparison,
  onPress,
}: FinancialStatCardProps) {
  let formattedValue: string;

  if (format === 'currency') {
    formattedValue = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (format === 'percentage') {
    const percentageValue = Math.abs(value) <= 1 && value !== 0 ? value * 100 : value;
    const formatted = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(percentageValue);
    formattedValue = `${percentageValue > 0 ? '+' : ''}${formatted}%`;
  } else {
    formattedValue = new Intl.NumberFormat('es-MX', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  const valueColor =
    tone === 'positive'
      ? 'success'
      : tone === 'negative'
        ? 'danger'
        : 'default';

  let comparisonText: string | null = null;
  let comparisonColor: 'success' | 'danger' | 'muted' = 'muted';

  if (comparison) {
    const sign = comparison.value > 0 ? '+' : '';
    const formattedCompValue = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(comparison.value);

    comparisonText = `${sign}${formattedCompValue}% ${comparison.label}`;
    comparisonColor =
      comparison.value > 0
        ? 'success'
        : comparison.value < 0
          ? 'danger'
          : 'muted';
  }

  const accessibilityLabel = `${label}: ${formattedValue}.${comparisonText ? ` Comparativa: ${comparisonText}` : ''}`;

  return (
    <Card
      padding="md"
      onPress={onPress}>
      <View
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        style={styles.container}>
        {/* Label */}
        <TextBlock
          value={label}
          variant="caption"
          color="muted"
        />

        {/* Formatted Value */}
        <TextBlock
          value={formattedValue}
          variant="amount"
          color={valueColor}
        />

        {/* Comparison Section (only if provided) */}
        {comparisonText && (
          <View style={styles.comparisonRow}>
            <TextBlock
              value={comparisonText}
              variant="caption"
              color={comparisonColor}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  comparisonRow: {
    marginTop: Spacing.xxs,
  },
});

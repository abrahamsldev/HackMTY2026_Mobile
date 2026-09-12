import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SpendingCategory = {
  category:
    | 'food'
    | 'transport'
    | 'entertainment'
    | 'utilities'
    | 'health'
    | 'shopping'
    | 'transfer'
    | 'other';
  amount: number;
};

export type SpendingCategoryChartProps = {
  title?: string;
  subtitle?: string;
  categories: SpendingCategory[];
  currency?: 'MXN' | 'USD';
  showPercentages?: boolean;
  maxCategories?: number;
  onCategoryPress?: (payload: {
    category: SpendingCategory['category'];
  }) => void;
};

const categoryLabels: Record<SpendingCategory['category'], string> = {
  food: 'Alimentos y Restaurantes',
  transport: 'Transporte y Movilidad',
  entertainment: 'Entretenimiento',
  utilities: 'Servicios del Hogar',
  health: 'Salud y Farmacia',
  shopping: 'Compras y Tiendas',
  transfer: 'Transferencias',
  other: 'Otros Gastos',
};

const categoryColors: Record<SpendingCategory['category'], string> = {
  food: '#F59E0B',
  transport: '#3B82F6',
  entertainment: '#8B5CF6',
  utilities: '#10B981',
  health: '#EF4444',
  shopping: '#EC4899',
  transfer: '#6366F1',
  other: '#64748B',
};

export function SpendingCategoryChart({
  title,
  subtitle,
  categories,
  currency = 'MXN',
  showPercentages = true,
  maxCategories = 6,
  onCategoryPress,
}: SpendingCategoryChartProps) {
  const theme = useTheme();

  // Calcular el gasto total acumulado
  const totalAmount = categories.reduce(
    (acc, item) => acc + Math.max(0, item.amount),
    0,
  );

  // Ordenar de mayor a menor sin mutar el arreglo de entrada
  const sortedCategories = [...categories]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, maxCategories);

  const isEmpty = totalAmount === 0 || sortedCategories.length === 0;

  const numberFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Card variant="outlined" padding="md">
      <View style={styles.container}>
        {/* Header: Title and Subtitle */}
        {(title || subtitle) && (
          <View style={styles.header}>
            {title ? (
              <ThemedText type="smallBold" style={styles.titleText}>
                {title}
              </ThemedText>
            ) : null}
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        )}

        {/* Content: Bars or Empty State */}
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <ThemedText type="small" themeColor="textSecondary">
              No hay gastos registrados para este periodo.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.chartBody}>
            {sortedCategories.map((item) => {
              const categoryKey = item.category;
              const label = categoryLabels[categoryKey] ?? categoryKey;
              const barColor = categoryColors[categoryKey] ?? '#64748B';
              const percentage =
                totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
              const formattedPercentage = `${percentage.toFixed(1)}%`;
              const formattedAmount = numberFormatter.format(item.amount);

              const accessibilityLabel = `${label}: ${formattedAmount}${
                showPercentages ? ` (${formattedPercentage} del total)` : ''
              }.${onCategoryPress ? ' Toca para ver movimientos de esta categoría.' : ''}`;

              const rowContent = (
                <View style={styles.rowInner}>
                  {/* Top info row: Label, Dot, Amount, Percentage */}
                  <View style={styles.rowHeader}>
                    <View style={styles.labelContainer}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: barColor },
                        ]}
                      />
                      <ThemedText
                        type="small"
                        numberOfLines={1}
                        style={styles.categoryName}>
                        {label}
                      </ThemedText>
                    </View>
                    <View style={styles.amountContainer}>
                      <ThemedText type="smallBold">
                        {formattedAmount}
                      </ThemedText>
                      {showPercentages && (
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={styles.percentageText}>
                          {formattedPercentage}
                        </ThemedText>
                      )}
                    </View>
                  </View>

                  {/* Horizontal Bar */}
                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(2, Math.min(100, percentage))}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );

              if (onCategoryPress) {
                return (
                  <Pressable
                    key={categoryKey}
                    onPress={() => onCategoryPress({ category: item.category })}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint="Filtra los movimientos por esta categoría"
                    style={({ pressed }) => [
                      styles.rowPressable,
                      pressed && styles.rowPressed,
                    ]}>
                    {rowContent}
                  </Pressable>
                );
              }

              return (
                <View
                  key={categoryKey}
                  accessible
                  accessibilityLabel={accessibilityLabel}
                  style={styles.rowPressable}>
                  {rowContent}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.half,
  },
  titleText: {
    fontSize: 18,
    lineHeight: 24,
  },
  emptyContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartBody: {
    width: '100%',
    gap: Spacing.three,
  },
  rowPressable: {
    width: '100%',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.half,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowInner: {
    width: '100%',
    gap: Spacing.one,
  },
  rowHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
    paddingRight: Spacing.two,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    flexShrink: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  percentageText: {
    minWidth: 42,
    textAlign: 'right',
  },
  barTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});

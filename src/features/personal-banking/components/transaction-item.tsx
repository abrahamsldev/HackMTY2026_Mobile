import { Pressable } from '@/components/accessible-primitives';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TransactionItemProps = {
  transactionId: string;
  title: string;
  description?: string;
  amount: number;
  currency?: 'MXN' | 'USD';
  occurredAt: string;
  timeZone?: string;
  category:
    | 'food'
    | 'transport'
    | 'entertainment'
    | 'utilities'
    | 'health'
    | 'shopping'
    | 'income'
    | 'transfer'
    | 'other';
  status?: 'pending' | 'completed' | 'declined';
  onPress?: () => void;
};

const categoryLabels: Record<TransactionItemProps['category'], string> = {
  food: 'Alimentos y Restaurantes',
  transport: 'Transporte y Gasolina',
  entertainment: 'Entretenimiento',
  utilities: 'Servicios',
  health: 'Salud y Farmacia',
  shopping: 'Compras y Supermercado',
  income: 'Ingreso o Abono',
  transfer: 'Transferencia',
  other: 'Varios',
};

function formatOccurredDate(dateString: string, timeZone?: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function TransactionItem({
  transactionId,
  title,
  description,
  amount,
  currency = 'MXN',
  occurredAt,
  timeZone,
  category,
  status = 'completed',
  onPress,
}: TransactionItemProps) {
  const theme = useTheme();

  // Formateo con Intl.NumberFormat regional es-MX
  const formattedRaw = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  // El signo se determina estricta y únicamente a partir del valor numérico de amount
  const displayAmount =
    amount > 0 ? `+${formattedRaw}` : `-${formattedRaw}`;

  const amountColor =
    status === 'declined'
      ? theme.textSecondary
      : amount > 0
        ? theme.success
        : theme.text;

  const formattedDate = formatOccurredDate(occurredAt, timeZone);
  const categoryLabel = categoryLabels[category] ?? category;

  const accessibilityLabel = `Movimiento: ${title}. Categoría: ${categoryLabel}. Monto: ${displayAmount} ${currency}. Fecha: ${formattedDate}.${
    status !== 'completed' ? ` Estado: ${status}.` : ''
  }`;

  const content = (
    <View style={styles.container}>
      {/* Icon/Category indicator and details */}
      <View style={styles.mainInfo}>
        <ThemedText
          type="smallBold"
          style={status === 'declined' ? styles.declinedText : undefined}
          numberOfLines={1}>
          {title}
        </ThemedText>
        <View style={styles.subInfo}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {description ? `${description} • ${formattedDate}` : `${categoryLabel} • ${formattedDate}`}
          </ThemedText>
        </View>
      </View>

      {/* Amount and Status Badge */}
      <View style={styles.amountContainer}>
        <ThemedText
          type="smallBold"
          style={[
            styles.amountText,
            { color: amountColor },
            status === 'declined' && styles.declinedText,
          ]}>
          {displayAmount}
        </ThemedText>
        {status === 'pending' && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="small" themeColor="textSecondary">
              Pendiente
            </ThemedText>
          </View>
        )}
        {status === 'declined' && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.backgroundSelected },
            ]}>
            <ThemedText type="small" style={[styles.declinedBadgeText, { color: theme.danger }]}>
              Rechazado
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Toca para ver el detalle de este movimiento"
        style={({ pressed }) => [
          styles.itemWrapper,
          pressed && styles.pressed,
        ]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.itemWrapper}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  itemWrapper: {
    width: '100%',
    paddingVertical: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainInfo: {
    flexGrow: 1,
    flexBasis: 180,
    maxWidth: '100%',
    gap: Spacing.xxs,
  },
  subInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountContainer: {
    maxWidth: '100%',
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  amountText: {
    fontSize: 15,
  },
  declinedText: {
    textDecorationLine: 'line-through',
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Spacing.xs,
  },
  declinedBadgeText: {
    color: '#EF4444',
  },
});

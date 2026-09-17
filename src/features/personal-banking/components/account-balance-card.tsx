import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { TextBlock } from '@/components/ui/text-block';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AccountBalanceCardProps = {
  accountId: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit';
  accountLastFour: string;
  availableBalance: number;
  currency?: 'MXN' | 'USD';
  status?: 'active' | 'blocked' | 'inactive';
  variant?: 'default' | 'highlighted';
  onPress?: () => void;
};

const accountTypeLabels: Record<AccountBalanceCardProps['accountType'], string> = {
  checking: 'Cuenta de Débito / Cheques',
  savings: 'Cuenta de Ahorro',
  credit: 'Línea de Crédito',
};

const statusLabels: Record<NonNullable<AccountBalanceCardProps['status']>, { label: string; color: 'muted' | 'danger' | 'default' }> = {
  active: { label: 'Activa', color: 'muted' },
  blocked: { label: 'Bloqueada', color: 'danger' },
  inactive: { label: 'Inactiva', color: 'muted' },
};

export function AccountBalanceCard({
  accountId,
  accountName,
  accountType,
  accountLastFour,
  availableBalance,
  currency = 'MXN',
  status = 'active',
  variant = 'default',
  onPress,
}: AccountBalanceCardProps) {
  const theme = useTheme();

  const formattedBalance = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(availableBalance);

  const typeLabel = accountTypeLabels[accountType] ?? accountType;
  const maskedAccount = `•••• ${accountLastFour}`;
  const statusInfo = statusLabels[status];

  const accessibilityLabel = `${accountName}, ${typeLabel}, terminación ${accountLastFour}. Saldo disponible: ${formattedBalance} ${currency}. Estado: ${statusInfo.label}.`;

  return (
    <Card
      variant={variant}
      padding="md"
      onPress={onPress}>
      <View
        accessible
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={onPress ? 'Toca para ver el detalle y movimientos de la cuenta' : undefined}
        style={styles.container}>
        {/* Header: Name and Status */}
        <View style={styles.headerRow}>
          <View style={styles.nameContainer}>
            <TextBlock
              value={accountName}
              variant="caption"
              color="muted"
            />
            <TextBlock
              value={`${typeLabel} ${maskedAccount}`}
              variant="caption"
              color="muted"
            />
          </View>

          {status !== 'active' && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: theme.backgroundSelected },
              ]}>
              <TextBlock
                value={statusInfo.label}
                variant="caption"
                color={statusInfo.color}
              />
            </View>
          )}
        </View>

        {/* Balance Section */}
        <View style={styles.balanceContainer}>
          <TextBlock
            value="Saldo Disponible"
            variant="caption"
            color="muted"
          />
          <TextBlock
            value={`${formattedBalance} ${currency}`}
            variant="amount"
            color="default"
          />
        </View>

        {/* Footer info if interactive */}
        {onPress && (
          <View style={styles.footerRow}>
            <TextBlock
              value="Toca para ver detalles →"
              variant="caption"
              color="muted"
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
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    gap: Spacing.xxs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Spacing.sm,
    alignSelf: 'flex-start',
  },
  balanceContainer: {
    marginTop: Spacing.xs,
    gap: Spacing.xxs,
  },
  footerRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});

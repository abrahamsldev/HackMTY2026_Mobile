import { Pressable, Text } from '@/components/accessible-primitives';
import { StyleSheet, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PaymentCardProps = {
  cardName: string;
  cardType: 'debit' | 'credit';
  network: 'visa' | 'mastercard' | 'amex' | 'other';
  /** Only the masked tail is ever accepted: no PAN, CVV or expiry day. */
  lastFour: string;
  status?: 'active' | 'blocked' | 'inactive';
  /** `YYYY-MM`, the month printed on the plastic. */
  expires?: string;
  holder?: string;
  caption?: string;
  amount?: number;
  currency?: 'MXN' | 'USD';
  onPress?: () => void;
};

const networkLabels: Record<PaymentCardProps['network'], string> = {
  visa: 'VISA',
  mastercard: 'Mastercard',
  amex: 'American Express',
  other: 'Tarjeta bancaria',
};

const typeLabels: Record<PaymentCardProps['cardType'], string> = {
  debit: 'Débito',
  credit: 'Crédito',
};

const statusLabels: Record<NonNullable<PaymentCardProps['status']>, string> = {
  active: 'Activa',
  blocked: 'Bloqueada',
  inactive: 'Inactiva',
};

const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function expiryParts(expires: string | undefined) {
  if (!expires) return undefined;
  const [year, month] = expires.split('-');
  return { short: `${month}/${year.slice(2)}`, spoken: `${months[Number(month) - 1]} de ${year}` };
}

export function PaymentCard({
  cardName,
  cardType,
  network,
  lastFour,
  status = 'active',
  expires,
  holder,
  caption,
  amount,
  currency = 'MXN',
  onPress,
}: PaymentCardProps) {
  const theme = useTheme();
  const credit = cardType === 'credit';
  // Credit plastic carries the accent fill; debit stays on the neutral surface so
  // two cards in the same wallet never read as the same product.
  const background = credit ? theme.accent : theme.backgroundElement;
  const foreground = credit ? theme.onAccent : theme.text;
  const expiry = expiryParts(expires);
  const formattedAmount = amount === undefined
    ? undefined
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
  // American Express prints 4-6-5 digits; every other network prints four groups of four.
  const maskedNumber = network === 'amex'
    ? `•••• •••••• •${lastFour}`
    : `•••• •••• •••• ${lastFour}`;

  const accessibilityLabel = [
    `${cardName}, ${typeLabels[cardType]} ${networkLabels[network]}, terminación ${lastFour}`,
    expiry && `vence en ${expiry.spoken}`,
    holder,
    `estado: ${statusLabels[status]}`,
    caption && formattedAmount && `${caption}: ${formattedAmount}`,
  ].filter(Boolean).join('. ');

  const face = (
    <View
      accessible
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? 'Toca para ver el detalle de la tarjeta' : undefined}
      style={[styles.face, { backgroundColor: background, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.network, { color: foreground }]}>{networkLabels[network]}</Text>
        <Text style={[styles.type, { color: foreground }]}>{typeLabels[cardType].toUpperCase()}</Text>
      </View>
      <View style={[styles.chip, { backgroundColor: foreground }]} />
      <Text style={[styles.number, { color: foreground }]}>{maskedNumber}</Text>
      <View style={styles.footerRow}>
        <View style={styles.footerBlock}>
          <Text style={[styles.footerLabel, { color: foreground }]}>{holder ? 'Titular' : 'Tarjeta'}</Text>
          <Text style={[styles.footerValue, { color: foreground }]}>{holder ?? cardName}</Text>
        </View>
        {expiry && (
          <View style={styles.footerBlock}>
            <Text style={[styles.footerLabel, { color: foreground }]}>Vence</Text>
            <Text style={[styles.footerValue, { color: foreground }]}>{expiry.short}</Text>
          </View>
        )}
      </View>
      {status !== 'active' && (
        <View style={[styles.statusPill, { backgroundColor: theme.background, borderColor: theme.danger }]}>
          <Text style={[styles.statusText, { color: theme.danger }]}>{statusLabels[status]}</Text>
        </View>
      )}
      {caption && formattedAmount && (
        <View style={[styles.amountBlock, { borderTopColor: foreground }]}>
          <Text style={[styles.footerLabel, { color: foreground }]}>{caption}</Text>
          <Text style={[styles.amount, { color: foreground }]}>{formattedAmount}</Text>
        </View>
      )}
    </View>
  );

  if (!onPress) return face;
  return <Pressable onPress={onPress} style={styles.pressable}>{face}</Pressable>;
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  face: {
    width: '100%',
    minWidth: 240,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  network: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  type: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  chip: {
    width: 40,
    height: 28,
    borderRadius: 6,
    opacity: 0.45,
  },
  number: {
    fontFamily: Fonts.mono,
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: 2,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  footerBlock: {
    gap: Spacing.xxs,
    flexShrink: 1,
  },
  footerLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    opacity: 0.8,
  },
  footerValue: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: Spacing.lg,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  statusText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  amountBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    gap: Spacing.xxs,
  },
  amount: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '700',
  },
});

import { Text } from '@/components/accessible-primitives';
import { StyleSheet, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { trendDelta } from '@/features/financial-ui/model';
import { useTheme } from '@/hooks/use-theme';

export type TrendIndicatorProps = {
  current: number;
  previous: number;
  currency?: 'MXN' | 'USD';
  label?: string;
  /** Spending and debt grow the wrong way: an increase reads as a warning, not a win. */
  inverse?: boolean;
};

const arrows = { up: '▲', down: '▼', flat: '■' } as const;
const spoken = { up: 'Aumento', down: 'Reducción', flat: 'Sin cambio' } as const;

export function TrendIndicator({
  current,
  previous,
  currency = 'MXN',
  label = 'frente al periodo anterior',
  inverse = false,
}: TrendIndicatorProps) {
  const theme = useTheme();
  const { amount, percentage, direction } = trendDelta(current, previous);
  const favourable = direction === 'flat' ? null : inverse ? direction === 'down' : direction === 'up';
  const tone = favourable === null ? theme.textSecondary : favourable ? theme.success : theme.danger;
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Math.abs(amount));
  const share = percentage === null
    ? null
    : `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(Math.abs(percentage))}%`;
  const summary = direction === 'flat' ? `Sin cambio ${label}` : `${spoken[direction]} de ${money}${share ? ` (${share})` : ''} ${label}`;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={summary}
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.arrow, { color: tone }]}>{arrows[direction]}</Text>
      <Text style={[styles.value, { color: tone }]}>{share ? `${share} · ${money}` : money}</Text>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  arrow: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
  },
  value: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
});

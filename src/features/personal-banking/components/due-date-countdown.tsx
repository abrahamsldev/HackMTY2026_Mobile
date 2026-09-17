import { Text } from '@/components/accessible-primitives';
import { StyleSheet, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { daysUntil } from '@/features/financial-ui/model';
import { useTheme } from '@/hooks/use-theme';

export type DueDateCountdownProps = {
  dueDate: string;
  cutoffDate?: string;
  label?: string;
  /** Injectable clock so the countdown is deterministic in previews and tests. */
  now?: Date;
};

const longDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`));

function countdownText(days: number) {
  if (days < -1) return `Venció hace ${-days} días`;
  if (days === -1) return 'Venció ayer';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Faltan ${days} días`;
}

export function DueDateCountdown({ dueDate, cutoffDate, label = 'Fecha límite de pago', now }: DueDateCountdownProps) {
  const theme = useTheme();
  const days = daysUntil(dueDate, now ?? new Date());
  const tone = days < 0 ? theme.danger : days <= 7 ? theme.warning : theme.info;
  const headline = countdownText(days);
  const detail = `${longDate(dueDate)}${cutoffDate ? ` · corte el ${longDate(cutoffDate)}` : ''}`;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}. ${headline}. ${detail}.`}
      style={[styles.container, { backgroundColor: theme.backgroundElement, borderLeftColor: tone }]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.headline, { color: tone }]}>{headline}</Text>
      <Text style={[styles.detail, { color: theme.text }]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '500',
  },
  headline: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '700',
  },
  detail: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '500',
  },
});

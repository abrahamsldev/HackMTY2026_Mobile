import { Text } from '@/components/accessible-primitives';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';
import {
  progressRingPropsSchema,
  ringGeometry,
  ringProgress,
  ringTone,
  type ProgressRingData,
  type ProgressRingInput,
} from './progress-ring-model';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const diameters = { sm: 72, md: 104, lg: 144 } as const;
const strokes = { sm: 8, md: 10, lg: 12 } as const;
/** Hero figure sizes — proportional figures, not tabular: a standalone number. */
const figureSizes = { sm: 18, md: 26, lg: 40 } as const;

export type ProgressRingProps = ProgressRingInput;

/**
 * A meter: one ratio against a limit, drawn as a ring with the figure inside.
 *
 * The same standard as `AreaChart`: props validated before anything renders,
 * severity carried by the fill and *also* by words, the unfilled track a lighter
 * step of the surface so state reads even when the fill is faint, thicker stroke
 * under high contrast, and a reveal that collapses to zero with reduced motion.
 * A single ratio needs no data table — its text is already right there.
 */
export function ProgressRing(props: ProgressRingProps) {
  const parsed = progressRingPropsSchema.safeParse(props);
  const theme = useTheme();
  if (!parsed.success) {
    return <Text accessibilityRole="alert" style={{ color: theme.text }}>No se puede mostrar el indicador: datos inválidos.</Text>;
  }
  return <ProgressRingContent {...parsed.data} />;
}

function ProgressRingContent(data: ProgressRingData) {
  const { value, max, label, currency, size, caption } = data;
  const theme = useTheme();
  const { settings } = useAccessibility();
  const motion = useMotion();

  const { percentage, fraction, remaining } = ringProgress(value, max);
  const tone = ringTone(data);
  const fill = tone === 'success' ? theme.success : tone === 'warning' ? theme.warning : tone === 'danger' ? theme.danger : theme.accent;

  const diameter = diameters[size];
  const stroke = strokes[size] + (settings.highContrast ? 2 : 0);
  const { radius, circumference, center } = ringGeometry(diameter, stroke);

  // Reveal sweeps the arc from empty to its value. Zero duration under reduced
  // motion lands the final state on the first frame.
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: motion.duration.entrance, easing: Easing.out(Easing.cubic) });
  }, [reveal, fraction, motion.duration.entrance]);
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fraction * reveal.value),
  }));

  const rounded = Math.round(percentage);
  const money = (amount: number) => new Intl.NumberFormat('es-MX', currency ? { style: 'currency', currency } : { maximumFractionDigits: 2 }).format(amount);
  const state = data.intent === 'goal'
    ? (tone === 'success' ? 'Meta alcanzada' : 'En progreso')
    : tone === 'danger' ? 'Límite superado' : tone === 'warning' ? 'Cerca del límite' : 'Dentro del límite';
  const remainingText = data.intent === 'goal'
    ? `Faltan ${money(Math.max(0, remaining))}`
    : remaining < 0 ? `Excedido por ${money(-remaining)}` : `Disponible ${money(remaining)}`;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.min(100, rounded), text: `${rounded} por ciento` }}
      accessibilityLabel={`${label}: ${money(value)} de ${money(max)}, ${rounded} por ciento. ${state}. ${remainingText}.`}
      style={styles.container}>
      <View style={{ width: diameter, height: diameter }}>
        <Svg width={diameter} height={diameter}>
          {/* Track: a lighter step of the same surface, so the ring shape reads at 0 %. */}
          <Circle cx={center} cy={center} r={radius} stroke={theme.backgroundSelected} strokeWidth={stroke} fill="none" />
          {fraction > 0 && (
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={fill}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={arcProps}
              // Start at twelve o'clock; SVG circles start at three.
              transform={`rotate(-90 ${center} ${center})`}
            />
          )}
        </Svg>
        <View style={styles.figure} pointerEvents="none">
          <Text style={[styles.figureText, { color: theme.text, fontSize: figureSizes[size], lineHeight: figureSizes[size] * 1.15 }]}>
            {rounded}
            <Text style={[styles.percentSign, { color: theme.textSecondary, fontSize: figureSizes[size] * 0.5 }]}>%</Text>
          </Text>
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {caption ? <Text style={[styles.caption, { color: theme.textSecondary }]}>{caption}</Text> : null}
        {/* Severity as words beside the ring. The ring carries the color; text
            wears ink, so the state stays legible on every palette. */}
        <Text style={[styles.caption, { color: theme.textSecondary, fontWeight: '600' }]}>{state}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: Spacing.sm },
  figure: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  figureText: { fontWeight: '700', textAlign: 'center' },
  percentSign: { fontWeight: '500' },
  legend: { alignItems: 'center', gap: Spacing.xxs },
  label: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  caption: { fontSize: 12, textAlign: 'center' },
});

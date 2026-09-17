import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

const PULSE_DURATION_MS = 900;

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/**
 * One placeholder block.
 *
 * The pulse runs between two palette surfaces rather than fading opacity, so it
 * stays visible on every palette and never dips below the contrast the block
 * needs to read as "content is coming" instead of "this area is empty". With
 * reduced motion it simply holds the base fill.
 */
export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const pulse = useSharedValue(0);
  const still = settings.reduceMotion;

  useEffect(() => {
    if (still) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: PULSE_DURATION_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, still]);

  const animated = useAnimatedStyle(() => ({
    backgroundColor: still
      ? theme.skeleton
      : interpolateColor(pulse.value, [0, 1], [theme.skeleton, theme.skeletonHighlight]),
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius },
        // High contrast wants an edge: a tonal fill alone is not enough
        // separation from the page when contrast is boosted.
        settings.highContrast && { borderWidth: 1, borderColor: theme.border },
        animated,
        style,
      ]}
    />
  );
}

/**
 * The shape of a generated financial surface, shown while one is being built.
 *
 * Deliberately generic: the backend reports *that* it is assembling UI, never
 * which of the thirteen views it picked, so this stands in for the common
 * anatomy they share — a heading, a pair of figures, a plot and a few rows —
 * rather than pretending to know the answer before it arrives.
 *
 * It is hidden from screen readers on purpose. The agent status line beside it
 * is already a live region announcing the same progress, and two
 * announcements for one wait is worse than none.
 */
export function SurfaceSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Skeleton width="55%" height={20} />
      <View style={styles.stats}>
        <Skeleton width="48%" height={56} radius={Radius.md} />
        <Skeleton width="48%" height={56} radius={Radius.md} />
      </View>
      <Skeleton height={112} radius={Radius.md} />
      <View style={styles.rows}>
        <Skeleton width="92%" height={14} />
        <Skeleton width="78%" height={14} />
        <Skeleton width="85%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  rows: { gap: Spacing.sm },
});

import { Motion } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';

const stillDurations = { fast: 0, base: 0, slow: 0, entrance: 0 } as const;

export type MotionTokens = {
  /** `false` when the user or the OS asked for reduced motion. */
  enabled: boolean;
  /** Milliseconds. Every value is `0` while `enabled` is `false`. */
  duration: typeof Motion.duration | typeof stillDurations;
  /** Cubic-bezier control points, unchanged by the reduced-motion setting. */
  curve: typeof Motion.curve;
};

/**
 * The single place a component asks "how long, and along which curve".
 *
 * `settings.reduceMotion` already folds in the OS setting (see
 * `resolveAccessibility`), so a component that reads its timing from here never
 * needs its own reduced-motion branch — a zero duration lands the end state on
 * the next frame.
 */
export function useMotion(): MotionTokens {
  const { settings } = useAccessibility();
  const enabled = !settings.reduceMotion;
  return {
    enabled,
    duration: enabled ? Motion.duration : stillDurations,
    curve: Motion.curve,
  };
}

import { z } from 'zod';

const money = z.number().finite().min(0).max(1e12);

/**
 * A single ratio against a limit — a budget against its cap, savings against a
 * target, a card against its line. This is a *meter*, so it is deliberately not
 * a chart of parts: one value, one maximum, and a severity derived from how
 * close the two are.
 */
export const progressRingPropsSchema = z.object({
  /** What has been used, spent or saved so far. */
  value: money,
  /** The limit or target. Must be positive: a ring against zero has no meaning. */
  max: money.positive(),
  /** What the ring measures — read by screen readers before the figures. */
  label: z.string().trim().min(1).max(80),
  currency: z.enum(['MXN', 'USD']).optional(),
  /**
   * How to read `value` against `max`:
   * - `spend`: reaching the limit is bad — accent, then warning past
   *   `warnAt`, then danger past the limit. Budgets, credit lines.
   * - `goal`: reaching the target is good — accent while working toward it,
   *   success once reached. Savings goals.
   */
  intent: z.enum(['spend', 'goal']).default('spend'),
  /** Fraction of `max` at which a `spend` ring turns to warning. */
  warnAt: z.number().min(0).max(1).default(0.8),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  /** A short line under the figure, e.g. the period or the remaining amount. */
  caption: z.string().trim().max(60).optional(),
}).strict();

export type ProgressRingData = z.infer<typeof progressRingPropsSchema>;
export type ProgressRingInput = z.input<typeof progressRingPropsSchema>;

export type RingTone = 'default' | 'success' | 'warning' | 'danger';

export function ringProgress(value: number, max: number) {
  const ratio = max > 0 ? value / max : 0;
  return {
    /** Unclamped, so an over-budget ring can still say 112 %. */
    percentage: ratio * 100,
    /** What the arc actually draws: a ring never wraps past a full turn. */
    fraction: Math.max(0, Math.min(1, ratio)),
    remaining: max - value,
  };
}

/**
 * Severity from the ratio. Status colors are reserved for state, so the ring
 * never uses them for anything else, and it always ships the state as words too
 * (the percentage and the accessibility label), never as color alone.
 */
export function ringTone(data: Pick<ProgressRingData, 'value' | 'max' | 'intent' | 'warnAt'>): RingTone {
  const ratio = data.value / data.max;
  if (data.intent === 'goal') return ratio >= 1 ? 'success' : 'default';
  if (ratio > 1) return 'danger';
  if (ratio >= data.warnAt) return 'warning';
  return 'default';
}

/** Geometry for a ring drawn with `strokeDasharray` on a circle. */
export function ringGeometry(diameter: number, stroke: number) {
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return { radius, circumference, center: diameter / 2 };
}

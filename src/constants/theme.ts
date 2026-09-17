/**
 * Design tokens for the app.
 *
 * `Colors` holds the raw per-scheme base. It is never read directly by
 * components: `accessibleColors()` in `features/accessibility/theme.ts` derives
 * the real role palette from it, per color palette and per contrast setting, and
 * `useTheme()` is the only supported way in. Everything else here — spacing,
 * radius, elevation, typography, motion — is scheme-independent and safe to read
 * straight from a StyleSheet.
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#171719',
    backgroundElement: '#242428',
    backgroundSelected: '#323238',
    textSecondary: '#B9BAC2',
  },
} as const;

type AccessiblePalette = ReturnType<
  typeof import('@/features/accessibility/theme').accessibleColors
>;

/** Every role in the resolved palette that is a single color (so, not `chartColors`). */
export type ThemeColor = {
  [K in keyof AccessiblePalette]: AccessiblePalette[K] extends string ? K : never;
}[keyof AccessiblePalette];

/**
 * Spline Sans — the display face `global.css` has always named first, now loaded
 * on native too (see `useAppFonts`).
 *
 * Runtime-loaded fonts get one family per weight: React Native cannot synthesize
 * a bold from a single-weight file on Android, and the weight-aware
 * `expo-font` config plugin needs a native build, which would take the project
 * out of Expo Go. So weights are families here, and `accessible-primitives`
 * translates a style's `fontWeight` into the family that actually carries it —
 * which means components keep writing plain `fontWeight` and never name a family.
 */
export const FontFamily = {
  light: 'SplineSans_300Light',
  regular: 'SplineSans_400Regular',
  medium: 'SplineSans_500Medium',
  semibold: 'SplineSans_600SemiBold',
  bold: 'SplineSans_700Bold',
} as const;

const sansByWeight: Record<string, string> = {
  '100': FontFamily.light,
  '200': FontFamily.light,
  '300': FontFamily.light,
  '400': FontFamily.regular,
  normal: FontFamily.regular,
  '500': FontFamily.medium,
  '600': FontFamily.semibold,
  '700': FontFamily.bold,
  '800': FontFamily.bold,
  '900': FontFamily.bold,
  bold: FontFamily.bold,
};

const sansFamilies = new Set<string>(Object.values(FontFamily));

/** The Spline Sans family carrying `weight`. Unknown or absent weights get regular. */
export function fontFor(weight: TextStyle['fontWeight']): string {
  return sansByWeight[String(weight ?? '400')] ?? FontFamily.regular;
}

/**
 * Whether `family` is one of ours — so a component that deliberately asked for
 * something else (mono card numbers, `Fonts.mono`) keeps what it asked for.
 */
export function isSansFamily(family: string | undefined): boolean {
  return family === undefined || sansFamilies.has(family);
}

export const Fonts = {
  /** The app face. Weight still comes from `fontWeight`; the primitive resolves it. */
  sans: FontFamily.regular,
  serif: Platform.select({ ios: 'ui-serif', web: 'var(--font-serif)', default: 'serif' }),
  rounded: Platform.select({ ios: 'ui-rounded', web: 'var(--font-rounded)', default: 'normal' }),
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

/**
 * Spacing steps. The scale is `xxs` → `huge`; `xxl` and `xxxl` exist so layouts
 * that need to breathe between a section (32) and a page break (64) have a step
 * to land on instead of doubling.
 */
export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingStep = keyof typeof Spacing;

/** Corner radii. `pill` is the fully-rounded end cap used by chips and the composer. */
export const Radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type RadiusStep = keyof typeof Radius;

/**
 * Three elevation levels, resolved per platform. Shadows stay neutral black —
 * a component that wants a brand-tinted shadow (the voice orb) sets its own on
 * top of `theme.shadow`.
 */
export const Elevation: Record<'none' | 'low' | 'medium' | 'high', ViewStyle> = {
  none: {},
  low: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' },
    default: {},
  }),
  medium: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    web: { boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)' },
    default: {},
  }),
  high: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
    },
    android: { elevation: 12 },
    web: { boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)' },
    default: {},
  }),
};

/**
 * The type ramp. `ThemedText` is the only consumer — components pick a `type`
 * rather than setting sizes, so a typeface or scale change lands everywhere at
 * once.
 */
export const Typography: Record<
  'title' | 'subtitle' | 'default' | 'small' | 'smallBold' | 'link' | 'code',
  TextStyle
> = {
  title: { fontSize: 48, lineHeight: 52, fontWeight: '600' },
  subtitle: { fontSize: 32, lineHeight: 44, fontWeight: '600' },
  default: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  link: { fontSize: 14, lineHeight: 30 },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
  },
};

/**
 * Motion vocabulary. Durations are milliseconds; curves are cubic-bezier control
 * points so both the legacy `Animated` API (`Easing.bezier(...curve)`) and
 * Reanimated can build the same easing from one source.
 *
 * Read these through `useMotion()` — it zeroes the durations when the user or
 * the OS asks for reduced motion, so no component re-implements that check.
 */
export const Motion = {
  duration: {
    /** Press feedback, toggles. */
    fast: 160,
    /** The default for anything that changes layout. */
    base: 240,
    /** Surface reveals, collapses. */
    slow: 360,
    /** First paint of a screen or a generated response. */
    entrance: 560,
  },
  curve: {
    /** General purpose ease-in-out. */
    standard: [0.25, 0.1, 0.25, 1],
    /** Arrives and settles — for things entering the screen. */
    decelerate: [0.25, 1, 0.5, 1],
    /** Leaves quickly — for things exiting. */
    accelerate: [0.4, 0, 1, 1],
  },
} as const;

export type MotionDuration = keyof typeof Motion.duration;
export type MotionCurve = keyof typeof Motion.curve;

export const MaxContentWidth = 800;

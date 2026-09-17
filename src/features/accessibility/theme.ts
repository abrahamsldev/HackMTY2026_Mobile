import type { AccessibilityPreferences } from './preferences';

export const banortePalette = {
  red: '#EF2945',
  white: '#FFFFFF',
  strongRed: '#8C1024',
  heatmap: ['#FFE0E6', '#FF8FA0', '#C51A35', '#8C1024'],
} as const;

type BaseColors = { text: string; background: string; backgroundElement: string; backgroundSelected: string; textSecondary: string };

function corePalette(base: BaseColors, colorScheme: 'light' | 'dark', settings: AccessibilityPreferences) {
  const dark = colorScheme === 'dark';
  if (settings.colorPalette === 'banorte') {
    // Exact brand red has insufficient contrast with small white text; use black
    // labels normally and a deeper red with white labels in high-contrast mode.
    const readableRed = dark ? '#FF9AA9' : banortePalette.strongRed;
    const adaptiveRed = dark ? '#FF4D67' : banortePalette.red;
    return {
      ...base,
      background: dark ? base.background : banortePalette.white,
      backgroundElement: dark ? '#242428' : '#FFF1F3',
      backgroundSelected: dark ? '#323238' : '#FFE0E6',
      textSecondary: settings.highContrast ? base.text : base.textSecondary,
      border: settings.highContrast ? base.text : adaptiveRed,
      accent: settings.highContrast ? banortePalette.strongRed : adaptiveRed,
      onAccent: settings.highContrast ? banortePalette.white : '#000000',
      info: settings.highContrast ? base.text : readableRed,
      success: settings.highContrast ? base.text : dark ? '#86EFAC' : '#166534',
      danger: settings.highContrast ? base.text : readableRed,
      warning: base.text,
      dangerBackground: banortePalette.strongRed,
      // Brand red leads; the other three are hues it can be told apart from.
      // The old set was three reds and a gray — series 2 and 3 sat at ΔE 11.7
      // for full color vision (floor 15), and the gray fell under the chroma
      // floor. Validated with the six categorical checks, both modes.
      chartColors: dark
        ? [banortePalette.red, '#3987e5', '#1aab7f', '#c98500']
        : [banortePalette.red, '#2a78d6', '#199e70', '#c98500'],
    };
  }
  const alternate = settings.colorPalette === 'blue-orange';
  const mono = settings.colorPalette === 'monochrome';
  return {
    ...base,
    textSecondary: settings.highContrast ? base.text : base.textSecondary,
    border: settings.highContrast ? base.text : base.backgroundSelected,
    accent: settings.highContrast ? (mono ? '#111111' : '#003B70') : mono ? (dark ? '#CCCCCC' : '#333333') : alternate ? '#075985' : '#155EAF',
    onAccent: !settings.highContrast && mono && dark ? '#000000' : '#FFFFFF',
    info: settings.highContrast || mono ? base.text : dark ? '#7DD3FC' : '#075985',
    success: mono || settings.highContrast ? base.text : alternate ? (dark ? '#7DD3FC' : '#075985') : dark ? '#86EFAC' : '#166534',
    danger: mono || settings.highContrast ? base.text : alternate ? (dark ? '#FDBA74' : '#9A3412') : dark ? '#FCA5A5' : '#991B1B',
    warning: mono || settings.highContrast ? base.text : dark ? '#FDE68A' : '#854D0E',
    dangerBackground: mono ? '#333333' : alternate ? '#9A3412' : '#991B1B',
    // Every set below passes the six categorical checks (lightness band, chroma
    // floor, CVD separation, normal-vision floor, contrast vs surface) on its
    // own surface. Dark mode is a selected set of steps, never the light hexes
    // reused. `default` is the one palette the charts draw with color alone —
    // no dash patterns — so it has to clear the normal-vision floor unaided;
    // the previous violet/blue pair sat at ΔE 13, under the 15 floor.
    // Okabe-Ito ordered blue, green, orange, magenta: that order keeps every
    // adjacent pair above the CVD floor; the original order did not.
    chartColors: mono ? (dark ? ['#FFFFFF', '#BBBBBB', '#888888', '#666666'] : ['#111111', '#555555', '#888888', '#AAAAAA']) : alternate ? (dark ? ['#2b8fd0', '#1aab7f', '#e06a1a', '#c66d9d'] : ['#0072B2', '#009E73', '#D55E00', '#CC79A7']) : dark ? ['#3987e5', '#d95926', '#199e70', '#c98500'] : ['#2a78d6', '#eb6834', '#199e70', '#c98500'],
  };
}

export function accessibleColors(base: BaseColors, colorScheme: 'light' | 'dark', settings: AccessibilityPreferences) {
  const core = corePalette(base, colorScheme, settings);
  return {
    ...core,
    /**
     * Tinted ground for selected chips, brand callouts and anything that should
     * read as "accent" behind text. It is the palette's own `backgroundSelected`,
     * so the contrast the tests already assert for that surface covers it too.
     */
    accentSurface: core.backgroundSelected,
    /** Placeholder fill while a generated surface is still arriving. Never carries text. */
    skeleton: core.backgroundElement,
    /** The sweep that passes over `skeleton`. Never carries text. */
    skeletonHighlight: core.backgroundSelected,
    /** Scrim behind sheets and full-screen overlays. */
    overlay: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(17, 12, 14, 0.45)',
    /** Shadow color for components that opt out of the neutral `Elevation` presets. */
    shadow: colorScheme === 'dark' ? '#000000' : '#181215',
  };
}

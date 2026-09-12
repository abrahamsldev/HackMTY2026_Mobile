import type { AccessibilityPreferences } from './preferences';

export const banortePalette = {
  red: '#EF2945',
  white: '#FFFFFF',
  strongRed: '#8C1024',
  heatmap: ['#FFE0E6', '#FF8FA0', '#C51A35', '#8C1024'],
} as const;

export function accessibleColors(base: { text: string; background: string; backgroundElement: string; backgroundSelected: string; textSecondary: string }, colorScheme: 'light' | 'dark', settings: AccessibilityPreferences) {
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
      chartColors: dark
        ? [banortePalette.red, banortePalette.white, '#FF9AA9', '#C9BFC1']
        : [banortePalette.red, banortePalette.strongRed, '#5A0A18', '#6B6163'],
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
    chartColors: mono ? (dark ? ['#FFFFFF', '#BBBBBB', '#888888', '#666666'] : ['#111111', '#555555', '#888888', '#AAAAAA']) : alternate ? ['#0072B2', '#D55E00', '#CC79A7', '#009E73'] : dark ? ['#60A5FA', '#C4B5FD', '#86EFAC', '#FDBA74'] : ['#1D4ED8', '#7C3AED', '#15803D', '#C2410C'],
  };
}

import type { AccessibilityPreferences } from './preferences';

export function accessibleColors(base: { text: string; background: string; backgroundElement: string; backgroundSelected: string; textSecondary: string }, colorScheme: 'light' | 'dark', settings: AccessibilityPreferences) {
  const dark = colorScheme === 'dark';
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

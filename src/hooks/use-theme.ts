import { Colors } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { accessibleColors } from '@/features/accessibility/theme';

export function useTheme() {
  const { colorScheme, settings } = useAccessibility();
  return accessibleColors(Colors[colorScheme], colorScheme, settings);
}

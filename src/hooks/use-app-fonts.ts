import {
  SplineSans_300Light,
  SplineSans_400Regular,
  SplineSans_500Medium,
  SplineSans_600SemiBold,
  SplineSans_700Bold,
  useFonts,
} from '@expo-google-fonts/spline-sans';

import { FontFamily } from '@/constants/theme';

/**
 * Loads the app face. One family per weight — see the note on `FontFamily`.
 *
 * Returns a single "stop blocking" flag rather than the raw `[loaded, error]`
 * pair: a font that fails to download must not keep the splash screen up
 * forever, and React Native falls back to the system face on its own when a
 * family never registers.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [FontFamily.light]: SplineSans_300Light,
    [FontFamily.regular]: SplineSans_400Regular,
    [FontFamily.medium]: SplineSans_500Medium,
    [FontFamily.semibold]: SplineSans_600SemiBold,
    [FontFamily.bold]: SplineSans_700Bold,
  });
  return loaded || Boolean(error);
}

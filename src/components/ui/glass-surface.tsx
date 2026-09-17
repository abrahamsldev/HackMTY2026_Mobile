import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';

export type GlassSurfaceProps = {
  children?: ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Painted instead of glass wherever glass is unavailable or unwanted. */
  fallbackColor: string;
};

/**
 * A panel that uses the platform's liquid glass when — and only when — that is
 * both available and appropriate, and an ordinary opaque surface otherwise.
 *
 * Four things have to hold, and any one of them failing means paint:
 *
 * - the app was compiled with the Liquid Glass design available,
 * - the running OS actually exposes the API (some iOS 26 betas do not, and
 *   calling into it there crashes),
 * - the user has not turned on Reduce Transparency, and
 * - the user has not asked the app to reduce motion, which in practice signals
 *   the same preference for a calmer, flatter interface.
 *
 * Glass is decoration here, never the thing that makes content legible: the
 * fallback is a real surface color, so nothing depends on the blur existing.
 */
export function GlassSurface({ children, style, fallbackColor }: GlassSurfaceProps) {
  const theme = useTheme();
  const { colorScheme, settings } = useAccessibility();
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => { if (active) setReduceTransparency(value); })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      (value) => { if (active) setReduceTransparency(value); },
    );
    return () => { active = false; subscription.remove(); };
  }, []);

  const useGlass =
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable() &&
    !reduceTransparency &&
    !settings.reduceMotion &&
    !settings.highContrast;

  if (!useGlass) {
    return <View style={[style, { backgroundColor: fallbackColor }]}>{children}</View>;
  }

  return (
    <GlassView
      style={StyleSheet.flatten(style)}
      glassEffectStyle="regular"
      // Follows the app's own appearance override, not the device's.
      colorScheme={colorScheme}
      tintColor={theme.accent}>
      {children}
    </GlassView>
  );
}

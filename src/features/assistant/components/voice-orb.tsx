import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { banortePalette } from '@/features/accessibility/theme';

// Visual scale range the real microphone level drives, on top of the resting
// size. Kept subtle: speech should read as "alive", not unstable.
const ORB_MIN_SCALE = 0.96;
const ORB_MAX_SCALE = 1.12;
// Idle breathing animation shown when there is little/no audio; it fades out
// as the real level rises so the two motions never compete.
const ORB_BREATH_SCALE_RANGE = 0.035;
const ORB_BREATH_DURATION_MS = 1800;

const HALO_MIN_OPACITY = 0.16;
const HALO_MAX_OPACITY = 0.4;
const HALO_MIN_SCALE = 1.08;
const HALO_MAX_SCALE = 1.32;

export type VoiceOrbProps = {
  /** Smoothed 0..1 microphone level (see use-voice-flow.ts). */
  level: SharedValue<number>;
  reduceMotion: boolean;
  size?: number;
};

export function VoiceOrb({ level, reduceMotion, size = 96 }: VoiceOrbProps) {
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: ORB_BREATH_DURATION_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [breath, reduceMotion]);

  const coreStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { transform: [{ scale: 1 }] };
    // Real speech takes priority: breathing's contribution shrinks as level rises.
    const breathScale = breath.value * ORB_BREATH_SCALE_RANGE * (1 - level.value);
    const speechScale = interpolate(level.value, [0, 1], [0, ORB_MAX_SCALE - ORB_MIN_SCALE]);
    return { transform: [{ scale: ORB_MIN_SCALE + breathScale + speechScale }] };
  });

  const haloStyle = useAnimatedStyle(() => {
    const drive = reduceMotion ? 0.4 : Math.max(breath.value * 0.5 * (1 - level.value), level.value);
    return {
      opacity: interpolate(drive, [0, 1], [HALO_MIN_OPACITY, HALO_MAX_OPACITY]),
      transform: [{ scale: interpolate(drive, [0, 1], [HALO_MIN_SCALE, HALO_MAX_SCALE]) }],
    };
  });

  return (
    <View style={[styles.wrapper, { width: size * 2.4, height: size * 2.4 }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.halo,
          { width: size * 1.9, height: size * 1.9, borderRadius: size * 0.95 },
          haloStyle,
        ]}
      />
      <Animated.View style={[styles.core, { width: size, height: size, borderRadius: size / 2 }, coreStyle]}>
        <Svg width={size * 0.38} height={size * 0.38} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
            stroke={banortePalette.strongRed}
            strokeWidth={2}
          />
          <Path
            d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"
            stroke={banortePalette.strongRed}
            strokeLinecap="round"
            strokeWidth={2}
          />
        </Svg>
        <View
          style={[
            styles.highlight,
            { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2 },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    backgroundColor: banortePalette.red,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: banortePalette.white,
    borderWidth: 2,
    borderColor: banortePalette.red,
    ...Platform.select({
      ios: {
        shadowColor: banortePalette.strongRed,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: `0 8px 24px rgba(140, 16, 36, 0.28)`,
      },
    }),
  },
  highlight: {
    position: 'absolute',
    top: '16%',
    left: '18%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
});

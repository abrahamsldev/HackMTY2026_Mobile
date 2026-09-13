import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAccessibility } from '@/features/accessibility/accessibility-provider';

const banorteLogo = require('@/assets/images/banorte-logo/banorte.png');

export type BanorteLoaderStage = 'thinking' | 'checkmark';

export type BanorteLoaderIconProps = {
  stage: BanorteLoaderStage;
  size?: number;
  checkmarkColor?: string;
};

/**
 * The app's one existing "processing" indicator: the Banorte logo spinning in
 * place, morphing into a checkmark once a response arrives. Extracted from
 * FloatingChatBubble so both it and VoiceProcessingOverlay share a single
 * implementation instead of two copies of the same animation.
 */
export function BanorteLoaderIcon({ stage, size = 44, checkmarkColor = '#FFFFFF' }: BanorteLoaderIconProps) {
  const { settings } = useAccessibility();
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [checkmarkScale] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    if (stage !== 'thinking' || settings.reduceMotion) {
      rotateAnim.setValue(0);
      return;
    }
    const spinSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 480,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.delay(800),
      ]),
    );
    spinSequence.start();
    return () => spinSequence.stop();
  }, [stage, settings.reduceMotion, rotateAnim]);

  useEffect(() => {
    if (stage !== 'checkmark') return;
    checkmarkScale.setValue(0.6);
    if (!settings.reduceMotion) {
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      checkmarkScale.setValue(1);
    }
  }, [stage, settings.reduceMotion, checkmarkScale]);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const checkmarkSize = Math.round(size * (38 / 44));

  if (stage === 'checkmark') {
    return (
      <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
        <Svg width={checkmarkSize} height={checkmarkSize} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" fill="none" stroke={checkmarkColor} strokeWidth="2.2" />
          <Path
            d="M7.5 12.5l3 3 6.5-7"
            fill="none"
            stroke={checkmarkColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Image source={banorteLogo} style={[styles.logoImage, { width: size, height: size }]} resizeMode="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  logoImage: {
    width: 44,
    height: 44,
  },
});

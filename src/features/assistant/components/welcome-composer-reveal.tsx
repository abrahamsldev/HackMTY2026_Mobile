import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import { BanorteLoaderIcon } from './banorte-loader-icon';

const INTRO_DELAY_MS = 260;
const INTRO_DURATION_MS = 760;

export type WelcomeComposerRevealProps = {
  children: React.ReactNode;
};

/** Reveals the first composer by expanding the Banorte button into its input shell. */
export function WelcomeComposerReveal({ children }: WelcomeComposerRevealProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const [progress] = useState(() => new Animated.Value(settings.reduceMotion ? 1 : 0));
  const [contentReady, setContentReady] = useState(settings.reduceMotion);

  useEffect(() => {
    progress.stopAnimation();

    if (settings.reduceMotion) {
      progress.setValue(1);
      const readyTimer = setTimeout(() => setContentReady(true), 0);
      return () => clearTimeout(readyTimer);
    }

    progress.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(INTRO_DELAY_MS),
      Animated.timing(progress, {
        toValue: 1,
        duration: INTRO_DURATION_MS,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setContentReady(true);
    });
    return () => animation.stop();
  }, [progress, settings.reduceMotion]);

  const shellScaleX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.09, 1],
  });
  const shellOpacity = progress.interpolate({
    inputRange: [0, 0.78, 1],
    outputRange: [1, 1, 0],
  });
  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.58, 1],
    outputRange: [0, 0, 1],
  });
  const contentScale = progress.interpolate({
    inputRange: [0, 0.58, 1],
    outputRange: [0.98, 0.98, 1],
  });
  const logoOpacity = progress.interpolate({
    inputRange: [0, 0.46, 0.72, 1],
    outputRange: [1, 1, 0, 0],
  });
  const logoScale = progress.interpolate({
    inputRange: [0, 0.46, 0.72, 1],
    outputRange: [1, 1.06, 0.82, 0.82],
  });

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.expandingShell,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            opacity: shellOpacity,
            transform: [{ scaleX: shellScaleX }],
          },
        ]}
      />

      <Animated.View
        accessibilityElementsHidden={!contentReady}
        importantForAccessibility={contentReady ? 'auto' : 'no-hide-descendants'}
        pointerEvents={contentReady ? 'auto' : 'none'}
        style={{
          opacity: contentOpacity,
          transform: [{ scale: contentScale }],
        }}>
        {children}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.logoLayer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
        <View
          style={[
            styles.logoButton,
            { backgroundColor: theme.background, borderColor: theme.accent },
          ]}>
          <BanorteLoaderIcon stage="idle" size={44} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    minHeight: 72,
    justifyContent: 'center',
  },
  expandingShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 68,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  logoLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18)' },
    }),
  },
});

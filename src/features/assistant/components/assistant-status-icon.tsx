import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

export type AssistantStatus = 'thinking' | 'complete' | 'error';

export function AssistantStatusIcon({
  status,
  size = 40,
}: {
  status: AssistantStatus;
  size?: number;
}) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const [rotation] = useState(() => new Animated.Value(0));
  const [outcome] = useState(() => new Animated.Value(status === 'thinking' ? 0 : 1));

  useEffect(() => {
    rotation.stopAnimation();
    rotation.setValue(0);
    if (status !== 'thinking' || settings.reduceMotion) return;

    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1250,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation, settings.reduceMotion, status]);

  useEffect(() => {
    const animation = Animated.timing(outcome, {
      toValue: status === 'thinking' ? 0 : 1,
      duration: settings.reduceMotion ? 0 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [outcome, settings.reduceMotion, status]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spinnerOpacity = outcome.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const spinnerScale = outcome.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] });
  const outcomeScale = outcome.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const outcomeColor = status === 'error' ? theme.danger : theme.success;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={[
          styles.layer,
          { opacity: spinnerOpacity, transform: [{ rotate: spin }, { scale: spinnerScale }] },
        ]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="8.5" fill="none" stroke={theme.backgroundSelected} strokeWidth="2.5" />
          <Circle
            cx="12"
            cy="12"
            r="8.5"
            fill="none"
            stroke={theme.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={[34, 20]}
          />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.layer, { opacity: outcome, transform: [{ scale: outcomeScale }] }]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" fill="none" stroke={outcomeColor} strokeWidth="2" />
          {status === 'error' ? (
            <Path d="M8.5 8.5l7 7m0-7-7 7" fill="none" stroke={outcomeColor} strokeWidth="2.2" strokeLinecap="round" />
          ) : (
            <Path d="M7.5 12.5l3 3 6.5-7" fill="none" stroke={outcomeColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
  },
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

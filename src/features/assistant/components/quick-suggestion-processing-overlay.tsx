import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import type { A2UIActionOrigin } from '@/features/a2ui';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import { BanorteLoaderIcon } from './banorte-loader-icon';
import { FinancialThinkingMessage } from './financial-thinking-message';

const RESULT_HOLD_MS = 560;
const TRAVEL_DURATION_MS = 520;

export type RequestProcessingOverlayProps = {
  active: boolean;
  complete: boolean;
  outcome?: 'success' | 'failure';
  pendingLabel?: string;
  bottomInset: number;
  origin?: A2UIActionOrigin;
  onFinished: () => void;
};

/** Full-screen transition shared by quick prompts and A2UI actions. */
export function RequestProcessingOverlay({
  active,
  complete,
  outcome = 'success',
  pendingLabel = 'Procesando petición',
  bottomInset,
  origin,
  onFinished,
}: RequestProcessingOverlayProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const rootRef = useRef<View>(null);
  const [rootFrame, setRootFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [translateX] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(0));
  const [scaleX] = useState(() => new Animated.Value(1));
  const [scaleY] = useState(() => new Animated.Value(1));
  const [iconOpacity] = useState(() => new Animated.Value(1));
  const [backdropOpacity] = useState(() => new Animated.Value(1));

  const travelDistance = Math.max(
    0,
    rootFrame.height / 2 - Math.max(bottomInset, 24) - 32,
  );

  useEffect(() => {
    if (!active) return;
    translateX.stopAnimation();
    translateY.stopAnimation();
    scaleX.stopAnimation();
    scaleY.stopAnimation();
    iconOpacity.stopAnimation();
    backdropOpacity.stopAnimation();

    const hasMeasuredOrigin = Boolean(origin && rootFrame.width > 0 && rootFrame.height > 0);
    const startX = hasMeasuredOrigin && origin
      ? origin.x + origin.width / 2 - rootFrame.x - rootFrame.width / 2
      : 0;
    const startY = hasMeasuredOrigin && origin
      ? origin.y + origin.height / 2 - rootFrame.y - rootFrame.height / 2
      : 0;
    const startScaleX = hasMeasuredOrigin && origin
      ? Math.max(1, Math.min(origin.width / 64, 7))
      : 1;
    const startScaleY = hasMeasuredOrigin && origin
      ? Math.max(0.7, Math.min(origin.height / 64, 2))
      : 1;

    translateX.setValue(startX);
    translateY.setValue(startY);
    scaleX.setValue(startScaleX);
    scaleY.setValue(startScaleY);
    iconOpacity.setValue(hasMeasuredOrigin ? 0 : 1);
    backdropOpacity.setValue(1);

    if (!hasMeasuredOrigin || settings.reduceMotion) {
      translateX.setValue(0);
      translateY.setValue(0);
      scaleX.setValue(1);
      scaleY.setValue(1);
      iconOpacity.setValue(1);
      return;
    }

    const entrance = Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleX, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleY, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [
    active,
    backdropOpacity,
    iconOpacity,
    origin,
    rootFrame,
    scaleX,
    scaleY,
    settings.reduceMotion,
    translateX,
    translateY,
  ]);

  useEffect(() => {
    if (!active || !complete) return;

    // The response is already committed when `complete` becomes true. Remove
    // the cover in one frame so the rendered A2UI surface stays fully opaque
    // while the result icon completes its trip to the bottom.
    backdropOpacity.stopAnimation();
    backdropOpacity.setValue(0);

    if (settings.reduceMotion) {
      const timer = setTimeout(onFinished, 360);
      return () => clearTimeout(timer);
    }

    const move = Animated.sequence([
      Animated.delay(RESULT_HOLD_MS),
      Animated.timing(translateY, {
        toValue: travelDistance,
        duration: TRAVEL_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);

    move.start(({ finished }) => {
      if (finished) onFinished();
    });

    return () => move.stop();
  }, [
    active,
    backdropOpacity,
    complete,
    onFinished,
    settings.reduceMotion,
    translateY,
    travelDistance,
  ]);

  const succeeded = outcome === 'success';

  return (
    <View
      ref={rootRef}
      accessibilityLabel={
        complete ? (succeeded ? 'Petición completada' : 'La petición falló') : pendingLabel
      }
      accessibilityElementsHidden={!active}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      importantForAccessibility={active ? 'yes' : 'no-hide-descendants'}
      onLayout={() => {
        rootRef.current?.measureInWindow((x, y, width, height) => {
          setRootFrame((current) =>
            current.x === x && current.y === y && current.width === width && current.height === height
              ? current
              : { x, y, width, height },
          );
        });
      }}
      pointerEvents={active ? 'auto' : 'none'}
      style={styles.root}>
      {active && (
        <>
          {!complete && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.backdrop,
                { backgroundColor: theme.background, opacity: backdropOpacity },
              ]}
            />
          )}
          <Animated.View
            style={[styles.processingStage, { transform: [{ translateX }, { translateY }] }]}>
            <Animated.View
              style={{ transform: [{ scaleX }, { scaleY }] }}>
              <View
                style={[
                  styles.button,
                  {
                    backgroundColor: complete ? theme.success : theme.background,
                    borderColor: complete
                      ? succeeded ? theme.success : theme.danger
                      : theme.accent,
                    ...(complete && !succeeded ? { backgroundColor: theme.dangerBackground } : null),
                  },
                ]}>
                <Animated.View style={{ opacity: iconOpacity }}>
                  <BanorteLoaderIcon
                    stage={complete ? (succeeded ? 'checkmark' : 'error') : 'thinking'}
                    size={44}
                    checkmarkColor="#FFFFFF"
                  />
                </Animated.View>
              </View>
            </Animated.View>
            {!complete && (
              <Animated.View
                pointerEvents="none"
                style={[styles.waitingMessage, { opacity: iconOpacity }]}>
                <FinancialThinkingMessage />
              </Animated.View>
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10002,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  processingStage: {
    width: 64,
    height: 64,
  },
  waitingMessage: {
    position: 'absolute',
    top: 78,
    left: -108,
    width: 280,
  },
  button: {
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
        shadowOpacity: 0.24,
        shadowRadius: 10,
      },
      android: { elevation: 9 },
      web: { boxShadow: '0 6px 20px rgba(0, 0, 0, 0.22)' },
    }),
  },
});

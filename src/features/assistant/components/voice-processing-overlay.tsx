import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { banortePalette } from '@/features/accessibility/theme';

import { BanorteLoaderIcon } from './banorte-loader-icon';
import { VoiceOrb } from './voice-orb';
import type { VoiceFlowPhase } from '../use-voice-flow';

const ENTRANCE_DURATION_MS = 220;
const EXIT_DURATION_MS = 200;
const MORPH_DURATION_MS = 240;
const ORB_SIZE = 96;

function CancelIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={banortePalette.strongRed}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type VoiceProcessingOverlayProps = {
  phase: VoiceFlowPhase;
  level: SharedValue<number>;
  onCancel: () => void;
};

const ORB_ACTIVE_PHASES: ReadonlySet<VoiceFlowPhase> = new Set(['starting', 'listening', 'stopping']);

/**
 * Bridges the voice orb (recording) into the app's existing Banorte loader.
 * Only bridges the "transcribing" gap: once handleSubmit fires, the real
 * FloatingChatBubble is already mounted and spinning (see AssistantWorkspace,
 * which also feeds it `loading` during transcribing/submitting/waiting), so
 * this overlay fades out rather than showing a second, competing loader.
 */
export function VoiceProcessingOverlay({ phase, level, onCancel }: VoiceProcessingOverlayProps) {
  const { settings } = useAccessibility();
  const insets = useSafeAreaInsets();
  const reduceMotion = settings.reduceMotion;

  const showOrb = ORB_ACTIVE_PHASES.has(phase);
  const showBadge = phase === 'transcribing';
  const isActive = showOrb || showBadge;

  const [mounted, setMounted] = useState(isActive);
  const containerOpacity = useSharedValue(isActive ? 1 : 0);
  const containerScale = useSharedValue(isActive ? 1 : 0.82);
  const containerTranslateY = useSharedValue(isActive ? 0 : 6);
  const morph = useSharedValue(showBadge ? 1 : 0);

  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    if (!mounted) return;
    if (isActive) {
      if (reduceMotion) {
        containerOpacity.value = withTiming(1, { duration: ENTRANCE_DURATION_MS });
        containerScale.value = 1;
        containerTranslateY.value = 0;
      } else {
        containerOpacity.value = withTiming(1, { duration: ENTRANCE_DURATION_MS, easing: Easing.out(Easing.cubic) });
        containerScale.value = withSpring(1, { damping: 18, stiffness: 220, mass: 0.6 });
        containerTranslateY.value = withTiming(0, { duration: ENTRANCE_DURATION_MS, easing: Easing.out(Easing.cubic) });
      }
    } else {
      const config = { duration: reduceMotion ? 120 : EXIT_DURATION_MS, easing: Easing.in(Easing.cubic) };
      containerOpacity.value = withTiming(0, config, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
      containerScale.value = withTiming(0.92, config);
    }
  }, [isActive, mounted, reduceMotion, containerOpacity, containerScale, containerTranslateY]);

  useEffect(() => {
    morph.value = reduceMotion
      ? (showBadge ? 1 : 0)
      : withTiming(showBadge ? 1 : 0, { duration: MORPH_DURATION_MS, easing: Easing.inOut(Easing.cubic) });
  }, [showBadge, reduceMotion, morph]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }, { translateY: containerTranslateY.value }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ scale: interpolate(morph.value, [0, 1], [1, 0.88]) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ scale: interpolate(morph.value, [0, 1], [0.88, 1]) }],
  }));

  if (!mounted) return null;

  const label = phase === 'listening' ? 'Escuchando…' : phase === 'transcribing' ? 'Transcribiendo…' : 'Preparando…';

  return (
    <View style={[styles.root, { top: insets.top + 40 }]} pointerEvents="box-none">
      <Animated.View style={[styles.card, containerStyle]}>
        <View style={styles.stage}>
          <Animated.View style={[styles.stageLayer, orbStyle]}>
            <VoiceOrb level={level} reduceMotion={reduceMotion} size={ORB_SIZE} />
          </Animated.View>
          <Animated.View style={[styles.stageLayer, badgeStyle]} pointerEvents="none">
            <View style={styles.badge}>
              <BanorteLoaderIcon stage="thinking" size={40} checkmarkColor={banortePalette.white} />
            </View>
          </Animated.View>
        </View>

        <ThemedText type="smallBold" accessibilityLiveRegion="polite" style={styles.label}>
          {label}
        </ThemedText>

        {phase === 'listening' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar grabación"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.7 : 1 }]}>
            <CancelIcon />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 500,
  },
  card: {
    alignItems: 'center',
    gap: 10,
  },
  stage: {
    width: ORB_SIZE * 2.4,
    height: ORB_SIZE * 2.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: banortePalette.strongRed,
    ...Platform.select({
      ios: {
        shadowColor: banortePalette.strongRed,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 10 },
      web: { boxShadow: `0 8px 24px rgba(140, 16, 36, 0.3)` },
    }),
  },
  label: {
    color: banortePalette.strongRed,
    fontSize: 13,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: banortePalette.white,
    borderWidth: 1.5,
    borderColor: banortePalette.red,
  },
});

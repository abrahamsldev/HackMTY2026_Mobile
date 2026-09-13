import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { banortePalette } from '@/features/accessibility/theme';
import { useTheme } from '@/hooks/use-theme';

import { BanorteLoaderIcon } from './banorte-loader-icon';
import { VoiceOrb } from './voice-orb';
import type { VoiceFlowPhase } from '../use-voice-flow';

const MORPH_DURATION_MS = 240;
const ORB_SIZE = 96;

export type VoiceProcessingOverlayProps = {
  phase: VoiceFlowPhase;
  level: SharedValue<number>;
  onStop: () => void;
};

const ORB_ACTIVE_PHASES: ReadonlySet<VoiceFlowPhase> = new Set(['starting', 'listening', 'stopping']);
const SPINNER_ACTIVE_PHASES: ReadonlySet<VoiceFlowPhase> = new Set([
  'transcribing',
  'submitting',
  'waiting',
  'done',
]);

/**
 * Owns the complete voice-turn presentation. The rest of the workspace stays
 * mounted behind an opaque layer so drafts survive, but no competing UI is
 * visible while recording, transcribing, submitting or waiting for the agent.
 */
export function VoiceProcessingOverlay({ phase, level, onStop }: VoiceProcessingOverlayProps) {
  const { settings } = useAccessibility();
  const theme = useTheme();
  const reduceMotion = settings.reduceMotion;

  const showOrb = ORB_ACTIVE_PHASES.has(phase);
  const showSpinner = SPINNER_ACTIVE_PHASES.has(phase);
  const isActive = showOrb || showSpinner;

  const morph = useSharedValue(showSpinner ? 1 : 0);

  useEffect(() => {
    morph.value = reduceMotion
      ? (showSpinner ? 1 : 0)
      : withTiming(showSpinner ? 1 : 0, { duration: MORPH_DURATION_MS, easing: Easing.inOut(Easing.cubic) });
  }, [showSpinner, reduceMotion, morph]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ scale: interpolate(morph.value, [0, 1], [1, 0.88]) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: morph.value,
    transform: [{ scale: interpolate(morph.value, [0, 1], [0.88, 1]) }],
  }));

  if (!isActive) return null;

  return (
    <View
      style={[styles.root, styles.captureRoot, { backgroundColor: theme.background }]}
      pointerEvents="auto">
      <View style={styles.card}>
        <View style={styles.stage}>
          <Animated.View style={[styles.stageLayer, orbStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                phase === 'listening' ? 'Detener grabación' : 'Preparando micrófono'
              }
              accessibilityHint={
                phase === 'listening' ? 'Toca para terminar y enviar tu consulta' : undefined
              }
              disabled={phase !== 'listening'}
              onPress={onStop}
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
              <VoiceOrb level={level} reduceMotion={reduceMotion} size={ORB_SIZE} />
            </Pressable>
          </Animated.View>
          <Animated.View style={[styles.stageLayer, badgeStyle]} pointerEvents="none">
            <View style={styles.badge}>
              <BanorteLoaderIcon
                stage={phase === 'done' ? 'checkmark' : 'thinking'}
                size={40}
                checkmarkColor={banortePalette.white}
              />
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10001,
  },
  captureRoot: {
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
});

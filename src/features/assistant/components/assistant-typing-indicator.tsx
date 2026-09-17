import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import { agentStatusFallbackCopy, agentStatusLabel, type AgentStatusId } from '../agent-status';

export type AgentStatusLabelProps = {
  /**
   * The phase the backend last reported for this turn. `null`/`undefined` (no
   * line yet, or a deployment that does not stream) and unknown identifiers
   * both fall back to the generic copy: a raw id is never shown.
   */
  status?: AgentStatusId | null;
  centered?: boolean;
};

/**
 * The one line of progress copy for a running turn, and the app's single
 * screen-reader announcement for it. Rendered under the Banorte orb while it
 * spins, and inside {@link AssistantTypingIndicator} in the thread.
 *
 * It reads a phase, it never derives one: no timers, no elapsed time, no
 * self-advancing sequence. When no phase has been reported the copy stays put.
 */
export function AgentStatusLabel({ status, centered = false }: AgentStatusLabelProps) {
  const { settings } = useAccessibility();
  const label = agentStatusLabel(status) ?? agentStatusFallbackCopy;
  const [opacity] = useState(() => new Animated.Value(1));

  // Crossfade the new phrase in. Keyed on the resolved copy, so a phase the
  // backend repeats — it does emit `interpreting` twice — re-renders nothing
  // and re-announces nothing.
  useEffect(() => {
    if (settings.reduceMotion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0.2);
    const fade = Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    fade.start();
    return () => fade.stop();
  }, [label, opacity, settings.reduceMotion]);

  return (
    <View
      style={[styles.statusLabelContainer, centered && styles.statusLabelCentered]}
      accessibilityLiveRegion="polite">
      <Animated.View
        style={{ opacity }}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ text: label }}>
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.label, centered && styles.labelCentered]}>
          {label}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

export type AssistantTypingIndicatorProps = {
  status?: AgentStatusId | null;
  onCancel?: () => void;
};

export function AssistantTypingIndicator({ status, onCancel }: AssistantTypingIndicatorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.statusLine,
          {
            backgroundColor: theme.background,
            borderColor: theme.accent,
          },
        ]}>
        <AgentStatusLabel status={status} />
      </View>

      {onCancel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancelar consulta"
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            { opacity: pressed ? 0.55 : 1 },
          ]}>
          <ThemedText type="small" themeColor="textSecondary">
            Cancelar
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.xxs,
  },
  statusLine: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  // A floor, never a fixed height: the copy must be able to wrap at large text
  // scales instead of being clipped.
  statusLabelContainer: {
    minHeight: 20,
    justifyContent: 'center',
  },
  statusLabelCentered: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  labelCentered: {
    textAlign: 'center',
  },
  cancelButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { A2UIActionOrigin } from '@/features/a2ui';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';

import { AssistantMark } from './assistant-mark';

export function extractFirstName(
  userMetadata?: Record<string, unknown> | null,
  fallbackFullName?: string | null,
): string | null {
  const candidates = [
    userMetadata?.full_name,
    userMetadata?.name,
    userMetadata?.display_name,
    fallbackFullName,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      // Must not be empty, not an email, not a UUID
      if (
        trimmed.length > 0 &&
        !trimmed.includes('@') &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)
      ) {
        const first = trimmed.split(/\s+/)[0];
        if (first && first.length > 0) {
          return first;
        }
      }
    }
  }

  return null;
}

/**
 * Two openers, not a menu: one that reads data and one that starts an
 * operation, so the pair shows both halves of what the assistant does without
 * turning the first screen into a list of features. Everything else is typed or
 * spoken.
 */
const DEFAULT_SUGGESTIONS = [
  'Muéstrame mi resumen financiero',
  'Quiero pagar mi tarjeta de crédito',
];

export type AssistantWelcomeProps = {
  firstName: string | null;
  onSelectSuggestion: (question: string, origin?: A2UIActionOrigin) => void;
  disabled?: boolean;
};

export function AssistantWelcome({
  firstName,
  onSelectSuggestion,
  disabled = false,
}: AssistantWelcomeProps) {
  const motion = useMotion();
  const [animOpacity] = useState(() => new Animated.Value(motion.enabled ? 0 : 1));
  const [animTranslateY] = useState(() => new Animated.Value(motion.enabled ? 8 : 0));

  useEffect(() => {
    if (!motion.enabled) {
      animOpacity.setValue(1);
      animTranslateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: motion.duration.entrance,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animTranslateY, {
        toValue: 0,
        duration: motion.duration.entrance,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [motion.enabled, motion.duration.entrance, animOpacity, animTranslateY]);

  const greeting = firstName ? `Hola, ${firstName}` : 'Hola';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animOpacity,
          transform: [{ translateY: animTranslateY }],
        },
      ]}>
      <AssistantMark />

      <View style={styles.header}>
        <ThemedText style={styles.greeting} themeColor="textSecondary">
          {greeting}
        </ThemedText>
        <ThemedText accessibilityRole="header" style={styles.prompt}>
          ¿Cómo puedo ayudarte hoy?
        </ThemedText>
      </View>

      <View style={styles.chipsRow}>
        {DEFAULT_SUGGESTIONS.map((suggestion) => (
          <QuickSuggestion
            key={suggestion}
            suggestion={suggestion}
            disabled={disabled}
            onSelect={onSelectSuggestion}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function QuickSuggestion({
  suggestion,
  disabled,
  onSelect,
}: {
  suggestion: string;
  disabled: boolean;
  onSelect: (question: string, origin?: A2UIActionOrigin) => void;
}) {
  const theme = useTheme();
  const motion = useMotion();
  const buttonRef = useRef<View>(null);

  function handlePress() {
    let selected = false;
    const select = (origin?: A2UIActionOrigin) => {
      if (selected) return;
      selected = true;
      onSelect(suggestion, origin);
    };
    const fallback = setTimeout(() => select(), 80);

    buttonRef.current?.measureInWindow((x, y, width, height) => {
      clearTimeout(fallback);
      select(width > 0 && height > 0 ? { x, y, width, height } : undefined);
    });
  }

  return (
    <Pressable
      ref={buttonRef}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Sugerencia: ${suggestion}`}
      accessibilityState={{ disabled }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed ? theme.backgroundElement : theme.background,
          borderColor: theme.border,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed && motion.enabled ? 0.985 : 1 }],
        },
      ]}>
      <ThemedText type="small" style={styles.chipText} themeColor="textSecondary">
        {suggestion}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  greeting: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '600',
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    maxWidth: 560,
    width: '100%',
  },
  chip: {
    flexBasis: '46%',
    flexGrow: 1,
    maxWidth: 272,
    // A hairline pill, not an outlined button: these are openers, and the
    // composer below them is the primary action.
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    textAlign: 'center',
  },
});

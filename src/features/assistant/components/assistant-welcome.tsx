import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { A2UIActionOrigin } from '@/features/a2ui';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

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

const DEFAULT_SUGGESTIONS = [
  'Quiero crear un presupuesto',
  'Quiero pagar mi tarjeta de crédito',
  'Muéstrame mi resumen financiero',
  'Muéstrame mis movimientos recientes',
];

export type AssistantWelcomeProps = {
  firstName: string | null;
  onSelectSuggestion: (question: string, origin?: A2UIActionOrigin) => void;
  onOpenQuestionBank?: () => void;
  disabled?: boolean;
};

export function AssistantWelcome({
  firstName,
  onSelectSuggestion,
  onOpenQuestionBank,
  disabled = false,
}: AssistantWelcomeProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();

  const [animOpacity] = useState(() => new Animated.Value(settings.reduceMotion ? 1 : 0));
  const [animTranslateY] = useState(() => new Animated.Value(settings.reduceMotion ? 0 : 8));

  useEffect(() => {
    if (settings.reduceMotion) {
      animOpacity.setValue(1);
      animTranslateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 560,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animTranslateY, {
        toValue: 0,
        duration: 560,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [settings.reduceMotion, animOpacity, animTranslateY]);

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
      <View style={styles.header}>
        <ThemedText style={styles.greeting}>{greeting}</ThemedText>
        <ThemedText style={styles.prompt}>¿Cómo puedo ayudarte hoy?</ThemedText>
        <ThemedText style={styles.subtitle} themeColor="textSecondary">
          Consulta movimientos, analiza presupuestos o simula escenarios financieros.
        </ThemedText>
      </View>

      <View style={styles.suggestionsContainer}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.suggestionsTitle}>
          Sugerencias rápidas
        </ThemedText>
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

        {onOpenQuestionBank && (
          <Pressable
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Ver banco de preguntas completo"
            accessibilityState={{ disabled }}
            onPress={onOpenQuestionBank}
            style={({ pressed }) => [
              styles.moreQuestionsButton,
              {
                opacity: pressed ? 0.6 : 1,
                transform: [{ scale: pressed && !settings.reduceMotion ? 0.985 : 1 }],
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Ver banco de preguntas
            </ThemedText>
          </Pressable>
        )}
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
  const { settings } = useAccessibility();
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
          borderColor: theme.accent,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed && !settings.reduceMotion ? 0.985 : 1 }],
        },
      ]}>
      <ThemedText type="smallBold" style={styles.chipText}>
        {suggestion}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.three,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.one,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '500',
    opacity: 0.9,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.half,
    maxWidth: 520,
  },
  suggestionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  suggestionsTitle: {
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
    maxWidth: 640,
    width: '100%',
  },
  chip: {
    flexBasis: '46%',
    flexGrow: 1,
    maxWidth: 312,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  moreQuestionsButton: {
    marginTop: Spacing.one,
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});

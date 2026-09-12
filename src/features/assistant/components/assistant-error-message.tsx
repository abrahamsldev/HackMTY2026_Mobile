import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AssistantErrorMessageProps = {
  message?: string;
  onRetry?: () => void;
};

function RetryIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M20 6v5h-5M19.1 11a7.5 7.5 0 1 0 .2 5"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

export function AssistantErrorMessage({
  message = 'No pude completar la consulta.',
  onRetry,
}: AssistantErrorMessageProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            borderColor: theme.accent,
          },
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive">
        <ThemedText style={[styles.message, { color: theme.danger }]}>
          {message}
        </ThemedText>
      </View>

      {onRetry && <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar consulta"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: pressed ? theme.backgroundElement : 'transparent',
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <RetryIcon color={theme.accent} />
        </Pressable>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  container: {
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
    paddingLeft: Spacing.one,
  },
  actionButton: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

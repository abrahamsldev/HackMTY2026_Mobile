import React, { useEffect, useState } from 'react';
import { Animated, Clipboard, Easing, Platform, StyleSheet, View } from 'react-native';

import { Pressable, TextInput } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { AppIcon, type AppIconName } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { type A2UIAction, type A2UIActionOrigin, type A2UISurfaceState } from '@/features/a2ui';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import type { AgentStatusId } from '../agent-status';
import { A2UISurface } from './a2ui-surface';
import { AssistantErrorMessage } from './assistant-error-message';
import { AssistantStatusIcon, type AssistantStatus } from './assistant-status-icon';
import { AssistantTypingIndicator } from './assistant-typing-indicator';

export type ChatMessageProps = {
  role: 'user' | 'assistant';
  content?: string;
  surfaces?: readonly A2UISurfaceState[];
  isPending?: boolean;
  /** Coarse phase reported by the backend for the running turn. */
  agentStatus?: AgentStatusId | null;
  error?: string | null;
  a2uiError?: string | null;
  onRetry?: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onSubmitEdit?: () => void;
  onCancelEdit?: () => void;
  onCancel?: () => void;
  onDispatch?: (action: A2UIAction, origin?: A2UIActionOrigin) => void | Promise<void>;
  disabled?: boolean;
  animate?: boolean;
};

export function ChatMessage({
  role,
  content,
  surfaces,
  isPending = false,
  agentStatus,
  error,
  a2uiError,
  onRetry,
  onEdit,
  isEditing = false,
  editValue = '',
  onEditValueChange,
  onSubmitEdit,
  onCancelEdit,
  onCancel,
  onDispatch,
  disabled = false,
  animate = true,
}: ChatMessageProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();

  const [animOpacity] = useState(() => new Animated.Value(settings.reduceMotion || !animate ? 1 : 0));
  const [animTranslateY] = useState(() => new Animated.Value(settings.reduceMotion || !animate ? 0 : 10));
  const [statusProgress] = useState(() => new Animated.Value(isPending ? 0 : 1));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings.reduceMotion || !animate) {
      animOpacity.setValue(1);
      animTranslateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animTranslateY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [animate, settings.reduceMotion, animOpacity, animTranslateY]);

  useEffect(() => {
    if (role === 'user') return;
    const animation = Animated.timing(statusProgress, {
      toValue: isPending ? 0 : 1,
      duration: settings.reduceMotion ? 0 : 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [isPending, role, settings.reduceMotion, statusProgress]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const isUser = role === 'user';
  const status: AssistantStatus | null = isPending
    ? 'thinking'
    : error
      ? 'error'
      : content || surfaces?.length || a2uiError
        ? 'complete'
        : null;

  const canSubmitEdit = Boolean(editValue.trim()) && !disabled;

  function handleCopy() {
    const text = content?.trim();
    if (!text) return;

    if (Platform.OS === 'web') {
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard) return;
      void clipboard.writeText(text).then(
        () => setCopied(true),
        () => undefined,
      );
      return;
    }

    Clipboard.setString(text);
    setCopied(true);
  }

  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.userContainer,
          isEditing && styles.userContainerEditing,
          {
            opacity: animOpacity,
            transform: [{ translateY: animTranslateY }],
          },
        ]}>
        {isEditing ? (
          <View
            style={[
              styles.userEditBubble,
              { backgroundColor: theme.background, borderColor: theme.accent },
            ]}>
            <TextInput
              autoFocus
              accessibilityLabel="Editar consulta"
              value={editValue}
              onChangeText={onEditValueChange}
              multiline
              maxLength={4000}
              style={[styles.userEditInput, { color: theme.text }]}
            />
            <View style={styles.editConfirmationRow}>
              {onCancelEdit && (
                <IconButton
                  label="Cancelar edición"
                  color={theme.danger}
                  onPress={onCancelEdit}
                  icon="close"
                />
              )}
              {onSubmitEdit && (
                <IconButton
                  label="Enviar consulta editada"
                  color={theme.success}
                  disabled={!canSubmitEdit}
                  onPress={onSubmitEdit}
                  icon="confirm"
                />
              )}
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.userBubble,
              {
                backgroundColor: theme.background,
                borderColor: theme.accent,
              },
            ]}>
            <ThemedText selectable style={[styles.userText, { color: theme.text }]}>
              {content}
            </ThemedText>
          </View>
        )}
        {onEdit && !isEditing && (
          <View style={styles.userActionsRow}>
            <IconButton
              label={copied ? 'Texto copiado' : 'Copiar consulta'}
              color={copied ? theme.success : theme.textSecondary}
              onPress={handleCopy}
              icon={copied ? 'confirm' : 'copy'}
            />
            <IconButton
              label="Editar última consulta"
              color={theme.textSecondary}
              onPress={onEdit}
              icon="edit"
            />
          </View>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.assistantContainer,
        {
          opacity: animOpacity,
          transform: [{ translateY: animTranslateY }],
        },
      ]}>
      {/* Header / Avatar info */}
      <View style={[styles.assistantHeader, isPending && styles.assistantHeaderPending]}>
        {status && (
          <Animated.View
            style={{
              transform: [
                {
                  translateY: statusProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
                {
                  scale: statusProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.7],
                  }),
                },
              ],
            }}>
            <AssistantStatusIcon status={status} size={48} />
          </Animated.View>
        )}
        {isPending ? (
          <AssistantTypingIndicator status={agentStatus} onCancel={onCancel} />
        ) : (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.assistantLabel}>
            Asistente Banorte
          </ThemedText>
        )}
      </View>

      {/* Text message bubble */}
      {Boolean(content) && (
        <Animated.View
          style={[
            styles.assistantBubble,
            {
              backgroundColor: theme.background,
              borderColor: theme.accent,
              opacity: statusProgress,
              transform: [
                {
                  translateY: statusProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
          accessibilityLiveRegion="polite">
          <ThemedText selectable style={styles.assistantText}>
            {content}
          </ThemedText>
        </Animated.View>
      )}

      {/* Error state */}
      {error && (
        <AssistantErrorMessage message={error} onRetry={onRetry} />
      )}

      {/* Generated A2UI Surfaces (can be full width) */}
      {surfaces && surfaces.length > 0 && onDispatch && (
        <View style={styles.surfacesContainer}>
          {surfaces.map((surface) => (
            <View
              key={surface.surfaceId}
              style={styles.surfaceWrapper}>
              <A2UISurface
                surface={surface}
                disabled={disabled || isPending}
                onDispatch={onDispatch}
              />
            </View>
          ))}
        </View>
      )}

      {/* Optional A2UI non-fatal transport error */}
      {a2uiError && (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.a2uiError}
          accessibilityLiveRegion="polite">
          {a2uiError}
        </ThemedText>
      )}
    </Animated.View>
  );
}

function IconButton({
  label,
  color,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  color: string;
  icon: Extract<AppIconName, 'copy' | 'edit' | 'close' | 'confirm'>;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: pressed ? theme.backgroundElement : 'transparent',
          opacity: disabled ? 0.38 : pressed ? 0.72 : 1,
        },
      ]}>
      <AppIcon name={icon} size={19} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    marginVertical: Spacing.xs,
  },
  userContainerEditing: {
    width: '85%',
  },
  userBubble: {
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userEditBubble: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  userEditInput: {
    minHeight: 48,
    maxHeight: 132,
    paddingHorizontal: 0,
    paddingVertical: Spacing.sm,
    borderWidth: 0,
    borderColor: 'transparent',
    outlineColor: 'transparent',
    outlineWidth: 0,
    boxShadow: 'none',
    fontSize: 15,
    lineHeight: 22,
  },
  userActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: Spacing.xs,
  },
  editConfirmationRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
    width: '100%',
    marginVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  assistantHeaderPending: {
    alignItems: 'center',
    maxWidth: 520,
  },
  assistantLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 22,
  },
  surfacesContainer: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  surfaceWrapper: {
    width: '100%',
  },
  a2uiError: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.xs,
  },
});

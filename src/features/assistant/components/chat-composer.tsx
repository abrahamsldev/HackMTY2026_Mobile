import React, { useState } from 'react';
import {
  Animated,
  Easing,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInputContentSizeChangeEventData,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Pressable, TextInput, type TextInputHandle } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

const MIN_INPUT_HEIGHT = 48;
const MAX_INPUT_HEIGHT = 132;

/** Mic button contract — recording itself lives in useVoiceFlow, owned once by AssistantWorkspace. */
export type VoiceControl = {
  isRecording: boolean;
  isBusy: boolean;
  onPress: () => void;
};

export type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  voice?: VoiceControl;
  onOpenQuestionBank?: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  mode?: 'welcome' | 'conversation';
  inputRef?: React.RefObject<TextInputHandle | null>;
};

function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M5 12h13M13 6l6 6-6 6"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

function MicrophoneIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" fill="none" stroke={color} strokeWidth={2} />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2} />
    </Svg>
  );
}

export function ChatComposer({
  value,
  onChangeText,
  onSubmit,
  voice,
  onOpenQuestionBank,
  disabled = false,
  loading = false,
  placeholder = 'Pregúntame sobre tus finanzas...',
  mode = 'welcome',
  inputRef,
}: ChatComposerProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const [inputHeight] = useState(() => new Animated.Value(MIN_INPUT_HEIGHT));

  const canSubmit = Boolean(value.trim()) && !disabled && !loading;
  const canRecord = Boolean(voice) && !disabled && !loading && !voice?.isBusy;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(value.trim());
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (Platform.OS === 'web') {
      const webEvent = e.nativeEvent as unknown as KeyboardEvent;
      if (webEvent.key === 'Enter' && !webEvent.shiftKey) {
        e.preventDefault?.();
        handleSubmit();
      }
    }
  }

  function handleContentSizeChange(
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) {
    const nextHeight = Math.min(
      MAX_INPUT_HEIGHT,
      Math.max(MIN_INPUT_HEIGHT, Math.ceil(event.nativeEvent.contentSize.height)),
    );

    inputHeight.stopAnimation();
    if (settings.reduceMotion) {
      inputHeight.setValue(nextHeight);
      return;
    }

    Animated.timing(inputHeight, {
      toValue: nextHeight,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }

  const isWelcome = mode === 'welcome';

  return (
    <View
      style={[
        styles.wrapper,
        isWelcome ? styles.wrapperWelcome : styles.wrapperConversation,
      ]}>
      {/* Optional quick question bank helper pill */}
      {onOpenQuestionBank && (
        <View style={styles.topBar}>
          <Pressable
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityLabel="Abrir banco de preguntas"
            accessibilityState={{ disabled: disabled || loading }}
            onPress={onOpenQuestionBank}
            style={({ pressed }) => [
              styles.questionBankPill,
              {
                backgroundColor: theme.background,
                borderColor: theme.accent,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed && !settings.reduceMotion ? 0.98 : 1 }],
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.accent, fontSize: 12 }}>
              Preguntas sugeridas
            </ThemedText>
          </Pressable>
        </View>
      )}

      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
          },
          isWelcome && styles.containerWelcome,
        ]}>
        <Animated.View style={[styles.inputShell, { height: inputHeight }]}>
          {!value && (
            <View pointerEvents="none" style={styles.placeholderContainer}>
              <ThemedText style={[styles.placeholderText, { color: theme.textSecondary }]}>
                {placeholder}
              </ThemedText>
            </View>
          )}
          <TextInput
            ref={inputRef}
            nativeID="assistant-query-input"
            accessibilityLabel="Escribe tu consulta financiera"
            selectionColor={theme.accent}
            value={value}
            onChangeText={onChangeText}
            onContentSizeChange={handleContentSizeChange}
            onKeyPress={handleKeyPress}
            multiline
            scrollEnabled
            maxLength={4000}
            editable={!disabled && !loading}
            textAlignVertical="center"
            returnKeyType={Platform.OS === 'web' ? 'default' : 'send'}
            onSubmitEditing={() => {
              if (Platform.OS !== 'web') {
                handleSubmit();
              }
            }}
            style={[
              styles.input,
              {
                color: theme.text,
              },
            ]}
          />
        </Animated.View>

        {voice && (
          <Pressable
            disabled={!canRecord && !voice.isRecording}
            accessibilityRole="button"
            accessibilityLabel={voice.isRecording ? 'Detener grabación' : 'Grabar consulta de voz'}
            accessibilityHint={voice.isRecording ? 'Toca para detener y transcribir' : 'Toca para comenzar a grabar'}
            accessibilityState={{ disabled: !canRecord && !voice.isRecording, busy: voice.isBusy }}
            onPress={voice.onPress}
            style={({ pressed }) => [
              styles.audioButton,
              {
                backgroundColor: voice.isRecording ? theme.accent : theme.backgroundSelected,
                borderColor: voice.isRecording ? theme.accent : 'transparent',
                opacity: pressed ? 0.82 : 1,
              },
            ]}>
            <MicrophoneIcon color={voice.isRecording ? theme.onAccent : theme.accent} />
          </Pressable>
        )}
        <Pressable
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={loading ? 'Enviando consulta' : 'Enviar consulta'}
          accessibilityState={{ disabled: !canSubmit, busy: loading }}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: theme.accent,
              opacity: canSubmit ? (pressed ? 0.82 : 1) : 0.52,
              transform: [{ scale: pressed && canSubmit && !settings.reduceMotion ? 0.94 : 1 }],
            },
          ]}>
          <SendIcon color={theme.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  wrapperWelcome: {
    maxWidth: 720,
  },
  wrapperConversation: {
    maxWidth: 800,
    paddingTop: Spacing.one,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  questionBankPill: {
    borderRadius: 14,
    borderWidth: 2,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    gap: Spacing.two,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: '#5A0A18',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0 10px 28px rgba(90, 10, 24, 0.12)' },
    }),
  },
  containerWelcome: {
    minHeight: 68,
    borderRadius: 28,
    paddingVertical: 6,
  },
  inputShell: {
    flex: 1,
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    position: 'relative',
  },
  placeholderContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    zIndex: 0,
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    paddingVertical: 11,
    paddingHorizontal: 0,
    fontSize: 16,
    lineHeight: 22,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    outlineColor: 'transparent',
    outlineWidth: 0,
    boxShadow: 'none',
    zIndex: 1,
  },
  sendButton: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  audioButton: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
  },
});

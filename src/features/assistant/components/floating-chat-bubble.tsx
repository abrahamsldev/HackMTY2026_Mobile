import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { type TextInputHandle } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import { ChatComposer } from './chat-composer';

function ChatBubbleIcon({ color, size = 28 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3C6.477 3 2 6.91 2 11.73c0 2.76 1.48 5.22 3.77 6.81-.17 1.25-.66 2.89-1.9 4.15 0 0 2.87-.27 5.09-1.77.98.3 2.01.47 3.04.47 5.523 0 10-3.91 10-8.73S17.523 3 12 3z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type FloatingChatBubbleProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  inputRef?: React.RefObject<TextInputHandle | null>;
  bottomInset?: number;
};

export function FloatingChatBubble({
  value,
  onChangeText,
  onSubmit,
  disabled = false,
  loading = false,
  inputRef,
  bottomInset = 24,
}: FloatingChatBubbleProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();

  const [isOpen, setIsOpen] = useState(false);
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [bubbleScale] = useState(() => new Animated.Value(0.1));
  const [bubbleOpacity] = useState(() => new Animated.Value(0));

  // Animación ligera de flotación continua
  useEffect(() => {
    if (settings.reduceMotion) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 5,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [floatAnim, settings.reduceMotion]);

  function openBubble() {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(bubbleScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      inputRef?.current?.focus();
    });
  }

  function closeBubble() {
    Animated.parallel([
      Animated.timing(bubbleScale, {
        toValue: 0.1,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  }

  function handleSubmit(text: string) {
    closeBubble();
    onSubmit(text);
  }

  return (
    <>
      {/* Botón flotante centrado en medio con movimiento ligero */}
      {!isOpen && (
        <View
          style={[
            styles.floatingButtonContainer,
            { bottom: Math.max(bottomInset, 20) },
          ]}
          pointerEvents="box-none">
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir barra de consulta"
              disabled={disabled}
              onPress={openBubble}
              style={({ pressed }) => [
                styles.floatingButton,
                {
                  backgroundColor: theme.accent,
                  borderColor: theme.border,
                  opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}>
              <ChatBubbleIcon color="#FFFFFF" size={28} />
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Modal / Burbuja de chat emergente desde el centro */}
      {isOpen && (
        <View style={styles.modalOverlay} pointerEvents="box-none">
          {/* Fondo para cerrar al tocar fuera */}
          <Pressable
            style={styles.backdrop}
            accessibilityLabel="Cerrar barra de consulta"
            onPress={closeBubble}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            style={styles.bubbleKeyboardWrapper}
            pointerEvents="box-none">
            <Animated.View
              style={[
                styles.bubbleCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.accent,
                  opacity: bubbleOpacity,
                  transform: [{ scale: bubbleScale }],
                  bottom: Math.max(bottomInset, 20),
                },
              ]}>
              {/* Cabecera de la burbuja */}
              <View style={styles.bubbleHeader}>
                <ThemedText type="smallBold" style={styles.bubbleTitle}>
                  Nueva consulta
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={closeBubble}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <CloseIcon color={theme.textSecondary} />
                </Pressable>
              </View>

              {/* Barra de entrada de consulta */}
              <ChatComposer
                inputRef={inputRef}
                value={value}
                onChangeText={onChangeText}
                onSubmit={handleSubmit}
                loading={loading}
                disabled={disabled}
                mode="conversation"
                placeholder="Escribe tu nueva pregunta..."
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  floatingButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.28)',
      },
    }),
  },
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10000,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bubbleKeyboardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  bubbleCard: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 24,
    borderWidth: 2,
    padding: Spacing.three,
    gap: Spacing.two,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
      },
    }),
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  bubbleTitle: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

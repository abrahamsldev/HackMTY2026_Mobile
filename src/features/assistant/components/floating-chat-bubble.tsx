import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { Pressable, type TextInputHandle } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { AppIcon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import { AgentStatusLabel } from './assistant-typing-indicator';
import { BanorteLoaderIcon } from './banorte-loader-icon';
import { ChatComposer, type VoiceControl } from './chat-composer';
import type { AgentStatusId } from '../agent-status';

export type FloatingChatBubbleProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  voice?: VoiceControl;
  disabled?: boolean;
  loading?: boolean;
  inputRef?: React.RefObject<TextInputHandle | null>;
  bottomInset?: number;
  onRevealReady?: () => void;
  /** Coarse phase reported by the backend for the running turn. */
  status?: AgentStatusId | null;
};

type ButtonStage = 'idle' | 'traveling_up' | 'thinking' | 'checkmark' | 'traveling_down';

const ORB_STATUS_WIDTH = 280;

export function FloatingChatBubble({
  value,
  onChangeText,
  onSubmit,
  voice,
  disabled = false,
  loading = false,
  inputRef,
  bottomInset = 24,
  onRevealReady,
  status,
}: FloatingChatBubbleProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const { height: windowHeight } = useWindowDimensions();

  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<ButtonStage>(() => (loading ? 'thinking' : 'idle'));

  // Valores animados usando useState conforme a React 19
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [travelAnim] = useState(() => new Animated.Value(loading ? 1 : 0));
  const [bubbleScale] = useState(() => new Animated.Value(0.1));

  // 1. Animación ligera de flotación continua mientras está en reposo abajo
  useEffect(() => {
    if (stage !== 'idle' || settings.reduceMotion) {
      floatAnim.setValue(0);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 5,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [floatAnim, settings.reduceMotion, stage]);

  const wasLoadingRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionRef = React.useRef(0);

  // 2. Transición cuando cambia el estado `loading`:
  // Viaja al centro -> rotación cada .8s -> palomita verde -> viaja abajo
  useEffect(() => {
    const transition = ++transitionRef.current;

    if (loading) {
      wasLoadingRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setTimeout(() => {
        setIsOpen(false);
        setStage('traveling_up');
      }, 0);

      if (!settings.reduceMotion) {
        Animated.spring(travelAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: Platform.OS !== 'web',
        }).start(({ finished }) => {
          if (finished && transitionRef.current === transition) setStage('thinking');
        });
      } else {
        travelAnim.setValue(1);
        setTimeout(() => {
          if (transitionRef.current === transition) setStage('thinking');
        }, 0);
      }
    } else if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      travelAnim.stopAnimation();
      travelAnim.setValue(1);

      // Llegó la respuesta: transformar en palomita verde en el centro
      // (BanorteLoaderIcon animates its own checkmark spring from the stage prop)
      setTimeout(() => {
        if (transitionRef.current === transition) setStage('checkmark');
      }, 0);

      // Mostrar la palomita ~650ms, luego transformarse en logo y bajar
      timerRef.current = setTimeout(() => {
        if (transitionRef.current !== transition) return;
        timerRef.current = null;
        setStage('traveling_down');

        if (!settings.reduceMotion) {
          Animated.spring(travelAnim, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: Platform.OS !== 'web',
          }).start(({ finished }) => {
            if (finished && transitionRef.current === transition) {
              setStage('idle');
              onRevealReady?.();
            }
          });
        } else {
          travelAnim.setValue(0);
          setStage('idle');
          onRevealReady?.();
        }
      }, 650);
    }

    return () => {
      travelAnim.stopAnimation();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, settings.reduceMotion, travelAnim, onRevealReady]);

  function openBubble() {
    if (stage !== 'idle') return;
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(bubbleScale, {
        toValue: 1,
        friction: 7,
        tension: 60,
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
    ]).start(() => {
      setIsOpen(false);
    });
  }

  function handleSubmit(text: string) {
    closeBubble();
    onSubmit(text);
  }

  const bottomOffset = Math.max(bottomInset, 24);
  // Distancia para viajar exactamente al centro de la pantalla
  const travelDistance = Math.max(140, windowHeight / 2 - bottomOffset - 32);

  const translateY = Animated.add(
    floatAnim,
    travelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -travelDistance],
    }),
  );

  const isAtCenter = stage === 'thinking' || stage === 'checkmark' || stage === 'traveling_up';
  const loaderStage = stage === 'thinking' || stage === 'checkmark' ? stage : 'idle';
  // Only while the turn is actually running: the checkmark and the trip back
  // down mean it is over, and nothing should still claim to be working.
  const showStatus = loading && (stage === 'thinking' || stage === 'traveling_up');

  return (
    <>
      {/* Botón flotante / Hero logo con movimiento, viaje al centro y spinner rotatorio */}
      {!isOpen && (
        <View
          style={[styles.floatingButtonContainer, { bottom: bottomOffset }]}
          pointerEvents="box-none">
          <Animated.View style={[styles.travelWrapper, { transform: [{ translateY }] }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isAtCenter ? 'Procesando consulta...' : 'Abrir barra de consulta'}
              disabled={disabled || isAtCenter}
              onPress={openBubble}
              style={({ pressed }) => [
                styles.floatingButton,
                {
                  backgroundColor: stage === 'checkmark' ? theme.success : '#FFFFFF',
                  borderColor: stage === 'checkmark' ? theme.success : theme.accent,
                  opacity: disabled && !isAtCenter ? 0.6 : pressed && !isAtCenter ? 0.88 : 1,
                  transform: [{ scale: pressed && !isAtCenter ? 0.94 : 1 }],
                },
              ]}>
              <BanorteLoaderIcon stage={loaderStage} />
            </Pressable>
            {showStatus && (
              <View style={styles.orbStatus} pointerEvents="none">
                <AgentStatusLabel status={status} centered />
              </View>
            )}
          </Animated.View>
        </View>
      )}

      {/* Modal / Burbuja de chat emergente desde el centro */}
      {isOpen && !voice?.isRecording && !voice?.isBusy && !loading && (
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
                styles.bubbleCardWrapper,
                {
                  // Scale alone carries the entry. Animating opacity here would
                  // silently disable the liquid-glass effect below — an opacity
                  // of 0 on a GlassView or any ancestor stops it rendering at
                  // all — and the spring already reads as an appear.
                  transform: [{ scale: bubbleScale }],
                  bottom: bottomOffset,
                },
              ]}>
              <GlassSurface
                style={[styles.bubbleCard, { borderColor: theme.accent }]}
                fallbackColor={theme.backgroundElement}>
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
                  <AppIcon name="close" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>

              {/* Barra de entrada de consulta */}
              <ChatComposer
                inputRef={inputRef}
                value={value}
                onChangeText={onChangeText}
                onSubmit={handleSubmit}
                voice={voice}
                loading={loading}
                disabled={disabled}
                mode="conversation"
                placeholder="Escribe tu nueva pregunta..."
              />
              </GlassSurface>
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
  travelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
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
    paddingHorizontal: Spacing.md,
  },
  // Split in two: the wrapper animates and casts the shadow, the card is the
  // surface itself — which may be a GlassView, and a glass surface must not
  // have a shadow painted on the same node it blurs through.
  bubbleCardWrapper: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 24,
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
  bubbleCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  bubbleTitle: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
  // No fixed 32-point box: the accessible Pressable raises this to the current
  // minimum target size (48, or 64 with large targets).
  closeButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Absolutely placed under the 64-point button so the label can never move
  // the orb: its resting position and its travel to the centre stay exact.
  orbStatus: {
    position: 'absolute',
    top: 64 + Spacing.sm,
    left: (64 - ORB_STATUS_WIDTH) / 2,
    width: ORB_STATUS_WIDTH,
    alignItems: 'center',
  },
});

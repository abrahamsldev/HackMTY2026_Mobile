import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

import { AssistantStatusIcon } from './assistant-status-icon';

type StagePhase = 'IDLE' | 'COLLAPSING' | 'SPINNER' | 'CHECKMARK' | 'REVEALING';

export type MorphingStageProps = {
  isPending: boolean;
  hasContent: boolean;
  error?: string | null;
  children: React.ReactNode;
  onCancel?: () => void;
};

export function MorphingStage({
  isPending,
  hasContent,
  error,
  children,
}: MorphingStageProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();

  const [phase, setPhase] = useState<StagePhase>(() =>
    isPending ? 'SPINNER' : 'IDLE',
  );

  // Guardar el contenido previo para animar su colapso hacia adentro
  const [prevChildren, setPrevChildren] = useState(children);
  const [cachedPreviousContent, setCachedPreviousContent] = useState<React.ReactNode>(children);

  if (children !== prevChildren) {
    setPrevChildren(children);
    if (!isPending && phase === 'IDLE') {
      setCachedPreviousContent(children);
    }
  }

  // Valores animados usando useState conforme a React 19
  const [collapseScale] = useState(() => new Animated.Value(1));
  const [collapseOpacity] = useState(() => new Animated.Value(1));
  const [spinnerScale] = useState(() => new Animated.Value(1));
  const [checkmarkScale] = useState(() => new Animated.Value(0.7));
  const [revealScale] = useState(() => new Animated.Value(0.1));
  const [revealOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let checkmarkTimer: ReturnType<typeof setTimeout> | undefined;

    if (isPending) {
      if (hasContent && !settings.reduceMotion) {
        // Animación de burbuja hacia adentro:
        // 1. Ligera expansión elástica de anticipación
        // 2. Colapso hacia el centro convirtiéndose en un círculo pequeño
        collapseScale.setValue(1);
        collapseOpacity.setValue(1);
        const timer = setTimeout(() => setPhase('COLLAPSING'), 0);

        Animated.sequence([
          // Ligero pulso de burbuja
          Animated.timing(collapseScale, {
            toValue: 1.03,
            duration: 70,
            easing: Easing.out(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
          // Implosión hacia el centro como burbuja hacia adentro
          Animated.parallel([
            Animated.timing(collapseScale, {
              toValue: 0.06,
              duration: 300,
              easing: Easing.bezier(0.25, 1, 0.5, 1),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(collapseOpacity, {
              toValue: 0.2,
              duration: 300,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ]).start(() => {
          // El círculo pequeño se convierte en el spinner
          spinnerScale.setValue(0.5);
          setPhase('SPINNER');
          Animated.spring(spinnerScale, {
            toValue: 1,
            friction: 6,
            tension: 70,
            useNativeDriver: Platform.OS !== 'web',
          }).start();
        });

        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setPhase('SPINNER'), 0);
        return () => clearTimeout(timer);
      }
    } else {
      // Llegó la respuesta: transformar spinner en palomita dentro de círculo verde
      if (!error && hasContent) {
        const timer = setTimeout(() => {
          setPhase('CHECKMARK');
          checkmarkScale.setValue(0.6);

          if (!settings.reduceMotion) {
            Animated.spring(checkmarkScale, {
              toValue: 1,
              friction: 5,
              tension: 80,
              useNativeDriver: Platform.OS !== 'web',
            }).start();
          } else {
            checkmarkScale.setValue(1);
          }
        }, 0);

        // Mantener la palomita verde por ~650ms y luego expandir para mostrar el nuevo componente
        checkmarkTimer = setTimeout(() => {
          setPhase('REVEALING');
          revealScale.setValue(settings.reduceMotion ? 1 : 0.2);
          revealOpacity.setValue(settings.reduceMotion ? 1 : 0);

          if (!settings.reduceMotion) {
            Animated.parallel([
              Animated.spring(revealScale, {
                toValue: 1,
                friction: 7,
                tension: 60,
                useNativeDriver: Platform.OS !== 'web',
              }),
              Animated.timing(revealOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: Platform.OS !== 'web',
              }),
            ]).start(() => {
              setPhase('IDLE');
            });
          } else {
            setPhase('IDLE');
          }
        }, 650);

        return () => {
          clearTimeout(timer);
          if (checkmarkTimer) clearTimeout(checkmarkTimer);
        };
      } else {
        const timer = setTimeout(() => setPhase('IDLE'), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [
    isPending,
    hasContent,
    error,
    settings.reduceMotion,
    collapseScale,
    collapseOpacity,
    spinnerScale,
    checkmarkScale,
    revealScale,
    revealOpacity,
  ]);

  return (
    <View style={styles.stageContainer}>
      {/* 1. Animación de burbuja hacia adentro: el componente previo se colapsa a círculo pequeño */}
      {phase === 'COLLAPSING' && (
        <Animated.View
          style={[
            styles.collapsingWrapper,
            {
              opacity: collapseOpacity,
              transform: [{ scale: collapseScale }],
            },
          ]}>
          <View
            style={[
              styles.bubbleFrame,
              {
                borderColor: theme.accent,
                backgroundColor: theme.backgroundElement,
              },
            ]}>
            {cachedPreviousContent ?? children}
          </View>
        </Animated.View>
      )}

      {/* 2. Fase de Spinner: el círculo pequeño se transforma en el spinner */}
      {phase === 'SPINNER' && (
        <View
          style={styles.centerStage}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Preparando tu respuesta">
          <Animated.View
            style={[
              styles.spinnerSticker,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.accent,
                transform: [{ scale: spinnerScale }],
              },
            ]}>
            <AssistantStatusIcon status="thinking" size={44} />
          </Animated.View>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.statusLabel}>
            Preparando tu respuesta…
          </ThemedText>
        </View>
      )}

      {/* 3. Fase de Palomita verde: el spinner se transforma en una palomita dentro de un círculo verde */}
      {phase === 'CHECKMARK' && (
        <View
          style={styles.centerStage}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Respuesta lista">
          <Animated.View
            style={[
              styles.checkmarkSticker,
              {
                backgroundColor: theme.success,
                transform: [{ scale: checkmarkScale }],
              },
            ]}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
              <Path
                d="M7.5 12.5l3 3 6.5-7"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
          <ThemedText type="smallBold" style={[styles.statusLabel, { color: theme.success }]}>
            ¡Respuesta lista!
          </ThemedText>
        </View>
      )}

      {/* 4. Fase de Revelado: el círculo verde se expande y muestra el nuevo componente */}
      {phase === 'REVEALING' && (
        <Animated.View
          style={[
            styles.revealingWrapper,
            {
              opacity: revealOpacity,
              transform: [{ scale: revealScale }],
            },
          ]}>
          {children}
        </Animated.View>
      )}

      {/* 5. Fase Normal / IDLE: se muestra el componente activo */}
      {phase === 'IDLE' && (
        <View style={styles.idleWrapper}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  collapsingWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleFrame: {
    width: '100%',
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#208AEF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 24px rgba(32, 138, 239, 0.3)',
      },
    }),
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  spinnerSticker: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
      },
    }),
  },
  checkmarkSticker: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
      },
    }),
  },
  statusLabel: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  revealingWrapper: {
    width: '100%',
  },
  idleWrapper: {
    width: '100%',
  },
});

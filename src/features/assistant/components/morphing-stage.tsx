import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

type StagePhase = 'IDLE' | 'COLLAPSING' | 'WAITING' | 'REVEALING';

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
    isPending ? 'WAITING' : 'IDLE',
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
  const [revealScale] = useState(() => new Animated.Value(0.1));
  const [revealOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (isPending) {
      if (hasContent && !settings.reduceMotion) {
        // Animación de burbuja hacia adentro:
        // 1. Ligera expansión elástica de anticipación
        // 2. Colapso hacia el centro convirtiéndose en un círculo pequeño que desaparece
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
              toValue: 0.05,
              duration: 280,
              easing: Easing.bezier(0.25, 1, 0.5, 1),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(collapseOpacity, {
              toValue: 0,
              duration: 280,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ]).start(() => {
          // El componente previo se borra y deja el centro despejado para el logo giratorio
          setPhase('WAITING');
        });

        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setPhase('WAITING'), 0);
        return () => clearTimeout(timer);
      }
    } else {
      // Llegó la respuesta: esperar a que la palomita verde termine para revelar el nuevo componente
      if (!error && hasContent) {
        const timer = setTimeout(() => {
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
        }, 850); // Sincronizado con la transición de la palomita y el viaje del logo hacia abajo

        return () => clearTimeout(timer);
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
    revealScale,
    revealOpacity,
  ]);

  return (
    <View style={styles.stageContainer}>
      {/* 1. Animación de burbuja hacia adentro: el componente previo se colapsa a círculo pequeño y desaparece */}
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

      {/* 2. Mientras está esperando: el centro lo ocupa el logo hero giratorio */}
      {phase === 'WAITING' && (
        <View style={styles.waitingSpacer} />
      )}

      {/* 3. Fase de Revelado: el nuevo componente se expande hacia afuera */}
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

      {/* 4. Fase Normal / IDLE: se muestra el componente activo */}
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
  waitingSpacer: {
    width: '100%',
    minHeight: 160,
  },
  revealingWrapper: {
    width: '100%',
  },
  idleWrapper: {
    width: '100%',
  },
});

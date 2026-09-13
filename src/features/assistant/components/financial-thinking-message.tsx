import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';

export const FINANCIAL_WAITING_MESSAGE_BANK = [
  {
    stage: 'review',
    messages: [
      'Revisando tus movimientos…',
      'Consultando la información de tus cuentas…',
      'Reuniendo los datos de tu panorama financiero…',
      'Leyendo las señales de tus finanzas…',
    ],
  },
  {
    stage: 'analysis',
    messages: [
      'Analizando ingresos y gastos…',
      'Comparando saldos y tendencias…',
      'Buscando patrones en tus movimientos…',
      'Organizando tus datos por relevancia…',
    ],
  },
  {
    stage: 'calculation',
    messages: [
      'Calculando cifras y escenarios…',
      'Comprobando que los totales coincidan…',
      'Estimando el impacto en tu presupuesto…',
      'Afinando los números de tu respuesta…',
    ],
  },
  {
    stage: 'response',
    messages: [
      'Preparando un panorama claro…',
      'Ordenando los hallazgos más importantes…',
      'Convirtiendo los números en una respuesta útil…',
      'Dando los últimos detalles a tu respuesta…',
    ],
  },
] as const;

export const FINANCIAL_WAITING_MESSAGES = FINANCIAL_WAITING_MESSAGE_BANK.flatMap(
  ({ messages }) => messages,
);

const MESSAGE_HOLD_MS = 2_600;
const FADE_DURATION_MS = 180;
const LAST_STAGE_INDEX = FINANCIAL_WAITING_MESSAGE_BANK.length - 1;

function randomMessage(stageIndex: number, previous?: string): string {
  const messages: readonly string[] = FINANCIAL_WAITING_MESSAGE_BANK[stageIndex].messages;
  let choice = messages[Math.floor(Math.random() * messages.length)];
  if (choice === previous && messages.length > 1) {
    choice = messages[(messages.indexOf(choice) + 1) % messages.length];
  }
  return choice;
}

export function FinancialThinkingMessage() {
  const { settings } = useAccessibility();
  const [messageState, setMessageState] = useState(() => ({
    stageIndex: 0,
    message: randomMessage(0),
  }));
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (settings.reduceMotion) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let fadeOut: Animated.CompositeAnimation | undefined;
    let fadeIn: Animated.CompositeAnimation | undefined;
    let cancelled = false;

    const scheduleNext = () => {
      timer = setTimeout(() => {
        fadeOut = Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        });
        fadeOut.start(({ finished }) => {
          if (!finished || cancelled) return;
          setMessageState((current) => {
            const stageIndex = Math.min(current.stageIndex + 1, LAST_STAGE_INDEX);
            return {
              stageIndex,
              message: randomMessage(stageIndex, current.message),
            };
          });
          opacity.setValue(0);
          fadeIn = Animated.timing(opacity, {
            toValue: 1,
            duration: FADE_DURATION_MS,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          });
          fadeIn.start(({ finished: didFadeIn }) => {
            if (didFadeIn && !cancelled) scheduleNext();
          });
        });
      }, MESSAGE_HOLD_MS);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      fadeOut?.stop();
      fadeIn?.stop();
    };
  }, [opacity, settings.reduceMotion]);

  return (
    <Animated.View style={{ opacity }}>
      <ThemedText
        accessibilityLiveRegion="polite"
        type="small"
        themeColor="textSecondary"
        style={styles.message}>
        {messageState.message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
});

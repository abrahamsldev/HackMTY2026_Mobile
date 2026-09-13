import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Text } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { ActionButton, Card, StatusBadge } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { type A2UISurfaceState } from '@/features/a2ui';
import { useTheme } from '@/hooks/use-theme';
import type { AgentReply } from '../agent';

export type A2UIResponseViewerProps = {
  reply?: AgentReply | null;
  surfaces?: readonly A2UISurfaceState[];
};

export function A2UIResponseViewer({
  reply,
  surfaces = [],
}: A2UIResponseViewerProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  // Determinar la carga JSON completa a visualizar
  let jsonData: unknown;
  let statusLabel: string;
  let statusTone: 'success' | 'warning' | 'info' | 'neutral' = 'neutral';

  if (reply?.messages && reply.messages.length > 0) {
    jsonData = reply.messages;
    statusLabel = `A2UI: ${reply.messages.length} mensaje(s)`;
    statusTone = 'success';
  } else if (surfaces && surfaces.length > 0) {
    jsonData = surfaces.map((s) => ({
      surfaceId: s.surfaceId,
      catalogId: s.catalogId,
      theme: s.theme,
      dataModel: s.dataModel,
      componentsCount: s.components.size,
    }));
    statusLabel = `A2UI: ${surfaces.length} superficie(s)`;
    statusTone = 'success';
  } else if (reply?.a2uiError) {
    jsonData = {
      error: 'A2UI_VALIDATION_ERROR',
      detail: reply.a2uiError,
      message: reply.message,
    };
    statusLabel = 'Error en A2UI';
    statusTone = 'warning';
  } else if (reply) {
    jsonData = {
      status: 'sin_componentes_a2ui',
      message: reply.message,
      a2ui: null,
    };
    statusLabel = 'Solo texto (Sin A2UI)';
    statusTone = 'info';
  } else {
    jsonData = {
      status: 'esperando_consulta',
      a2ui: null,
      info: 'Envía una consulta arriba para visualizar el JSON completo de A2UI recibido.',
    };
    statusLabel = 'A2UI en espera';
    statusTone = 'neutral';
  }

  const jsonString = JSON.stringify(jsonData, null, 2);

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(jsonString);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Fallback para entornos web si fuera necesario
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      }
    }
  }

  return (
    <View style={styles.container}>
      <Card variant="outlined" padding="md">
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <ThemedText type="smallBold" style={styles.title}>
              RESPUESTA A2UI (JSON)
            </ThemedText>
            <StatusBadge label={statusLabel} tone={statusTone} size="sm" />
          </View>
          <ActionButton
            label={copied ? '✓ Copiado' : 'Copiar JSON'}
            variant={copied ? 'primary' : 'outline'}
            size="sm"
            onPress={() => { void handleCopy(); }}
          />
        </View>

        <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text selectable style={[styles.codeText, { color: theme.text }]}>
            {jsonString}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 13,
    letterSpacing: 0.8,
  },
  codeBox: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
  },
});

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GenerativeRenderer } from '@/components/generative';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import {
  exampleFinancialInterface,
  type UIActionEvent,
} from '@/generative-ui';

export default function HomeScreen() {
  const [lastEvent, setLastEvent] = useState<UIActionEvent | null>(null);

  const handleAction = (action: UIActionEvent) => {
    // Structured event received from generative component
    // Ready to be forwarded to MCP Agent / LLM
    setLastEvent(action);
  };

  return (
    <View style={styles.container}>
      {lastEvent && (
        <View style={styles.eventBannerContainer}>
          <Card variant="highlighted" padding="sm">
            <ThemedText type="smallBold" style={styles.eventHeader}>
              Evento UI capturado para el Agente / MCP:
            </ThemedText>
            <ThemedText type="code">
              {JSON.stringify(lastEvent, null, 2)}
            </ThemedText>
          </Card>
        </View>
      )}
      <GenerativeRenderer
        node={exampleFinancialInterface}
        onAction={handleAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  eventBannerContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  eventHeader: {
    marginBottom: Spacing.half,
    color: '#208AEF',
  },
});

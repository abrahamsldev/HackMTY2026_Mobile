import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

export function AssistantFallback({ message, onRetry, onEdit }: {
  message: string;
  onRetry: () => void;
  onEdit: () => void;
}) {
  return (
    <Card variant="outlined">
      <View style={{ gap: Spacing.md }}>
        <View accessibilityLiveRegion="polite" style={{ gap: Spacing.sm }}>
          <ThemedText accessibilityRole="header" type="smallBold">No pudimos completar tu respuesta</ThemedText>
          <ThemedText themeColor="textSecondary">{message}</ThemedText>
          <ThemedText type="small">Puedes volver a intentarlo o ajustar tu pregunta.</ThemedText>
        </View>
        <ActionButton label="Reintentar" fullWidth onPress={onRetry} />
        <ActionButton label="Editar consulta" variant="outline" fullWidth onPress={onEdit} />
      </View>
    </Card>
  );
}

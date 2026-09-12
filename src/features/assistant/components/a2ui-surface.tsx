import { useState } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { A2UIRenderer, type A2UIAction, type A2UISurfaceState } from '@/features/a2ui';

export function A2UISurface({
  surface,
  disabled,
  onDispatch,
}: {
  surface: A2UISurfaceState;
  disabled: boolean;
  onDispatch: (event: A2UIAction) => void | Promise<void>;
}) {
  const [error, setError] = useState(false);
  return (
    <View>
      <A2UIRenderer
        surface={surface}
        disabled={disabled}
        onAction={(action) => {
          setError(false);
          return onDispatch(action);
        }}
        onError={() => setError(true)}
      />
      {error && (
        <ThemedText accessibilityRole="alert">
          No se pudo enviar la acción de la interfaz.
        </ThemedText>
      )}
    </View>
  );
}

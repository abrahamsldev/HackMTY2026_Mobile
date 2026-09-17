import { useState } from 'react';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { A2UIRenderer, type A2UIAction, type A2UIActionOrigin, type A2UISurfaceState } from '@/features/a2ui';
import { useMotion } from '@/hooks/use-motion';

export function A2UISurface({
  surface,
  disabled,
  onDispatch,
}: {
  surface: A2UISurfaceState;
  disabled: boolean;
  onDispatch: (event: A2UIAction, origin?: A2UIActionOrigin) => void | Promise<void>;
}) {
  const [error, setError] = useState(false);
  const motion = useMotion();

  return (
    <Animated.View
      // A surface is not rendered once: `updateComponents` and `updateDataModel`
      // patch it in place while the user is looking at it. `LinearTransition`
      // makes the surrounding content glide to the new size instead of jumping,
      // and the entry fade keeps a freshly created surface from popping in.
      entering={motion.enabled ? FadeIn.duration(motion.duration.slow) : undefined}
      layout={motion.enabled ? LinearTransition.duration(motion.duration.base) : undefined}>
      <A2UIRenderer
        surface={surface}
        disabled={disabled}
        onAction={(action, origin) => {
          setError(false);
          return onDispatch(action, origin);
        }}
        onError={() => setError(true)}
      />
      {error && (
        <ThemedText accessibilityRole="alert">
          No se pudo enviar la acción de la interfaz.
        </ThemedText>
      )}
    </Animated.View>
  );
}

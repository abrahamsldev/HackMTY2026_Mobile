import { Host } from '@expo/ui';
import type { ComponentProps } from 'react';

import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';

type NativeHostProps = Omit<ComponentProps<typeof Host>, 'colorScheme' | 'seedColor'>;

/**
 * The only way native `@expo/ui` controls enter the app.
 *
 * A bare `Host` renders a SwiftUI / Compose subtree that follows the *device*
 * appearance and the platform's default tint — which is wrong twice here: the
 * app lets a user force light or dark independently of the OS, and its accent
 * changes with the selected palette. Passing both down keeps a native switch or
 * slider inside the same visual system as everything drawn in React Native.
 *
 * What a Host cannot inherit is the app's text scaling, so labels stay outside
 * it, rendered with `ThemedText`.
 */
export function NativeHost({ matchContents = true, ...props }: NativeHostProps) {
  const theme = useTheme();
  const { colorScheme } = useAccessibility();
  return <Host matchContents={matchContents} colorScheme={colorScheme} seedColor={theme.accent} {...props} />;
}

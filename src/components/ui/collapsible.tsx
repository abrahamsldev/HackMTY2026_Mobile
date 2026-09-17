import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { Pressable } from '@/components/accessible-primitives';
import { PropsWithChildren, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { AppIcon } from '@/components/ui/icon';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const { settings } = useAccessibility();

  return (
    <ThemedView>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [styles.heading, pressed && styles.pressedHeading]}
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="backgroundElement" style={styles.button}>
          <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
            <AppIcon name="chevron" size={14} color={theme.text} />
          </View>
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={settings.reduceMotion ? undefined : FadeIn.duration(200)}>
          <ThemedView type="backgroundElement" style={styles.content}>
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  button: {
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    marginTop: Spacing.md,
    borderRadius: Spacing.md,
    marginLeft: Spacing.lg,
    padding: Spacing.lg,
  },
});

import { ActionButton } from '@/components/ui/action-button';
import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';

import type { A2UIButtonComponent } from '../types';

const variantMap = {
  default: 'secondary',
  primary: 'primary',
  borderless: 'outline',
} as const;

export function A2UIButton({
  label,
  variant = 'default',
  disabled,
  onPress,
}: {
  label: string;
  variant?: A2UIButtonComponent['variant'];
  disabled: boolean;
  onPress: () => void;
}) {
  if (variant === 'borderless') {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ padding: 12, opacity: disabled ? 0.5 : 1 }}><ThemedText style={{ textAlign: 'center', fontWeight: '600' }}>{label}</ThemedText></Pressable>;
  }
  return (
    <ActionButton
      label={label}
      variant={variantMap[variant]}
      disabled={disabled}
      fullWidth
      onPress={onPress}
    />
  );
}

import { ActionButton } from '@/components/ui/action-button';

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

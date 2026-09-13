import { useRef } from 'react';
import { View } from 'react-native';

import { ActionButton } from '@/components/ui/action-button';
import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';

import type { A2UIActionOrigin, A2UIButtonComponent } from '../types';

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
  onPress: (origin?: A2UIActionOrigin) => void;
}) {
  const buttonRef = useRef<View>(null);

  function handlePress() {
    let dispatched = false;
    const dispatch = (origin?: A2UIActionOrigin) => {
      if (dispatched) return;
      dispatched = true;
      onPress(origin);
    };
    const fallback = setTimeout(() => dispatch(), 80);

    buttonRef.current?.measureInWindow((x, y, width, height) => {
      clearTimeout(fallback);
      dispatch(
        width > 0 && height > 0
          ? { x, y, width, height }
          : undefined,
      );
    });
  }

  if (variant === 'borderless') {
    return <Pressable ref={buttonRef} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={handlePress} style={{ padding: 12, opacity: disabled ? 0.5 : 1 }}><ThemedText style={{ textAlign: 'center', fontWeight: '600' }}>{label}</ThemedText></Pressable>;
  }
  return (
    <View ref={buttonRef} collapsable={false} style={{ width: '100%' }}>
      <ActionButton
        label={label}
        variant={variantMap[variant]}
        disabled={disabled}
        fullWidth
        onPress={handlePress}
      />
    </View>
  );
}

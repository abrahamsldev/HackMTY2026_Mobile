import { View } from 'react-native';

import { TextBlock } from '@/components/ui/text-block';

import type { A2UIAccessibility, A2UITextComponent } from '../types';

const variantMap = {
  h1: 'title',
  h2: 'subtitle',
  h3: 'subtitle',
  h4: 'body',
  h5: 'body',
  caption: 'caption',
  body: 'body',
} as const;

export function A2UIText({
  value,
  variant = 'body',
  accessibility,
}: {
  value: string;
  variant?: A2UITextComponent['variant'];
  accessibility?: { label?: string; description?: string };
}) {
  const accessible = Boolean(accessibility?.label || accessibility?.description);
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibility?.label}
      accessibilityHint={accessibility?.description}>
      <TextBlock value={value} variant={variantMap[variant]} />
    </View>
  );
}

export type { A2UIAccessibility };

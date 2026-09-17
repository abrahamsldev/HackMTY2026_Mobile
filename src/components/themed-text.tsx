import { Text } from '@/components/accessible-primitives';
import { type TextProps } from 'react-native';

import { ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  // `linkPrimary` is `link` plus the themed underline treatment.
  const scale = Typography[type === 'linkPrimary' ? 'link' : type];

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        scale,
        type === 'linkPrimary' && { color: theme.info, textDecorationLine: 'underline' },
        style,
      ]}
      {...rest}
    />
  );
}

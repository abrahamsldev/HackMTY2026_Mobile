import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

export type StackProps = {
  children?: React.ReactNode;
  direction?: 'row' | 'column';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  wrap?: boolean;
};

const directionMap = {
  row: 'row',
  column: 'column',
} as const;

const alignMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;

const justifyMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const;

const spacingMap = {
  none: 0,
  sm: Spacing.two,
  md: Spacing.three,
  lg: Spacing.four,
  xl: Spacing.five,
} as const;

export function Stack({
  children,
  direction = 'column',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
}: StackProps) {
  return (
    <View
      style={[
        styles.stack,
        {
          flexDirection: directionMap[direction],
          alignItems: alignMap[align],
          justifyContent: justifyMap[justify],
          gap: spacingMap[spacing],
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
  },
});

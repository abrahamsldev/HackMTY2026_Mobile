import React, { useState } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';

export type GridProps = {
  children?: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  mobileColumns?: 1 | 2;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  minItemWidth?: number;
};

const spacingMap = {
  none: 0,
  sm: Spacing.two,
  md: Spacing.three,
  lg: Spacing.four,
} as const;

export function Grid({
  children,
  columns = 2,
  mobileColumns = 1,
  spacing = 'md',
  minItemWidth,
}: GridProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const isMobile = windowWidth < 600;
  const initialCols = isMobile ? mobileColumns : columns;
  const gap = spacingMap[spacing];

  const effectiveWidth = containerWidth > 0 ? containerWidth : windowWidth;

  let effectiveCols = Math.max(1, initialCols);
  if (minItemWidth && minItemWidth > 0 && effectiveWidth > 0) {
    const maxColsByWidth = Math.floor(
      (effectiveWidth + gap) / (minItemWidth + gap),
    );
    effectiveCols = Math.min(effectiveCols, Math.max(1, maxColsByWidth));
  }

  const totalGaps = (effectiveCols - 1) * gap;
  const itemWidth =
    effectiveWidth > totalGaps
      ? Math.floor((effectiveWidth - totalGaps) / effectiveCols)
      : undefined;

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.grid,
        {
          gap,
        },
      ]}>
      {React.Children.map(children, (child, index) => {
        if (child === null || child === undefined || child === false) {
          return null;
        }

        return (
          <View
            key={index}
            style={[
              styles.item,
              itemWidth !== undefined
                ? { width: itemWidth }
                : { flex: 1, minWidth: `${Math.floor(100 / effectiveCols)}%` },
            ]}>
            {child}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
  item: {
    alignSelf: 'stretch',
  },
});

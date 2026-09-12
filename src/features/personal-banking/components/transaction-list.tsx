import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TransactionListProps = {
  title?: string;
  emptyMessage?: string;
  spacing?: 'none' | 'sm' | 'md';
  children?: React.ReactNode;
};

const spacingMap = {
  none: 0,
  sm: Spacing.one,
  md: Spacing.two,
} as const;

export function TransactionList({
  title,
  emptyMessage = 'No hay movimientos recientes',
  spacing = 'sm',
  children,
}: TransactionListProps) {
  const theme = useTheme();

  const childrenArray = React.Children.toArray(children);
  const hasChildren = childrenArray.length > 0;

  return (
    <View style={[styles.wrapper, { gap: spacingMap[spacing] }]}>
      {title ? (
        <View style={styles.titleRow}>
          <ThemedText type="subtitle" style={styles.titleText}>
            {title}
          </ThemedText>
        </View>
      ) : null}

      <Card variant="outlined" padding="md">
        {hasChildren ? (
          <View style={styles.listContainer}>
            {childrenArray.map((child, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.backgroundSelected },
                    ]}
                  />
                )}
                {child}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText type="small" themeColor="textSecondary">
              {emptyMessage}
            </ThemedText>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  titleRow: {
    paddingHorizontal: Spacing.one,
    marginBottom: Spacing.one,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  listContainer: {
    width: '100%',
  },
  separator: {
    height: 1,
    width: '100%',
  },
  emptyContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

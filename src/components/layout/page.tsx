import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PageProps = {
  children?: React.ReactNode;
  scrollable?: boolean;
  safeArea?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'default' | 'muted' | 'surface';
};

const paddingMap = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.lg,
  lg: Spacing.xl,
} as const;

export function Page({
  children,
  scrollable = true,
  safeArea = true,
  padding = 'md',
  background = 'default',
}: PageProps) {
  const theme = useTheme();

  const backgroundColor =
    background === 'muted'
      ? theme.backgroundElement
      : background === 'surface'
        ? theme.backgroundSelected
        : theme.background;

  const contentPadding = paddingMap[padding];

  const content = (
    <View
      style={[
        styles.innerContainer,
        {
          paddingHorizontal: contentPadding,
          paddingTop: contentPadding,
          paddingBottom: contentPadding,
        },
      ]}>
      {children}
    </View>
  );

  const body = scrollable ? (
    <ScrollView
      style={styles.flexOne}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {content}
    </ScrollView>
  ) : (
    content
  );

  if (safeArea) {
    return (
      <SafeAreaView
        // The drawer header already handles the top safe area.
        edges={['bottom', 'left', 'right']}
        style={[styles.container, { backgroundColor }]}>
        {body}
      </SafeAreaView>
    );
  }

  return <View style={[styles.container, { backgroundColor }]}>{body}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
});

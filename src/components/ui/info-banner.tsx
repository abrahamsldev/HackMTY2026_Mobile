import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InfoBannerProps = {
  title?: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
};

export function InfoBanner({
  title,
  message,
  tone = 'info',
}: InfoBannerProps) {
  const theme = useTheme();

  const getToneStyle = () => {
    switch (tone) {
      case 'success':
        return {
          borderColor: '#16A34A',
          badgeText: 'Éxito',
          badgeColor: '#16A34A',
          bgColor: theme.backgroundElement,
        };
      case 'warning':
        return {
          borderColor: '#D97706',
          badgeText: 'Aviso',
          badgeColor: '#D97706',
          bgColor: theme.backgroundElement,
        };
      case 'danger':
        return {
          borderColor: '#DC2626',
          badgeText: 'Alerta',
          badgeColor: '#DC2626',
          bgColor: theme.backgroundElement,
        };
      case 'info':
      default:
        return {
          borderColor: '#0284C7',
          badgeText: 'Información',
          badgeColor: '#0284C7',
          bgColor: theme.backgroundElement,
        };
    }
  };

  const toneConfig = getToneStyle();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title ? `${title}: ` : ''}${message}`}
      style={[
        styles.banner,
        {
          backgroundColor: toneConfig.bgColor,
          borderLeftColor: toneConfig.borderColor,
          borderLeftWidth: 4,
        },
      ]}>
      <View style={styles.content}>
        {title ? (
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.badge,
                { color: toneConfig.badgeColor },
              ]}>
              {`[${toneConfig.badgeText}]`}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>
              {title}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  content: {
    gap: Spacing.half,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  badge: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  message: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
});

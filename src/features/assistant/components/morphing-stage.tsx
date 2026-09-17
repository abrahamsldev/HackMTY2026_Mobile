import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { SurfaceSkeleton } from '@/components/ui/skeleton';
import type { AgentStatusId } from '../agent-status';
import { useMotion } from '@/hooks/use-motion';
import { useTheme } from '@/hooks/use-theme';

/**
 * The phases in which the backend says it is assembling a surface. Only then is
 * there a shape worth standing in for — before that the turn is still fetching
 * data and the outline would be a guess.
 */
const BUILDING_PHASES: readonly AgentStatusId[] = ['building_ui', 'validating_ui'];

export type MorphingStageProps = {
  isPending: boolean;
  hasContent: boolean;
  /** Last phase reported by the backend for the running turn. */
  status?: AgentStatusId | null;
  revealed?: boolean;
  error?: string | null;
  children: React.ReactNode;
  onCancel?: () => void;
};

export function MorphingStage({
  isPending,
  hasContent,
  status,
  revealed = true,
  children,
}: MorphingStageProps) {
  if (isPending) {
    return (
      <PendingStage hasContent={hasContent} status={status}>
        {children}
      </PendingStage>
    );
  }

  return (
    <CompletedStage revealed={revealed}>
      {children}
    </CompletedStage>
  );
}

function CompletedStage({
  revealed,
  children,
}: {
  revealed: boolean;
  children: React.ReactNode;
}) {
  const motion = useMotion();
  const [opacity] = useState(() => new Animated.Value(revealed ? 1 : 0));

  useEffect(() => {
    opacity.stopAnimation();
    if (!revealed) {
      opacity.setValue(0);
      return;
    }

    if (!motion.enabled) {
      opacity.setValue(1);
      return;
    }

    const reveal = Animated.timing(opacity, {
      toValue: 1,
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    reveal.start();
    return () => reveal.stop();
  }, [opacity, revealed, motion.enabled, motion.duration.slow]);

  return (
    <View
      accessibilityElementsHidden={!revealed}
      importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
      pointerEvents={revealed ? 'auto' : 'none'}
      style={styles.stageContainer}>
      <Animated.View style={[styles.idleWrapper, { opacity }]}>
        {children}
      </Animated.View>
    </View>
  );
}

function PendingStage({
  hasContent,
  status,
  children,
}: {
  hasContent: boolean;
  status?: AgentStatusId | null;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const motion = useMotion();
  const shouldCollapse = hasContent && motion.enabled;
  const [collapsed, setCollapsed] = useState(!shouldCollapse);
  const [collapseScale] = useState(() => new Animated.Value(1));
  const [collapseOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!shouldCollapse) return;

    const collapse = Animated.sequence([
      Animated.timing(collapseScale, {
        toValue: 1.03,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.parallel([
        Animated.timing(collapseScale, {
          toValue: 0.05,
          duration: 280,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(collapseOpacity, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]);
    collapse.start(({ finished }) => {
      if (finished) setCollapsed(true);
    });

    // A fast response unmounts this stage and stops the old animation, so it
    // cannot hide the component after the response has already rendered.
    return () => collapse.stop();
  }, [collapseOpacity, collapseScale, shouldCollapse]);

  return (
    <View style={styles.stageContainer}>
      {!collapsed ? (
        <Animated.View
          style={[
            styles.collapsingWrapper,
            {
              opacity: collapseOpacity,
              transform: [{ scale: collapseScale }],
            },
          ]}>
          <View
            style={[
              styles.bubbleFrame,
              {
                borderColor: theme.accent,
                backgroundColor: theme.backgroundElement,
              },
            ]}>
            {children}
          </View>
        </Animated.View>
      ) : BUILDING_PHASES.includes(status as AgentStatusId) ? (
        // A surface is being assembled, so stand in for its shape instead of
        // holding an empty gap until it lands.
        <View style={styles.waitingSurface}>
          <SurfaceSkeleton />
        </View>
      ) : (
        <View style={styles.waitingSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  collapsingWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleFrame: {
    width: '100%',
    borderRadius: 999,
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#EF2945',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 24px rgba(239, 41, 69, 0.2)',
      },
    }),
  },
  waitingSpacer: {
    width: '100%',
    minHeight: 160,
  },
  waitingSurface: {
    width: '100%',
  },
  idleWrapper: {
    width: '100%',
  },
});

import { HeatmapChart } from '@/components/charts/heatmap-chart';
import { heatmapChartPropsSchema } from '@/components/charts/heatmap-chart-model';
import type React from 'react';
import type { z } from 'zod';

import { Grid, Page, Section, Stack } from '@/components/layout';
import {
  ActionButton,
  Card,
  Divider,
  EmptyState,
  InfoBanner,
  ProgressBar,
  StatusBadge,
  TextBlock,
} from '@/components/ui';
import {
  AccountBalanceCard,
  FinancialStatCard,
  SpendingCategoryChart,
  TransactionItem,
  TransactionList,
} from '@/features/personal-banking';

import {
  accountBalanceCardPropsSchema,
  actionButtonPropsSchema,
  cardPropsSchema,
  dividerPropsSchema,
  emptyStatePropsSchema,
  financialStatCardPropsSchema,
  gridPropsSchema,
  infoBannerPropsSchema,
  pagePropsSchema,
  progressBarPropsSchema,
  sectionPropsSchema,
  spendingCategoryChartPropsSchema,
  stackPropsSchema,
  statusBadgePropsSchema,
  textBlockPropsSchema,
  transactionItemPropsSchema,
  transactionListPropsSchema,
} from './component-schemas';
import type { ComponentRegistryEntry } from './types';
import { AreaChart } from '@/components/charts/area-chart';
import { areaChartPropsSchema } from '@/components/charts/area-chart-model';

// Registry definition with precise typing
export const componentRegistry = {
  HeatmapChart: {
    component: HeatmapChart,
    propsSchema: heatmapChartPropsSchema,
    allowsChildren: false,
    allowedActions: ['onDaySelect', 'onPeriodChange'],
  },
  AreaChart: { component: AreaChart, propsSchema: areaChartPropsSchema, allowsChildren: false, allowedActions: ['onPointSelect'] },
  Page: {
    component: Page,
    propsSchema: pagePropsSchema,
    allowsChildren: true,
    allowedActions: [],
  },
  Section: {
    component: Section,
    propsSchema: sectionPropsSchema,
    allowsChildren: true,
    allowedActions: [],
  },
  Grid: {
    component: Grid,
    propsSchema: gridPropsSchema,
    allowsChildren: true,
    allowedActions: [],
  },
  Stack: {
    component: Stack,
    propsSchema: stackPropsSchema,
    allowsChildren: true,
    allowedActions: [],
  },
  Card: {
    component: Card,
    propsSchema: cardPropsSchema,
    allowsChildren: true,
    allowedActions: ['onPress'],
  },
  TextBlock: {
    component: TextBlock,
    propsSchema: textBlockPropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
  AccountBalanceCard: {
    component: AccountBalanceCard,
    propsSchema: accountBalanceCardPropsSchema,
    allowsChildren: false,
    allowedActions: ['onPress'],
  },
  FinancialStatCard: {
    component: FinancialStatCard,
    propsSchema: financialStatCardPropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
  TransactionList: {
    component: TransactionList,
    propsSchema: transactionListPropsSchema,
    allowsChildren: true,
    allowedActions: [],
  },
  TransactionItem: {
    component: TransactionItem,
    propsSchema: transactionItemPropsSchema,
    allowsChildren: false,
    allowedActions: ['onPress'],
  },
  SpendingCategoryChart: {
    component: SpendingCategoryChart,
    propsSchema: spendingCategoryChartPropsSchema,
    allowsChildren: false,
    allowedActions: ['onCategoryPress'],
  },
  ActionButton: {
    component: ActionButton,
    propsSchema: actionButtonPropsSchema,
    allowsChildren: false,
    allowedActions: ['onPress'],
  },
  StatusBadge: {
    component: StatusBadge,
    propsSchema: statusBadgePropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
  ProgressBar: {
    component: ProgressBar,
    propsSchema: progressBarPropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
  InfoBanner: {
    component: InfoBanner,
    propsSchema: infoBannerPropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
  Divider: {
    component: Divider,
    propsSchema: dividerPropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
  EmptyState: {
    component: EmptyState,
    propsSchema: emptyStatePropsSchema,
    allowsChildren: false,
    allowedActions: [],
  },
} as const;

export type RegisteredComponentType = keyof typeof componentRegistry;

export function isRegisteredComponentType(
  type: string,
): type is RegisteredComponentType {
  return Object.prototype.hasOwnProperty.call(componentRegistry, type);
}

export function getComponentDefinition(
  type: string,
): ComponentRegistryEntry<Record<string, unknown>> | undefined {
  if (isRegisteredComponentType(type)) {
    const entry = componentRegistry[type];
    return {
      component: entry.component as unknown as React.ComponentType<Record<string, unknown>>,
      propsSchema: entry.propsSchema as unknown as z.ZodType<Record<string, unknown>>,
      allowsChildren: entry.allowsChildren,
      allowedActions: entry.allowedActions,
    };
  }
  return undefined;
}

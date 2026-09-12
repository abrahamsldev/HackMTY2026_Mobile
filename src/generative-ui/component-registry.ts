import type React from 'react';
import type { z } from 'zod';

import { Grid, Page, Section, Stack } from '@/components/layout';
import { Card, TextBlock } from '@/components/ui';
import {
  AccountBalanceCard,
  FinancialStatCard,
  TransactionItem,
  TransactionList,
} from '@/features/personal-banking';

import {
  accountBalanceCardPropsSchema,
  cardPropsSchema,
  financialStatCardPropsSchema,
  gridPropsSchema,
  pagePropsSchema,
  sectionPropsSchema,
  stackPropsSchema,
  textBlockPropsSchema,
  transactionItemPropsSchema,
  transactionListPropsSchema,
} from './component-schemas';
import type { ComponentRegistryEntry } from './types';

// Registry definition with precise typing
export const componentRegistry = {
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

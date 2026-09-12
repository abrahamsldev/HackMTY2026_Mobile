import { z } from 'zod';

import type { GenerativeAction, GenerativeNode } from './types';

export const pagePropsSchema = z
  .object({
    scrollable: z.boolean().optional(),
    safeArea: z.boolean().optional(),
    padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    background: z.enum(['default', 'muted', 'surface']).optional(),
  })
  .strict();

export const sectionPropsSchema = z
  .object({
    spacing: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
    padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  })
  .strict();

export const gridPropsSchema = z
  .object({
    columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    mobileColumns: z.union([z.literal(1), z.literal(2)]).optional(),
    spacing: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    minItemWidth: z.number().positive().optional(),
  })
  .strict();

export const stackPropsSchema = z
  .object({
    direction: z.enum(['row', 'column']).optional(),
    spacing: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
    align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between']).optional(),
    wrap: z.boolean().optional(),
  })
  .strict();

export const cardPropsSchema = z
  .object({
    variant: z.enum(['default', 'outlined', 'elevated', 'highlighted']).optional(),
    padding: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  })
  .strict();

export const textBlockPropsSchema = z
  .object({
    value: z.string(),
    variant: z.enum(['title', 'subtitle', 'body', 'caption', 'amount']).optional(),
    color: z.enum(['default', 'muted', 'success', 'danger']).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
  })
  .strict();

export const accountBalanceCardPropsSchema = z
  .object({
    accountId: z.string().min(1),
    accountName: z.string().min(1).max(100),
    accountType: z.enum(['checking', 'savings', 'credit']),
    accountLastFour: z
      .string()
      .regex(/^\d{4}$/, 'accountLastFour debe tener exactamente 4 dígitos numéricos'),
    availableBalance: z.number().finite(),
    currency: z.enum(['MXN', 'USD']).optional(),
    status: z.enum(['active', 'blocked', 'inactive']).optional(),
    variant: z.enum(['default', 'highlighted']).optional(),
  })
  .strict();

export const financialStatCardPropsSchema = z
  .object({
    label: z.string().min(1),
    value: z.number().finite(),
    format: z.enum(['currency', 'percentage', 'number']).optional(),
    currency: z.enum(['MXN', 'USD']).optional(),
    tone: z.enum(['default', 'positive', 'negative', 'warning']).optional(),
    comparison: z
      .object({
        value: z.number().finite(),
        label: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

export const transactionItemPropsSchema = z
  .object({
    transactionId: z.string().min(1),
    title: z.string().min(1).max(100),
    description: z.string().max(250).optional(),
    amount: z.number().finite(),
    currency: z.enum(['MXN', 'USD']).optional(),
    occurredAt: z.string().datetime({ offset: true }),
    category: z.enum([
      'food',
      'transport',
      'entertainment',
      'utilities',
      'health',
      'shopping',
      'income',
      'transfer',
      'other',
    ]),
    status: z.enum(['pending', 'completed', 'declined']).optional(),
  })
  .strict();

export const transactionListPropsSchema = z
  .object({
    title: z.string().optional(),
    emptyMessage: z.string().optional(),
    spacing: z.enum(['none', 'sm', 'md']).optional(),
  })
  .strict();

export const spendingCategoryItemSchema = z
  .object({
    category: z.enum([
      'food',
      'transport',
      'entertainment',
      'utilities',
      'health',
      'shopping',
      'transfer',
      'other',
    ]),
    amount: z.number().finite().nonnegative(),
  })
  .strict();

export const spendingCategoryChartPropsSchema = z
  .object({
    title: z.string().max(100).optional(),
    subtitle: z.string().max(150).optional(),
    categories: z.array(spendingCategoryItemSchema).min(1).max(10),
    currency: z.enum(['MXN', 'USD']).optional(),
    showPercentages: z.boolean().optional(),
    maxCategories: z.number().int().min(1).max(10).optional(),
  })
  .strict();

export const actionButtonPropsSchema = z
  .object({
    label: z.string().min(1).max(80),
    variant: z.enum(['primary', 'secondary', 'outline', 'danger']).optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
    disabled: z.boolean().optional(),
    loading: z.boolean().optional(),
    fullWidth: z.boolean().optional(),
  })
  .strict();

export const statusBadgePropsSchema = z
  .object({
    label: z.string().min(1).max(80),
    tone: z.enum(['neutral', 'info', 'success', 'warning', 'danger']).optional(),
    size: z.enum(['sm', 'md']).optional(),
  })
  .strict();

export const progressBarPropsSchema = z
  .object({
    value: z.number().min(0).max(100),
    label: z.string().max(100).optional(),
    showValue: z.boolean().optional(),
    tone: z.enum(['default', 'success', 'warning', 'danger']).optional(),
    size: z.enum(['sm', 'md', 'lg']).optional(),
  })
  .strict();

export const infoBannerPropsSchema = z
  .object({
    title: z.string().max(100).optional(),
    message: z.string().min(1).max(300),
    tone: z.enum(['info', 'success', 'warning', 'danger']).optional(),
  })
  .strict();

export const dividerPropsSchema = z
  .object({
    inset: z.enum(['none', 'sm', 'md', 'lg']).optional(),
    tone: z.enum(['default', 'muted']).optional(),
  })
  .strict();

export const emptyStatePropsSchema = z
  .object({
    title: z.string().min(1).max(100),
    description: z.string().max(300).optional(),
    tone: z.enum(['default', 'muted']).optional(),
  })
  .strict();

export const generativeActionSchema: z.ZodType<GenerativeAction> = z
  .object({
    event: z.string().min(1),
    tool: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const generativeNodeSchema: z.ZodType<GenerativeNode> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      type: z.string().min(1),
      props: z.record(z.string(), z.unknown()).optional(),
      children: z.array(generativeNodeSchema).optional(),
      actions: z.record(z.string(), generativeActionSchema).optional(),
      status: z
        .enum(['idle', 'loading', 'ready', 'empty', 'error', 'success'])
        .optional(),
    })
    .strict(),
);

export { areaChartPropsSchema } from '@/components/charts/area-chart-model';

export { heatmapChartPropsSchema } from '@/components/charts/heatmap-chart-model';

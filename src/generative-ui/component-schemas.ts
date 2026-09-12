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

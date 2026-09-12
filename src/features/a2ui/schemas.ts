import { z } from 'zod';

import {
  A2UI_BASIC_CATALOG_ID,
  A2UI_LIMITS,
  A2UI_VERSION,
  type A2UIMessage,
  type JSONValue,
} from './types.ts';

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z][A-Za-z0-9._:-]*$/);

export function decodeJsonPointer(path: string): string[] {
  if (path === '/') return [];
  if (!path.startsWith('/') || path.includes('#')) {
    throw new Error('invalid JSON Pointer');
  }
  return path.slice(1).split('/').map((segment) => {
    if (/~(?![01])/u.test(segment)) throw new Error('invalid JSON Pointer escape');
    return segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
  });
}

export function isSafeJsonPointer(path: string): boolean {
  try {
    const segments = decodeJsonPointer(path);
    return segments.every(
      (segment) => !['__proto__', 'prototype', 'constructor'].includes(segment),
    );
  } catch {
    return false;
  }
}

const jsonPointer = z.string().max(512).refine(isSafeJsonPointer);
export const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const binding = z.object({ path: jsonPointer }).strict();
const dynamicString = z.union([
  z.string().max(A2UI_LIMITS.stringLength),
  binding,
]);
const dynamicValue = z.union([
  z.string().max(A2UI_LIMITS.stringLength),
  z.number().finite(),
  z.boolean(),
  z.array(jsonValueSchema).max(100),
  binding,
]);
const accessibility = z
  .object({ label: dynamicString.optional(), description: dynamicString.optional() })
  .strict();
const common = {
  id: identifier,
  weight: z.number().finite().min(0).max(100).optional(),
  accessibility: accessibility.optional(),
};

const serverAction = z
  .object({
    event: z
      .object({
        name: identifier,
        context: z.record(z.string().min(1).max(128), dynamicValue).optional(),
      })
      .strict(),
  })
  .strict();

export const a2uiComponentSchema = z.discriminatedUnion('component', [
  z.object({
    ...common,
    component: z.literal('Text'),
    text: dynamicString,
    variant: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'caption', 'body']).optional(),
  }).strict(),
  z.object({
    ...common,
    component: z.literal('Button'),
    child: identifier,
    variant: z.enum(['default', 'primary', 'borderless']).optional(),
    action: serverAction,
  }).strict(),
  z.object({ ...common, component: z.literal('Card'), child: identifier }).strict(),
  z.object({
    ...common,
    component: z.literal('Column'),
    children: z.array(identifier).max(A2UI_LIMITS.componentsPerSurface),
    justify: z
      .enum(['start', 'center', 'end', 'spaceBetween', 'spaceAround', 'spaceEvenly', 'stretch'])
      .optional(),
    align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  }).strict(),
]);

const theme = z
  .object({
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    iconUrl: z.string().url().max(2_048).optional(),
    agentDisplayName: z.string().max(128).optional(),
  })
  .strict();

const createSurface = z.object({
  version: z.literal(A2UI_VERSION),
  createSurface: z.object({
    surfaceId: identifier,
    catalogId: z.literal(A2UI_BASIC_CATALOG_ID),
    theme: theme.optional(),
    sendDataModel: z.boolean().optional(),
  }).strict(),
}).strict();

const updateComponents = z.object({
  version: z.literal(A2UI_VERSION),
  updateComponents: z.object({
    surfaceId: identifier,
    components: z.array(a2uiComponentSchema).min(1).max(A2UI_LIMITS.componentsPerSurface)
      .refine((items) => new Set(items.map(({ id }) => id)).size === items.length),
  }).strict(),
}).strict();

const updateDataModel = z.object({
  version: z.literal(A2UI_VERSION),
  updateDataModel: z.object({
    surfaceId: identifier,
    path: jsonPointer.optional(),
    value: jsonValueSchema.optional(),
  }).strict(),
}).strict();

const deleteSurface = z.object({
  version: z.literal(A2UI_VERSION),
  deleteSurface: z.object({ surfaceId: identifier }).strict(),
}).strict();

export const a2uiMessageSchema: z.ZodType<A2UIMessage> = z.union([
  createSurface,
  updateComponents,
  updateDataModel,
  deleteSurface,
]);

export const a2uiMessageSequenceSchema = z
  .array(a2uiMessageSchema)
  .min(1)
  .max(A2UI_LIMITS.messagesPerResponse);

export const a2uiActionSchema = z.object({
  name: identifier,
  surfaceId: identifier,
  sourceComponentId: identifier,
  timestamp: z.string().datetime({ offset: true }),
  context: z.record(z.string().min(1).max(128), jsonValueSchema),
}).strict();

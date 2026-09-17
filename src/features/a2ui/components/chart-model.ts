import { areaChartPropsSchema } from '../../../components/charts/area-chart-model.ts';
import { heatmapChartPropsSchema } from '../../../components/charts/heatmap-chart-model.ts';
import { progressRingPropsSchema } from '../../../components/charts/progress-ring-model.ts';
import { z } from 'zod';

import { resolveDataPath } from '../data-model.ts';
import type { A2UIBinding, JSONValue } from '../types.ts';

const bindingSchema = z.object({ path: z.string().max(512) }).strict();

export const a2uiAreaChartValueSchema = z.object({
  kind: z.literal('area'),
  accessibleSummary: z.string().min(1).max(500).optional(),
  props: areaChartPropsSchema,
}).strict();

export const a2uiHeatmapChartValueSchema = z.object({
  kind: z.literal('heatmap'),
  accessibleSummary: z.string().min(1).max(500).optional(),
  props: heatmapChartPropsSchema.refine((props) => props.data.length <= 500, {
    message: 'A2UI heatmaps are limited to 500 cells.',
  }),
}).strict();

/**
 * A meter: one ratio against a limit. The same Zod model the local
 * `ProgressRing` validates with, so the wire contract and the component can
 * never disagree about what a ring accepts.
 */
export const a2uiRingChartValueSchema = z.object({
  kind: z.literal('ring'),
  accessibleSummary: z.string().min(1).max(500).optional(),
  props: progressRingPropsSchema,
}).strict();

export const a2uiChartValueSchema = z.discriminatedUnion('kind', [
  a2uiAreaChartValueSchema,
  a2uiHeatmapChartValueSchema,
  a2uiRingChartValueSchema,
]);

export const a2uiChartInputSchema = z.union([bindingSchema, a2uiChartValueSchema]);

export type ResolvedA2UIChart = z.infer<typeof a2uiChartValueSchema>;

export function resolveA2UIChart(
  input: ResolvedA2UIChart | A2UIBinding,
  dataModel: JSONValue | undefined,
) {
  const candidate = 'path' in input ? resolveDataPath(dataModel, input.path) : input;
  return a2uiChartValueSchema.safeParse(candidate);
}

export function chartAdapterKind(input: unknown): 'area' | 'heatmap' | 'ring' | 'invalid' {
  const parsed = a2uiChartValueSchema.safeParse(input);
  return parsed.success ? parsed.data.kind : 'invalid';
}

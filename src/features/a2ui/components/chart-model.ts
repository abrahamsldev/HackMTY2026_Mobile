import { areaChartPropsSchema } from '../../../components/charts/area-chart-model.ts';
import { heatmapChartPropsSchema } from '../../../components/charts/heatmap-chart-model.ts';
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

export const a2uiChartValueSchema = z.discriminatedUnion('kind', [
  a2uiAreaChartValueSchema,
  a2uiHeatmapChartValueSchema,
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

export function chartAdapterKind(input: unknown): 'area' | 'heatmap' | 'invalid' {
  const parsed = a2uiChartValueSchema.safeParse(input);
  return parsed.success ? parsed.data.kind : 'invalid';
}

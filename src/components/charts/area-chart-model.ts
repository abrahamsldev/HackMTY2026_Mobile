import { z } from 'zod';

export const areaChartPropsSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  data: z.array(z.object({ label: z.string().min(1).max(80), values: z.array(z.number().finite().min(-1e15).max(1e15)).min(1).max(4) }).strict()).max(240),
  series: z.array(z.object({ label: z.string().min(1).max(80), tone: z.enum(['blue', 'violet', 'green', 'orange']).optional() }).strict()).min(1).max(4),
  height: z.number().min(180).max(500).optional(),
  currency: z.enum(['MXN', 'USD']).optional(),
  status: z.enum(['ready', 'loading']).optional(),
}).strict().refine((p) => p.data.every((point) => point.values.length === p.series.length), { message: 'Cada punto debe tener un valor por serie.' });

export type AreaChartData = z.infer<typeof areaChartPropsSchema>;
export type ChartPoint = { x: number; y: number };

export function chartDomain(data: AreaChartData['data']): [number, number] {
  const values = data.flatMap((point) => point.values);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return min === max ? [0, 1] : [min, max + (max - min) * 0.1];
}

// Monotone cubic interpolation: smooth curves without inventing extrema between samples.
export function smoothPath(points: ChartPoint[]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangents = points.map((_, i) => i === 0 ? slopes[0] : i === points.length - 1 ? slopes[i - 1] :
    slopes[i - 1] * slopes[i] <= 0 ? 0 : 2 / (1 / slopes[i - 1] + 1 / slopes[i]));
  return points.slice(1).reduce((path, p, i) => {
    const previous = points[i];
    const dx = (p.x - previous.x) / 3;
    return `${path} C${previous.x + dx},${previous.y + dx * tangents[i]} ${p.x - dx},${p.y - dx * tangents[i + 1]} ${p.x},${p.y}`;
  }, `M${points[0].x},${points[0].y}`);
}

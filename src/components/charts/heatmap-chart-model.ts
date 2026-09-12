import { z } from 'zod';

export function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
export function calendarDate(key: string): Date { return new Date(`${key}T00:00:00.000Z`); }
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((key) => {
  const date = calendarDate(key);
  return Number.isFinite(date.getTime()) && dateKey(date) === key && key >= '1900-01-01' && key <= '2100-12-31';
}, 'Fecha inválida (1900–2100)');
export const heatmapChartPropsSchema = z.object({
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  data: z.array(z.object({ date: isoDate, value: z.number().finite().min(0).max(1e15) }).strict()).max(4000),
  initialDate: isoDate.optional(),
  initialView: z.enum(['year', 'month', 'week']).optional(),
  tone: z.enum(['green', 'blue', 'violet', 'orange']).optional(),
  currency: z.enum(['MXN', 'USD']).optional(),
  status: z.enum(['ready', 'loading']).optional(),
}).strict().refine(({ data }) => new Set(data.map((day) => day.date)).size === data.length, 'Las fechas no deben repetirse');
export type HeatmapChartData = z.infer<typeof heatmapChartPropsSchema>;
export type HeatmapView = 'year' | 'month' | 'week';
export function addDays(key: string, days: number): string {
  const date = calendarDate(key); date.setUTCDate(date.getUTCDate() + days); return dateKey(date);
}
export function weekStart(key: string): string {
  return addDays(key, -((calendarDate(key).getUTCDay() + 6) % 7));
}
export function periodBounds(key: string, view: HeatmapView): { startDate: string; endDate: string } {
  if (view === 'week') { const startDate = weekStart(key); return { startDate, endDate: addDays(startDate, 6) }; }
  const date = calendarDate(key);
  const year = date.getUTCFullYear(); const month = view === 'year' ? 0 : date.getUTCMonth();
  return { startDate: dateKey(new Date(Date.UTC(year, month, 1))), endDate: dateKey(new Date(Date.UTC(year, view === 'year' ? 12 : month + 1, 0))) };
}
export function periodCells(key: string, view: HeatmapView): (string | null)[] {
  const { startDate, endDate } = periodBounds(key, view);
  const first = weekStart(startDate);
  const last = addDays(weekStart(endDate), 6);
  const cells: (string | null)[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) cells.push(day < startDate || day > endDate ? null : day);
  return cells;
}
export function shiftPeriod(key: string, view: HeatmapView, direction: number): string {
  if (view === 'week') return addDays(key, direction * 7);
  const date = calendarDate(key);
  const target = new Date(Date.UTC(date.getUTCFullYear() + (view === 'year' ? direction : 0), date.getUTCMonth() + (view === 'month' ? direction : 0), 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), last)); return dateKey(target);
}
export function heatLevel(value: number | undefined, maximum: number): number | null {
  if (value === undefined) return null;
  if (value === 0 || maximum <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil(value / maximum * 4)));
}

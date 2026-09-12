import assert from 'node:assert/strict';
import test from 'node:test';
import { heatmapChartPropsSchema, heatLevel, periodBounds, periodCells, shiftPeriod, weekStart } from '../src/components/charts/heatmap-chart-model.ts';

test('calendar validates actual dates, unique days and nonnegative finite values', () => {
  const valid = { data: [{ date: '2024-02-29', value: 0 }] };
  assert.equal(heatmapChartPropsSchema.safeParse(valid).success, true);
  for (const data of [[{ date: '2025-02-29', value: 1 }], [{ date: '2026-13-01', value: 1 }], [{ date: '2026-01-01', value: -1 }], [{ date: '2026-01-01', value: Infinity }], [...valid.data, ...valid.data]]) {
    assert.equal(heatmapChartPropsSchema.safeParse({ data }).success, false);
  }
});
test('year and month grids cover every day exactly once with Monday padding', () => {
  for (const [date, count] of [['2024-02-15', 366], ['2025-02-15', 365]]) {
    const days = periodCells(date, 'year').filter(Boolean);
    assert.equal(days.length, count); assert.equal(new Set(days).size, count);
  }
  const february = periodCells('2024-02-15', 'month');
  assert.deepEqual(february.slice(0, 4), [null, null, null, '2024-02-01']);
  assert.equal(february.filter(Boolean).length, 29);
  assert.equal(february.length % 7, 0);
});
test('week zoom spans year boundaries and month navigation clamps end dates', () => {
  assert.equal(weekStart('2026-01-01'), '2025-12-29');
  assert.deepEqual(periodBounds('2026-01-01', 'week'), { startDate: '2025-12-29', endDate: '2026-01-04' });
  assert.equal(periodCells('2026-01-01', 'week').length, 7);
  assert.equal(shiftPeriod('2024-01-31', 'month', 1), '2024-02-29');
  assert.equal(shiftPeriod('2024-02-29', 'year', 1), '2025-02-28');
  assert.equal(shiftPeriod('2026-12-31', 'week', 1), '2027-01-07');
});
test('intensity separates missing data and zero with a shared scale across periods', () => {
  assert.equal(heatLevel(undefined, 100), null);
  assert.equal(heatLevel(0, 100), 0);
  assert.equal(heatLevel(0, 0), 0);
  assert.deepEqual([1, 25, 26, 50, 51, 75, 76, 100].map((value) => heatLevel(value, 100)), [1, 1, 2, 2, 3, 3, 4, 4]);
});

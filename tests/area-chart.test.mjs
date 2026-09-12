import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaChartPropsSchema, chartDomain, smoothPath } from '../src/components/charts/area-chart-model.ts';

test('chart domains handle empty, zero and negative data without division by zero', () => {
  assert.deepEqual(chartDomain([]), [0, 1]);
  assert.deepEqual(chartDomain([{ label: 'zero', values: [0] }]), [0, 1]);
  const [min, max] = chartDomain([{ label: 'mixed', values: [-300, 100] }]);
  assert.ok(min <= -300 && max >= 100 && max > min);
});

test('chart schema rejects missing series values and executable properties', () => {
  const data = { data: [{ label: 'Ene', values: [10] }], series: [{ id: 'income', label: 'Ingresos' }] };
  assert.ok(areaChartPropsSchema.safeParse(data).success);
  assert.equal(areaChartPropsSchema.safeParse({ ...data, series: [...data.series, { id: 'expenses', label: 'Gastos' }] }).success, false);
  assert.equal(areaChartPropsSchema.safeParse({ ...data, series: [...data.series, { ...data.series[0] }], data: [{ label: 'Ene', values: [10, 5] }] }).success, false);
  assert.equal(areaChartPropsSchema.safeParse({ ...data, style: { color: 'red' } }).success, false);
  assert.equal(areaChartPropsSchema.safeParse({ ...data, data: [{ label: 'Ene', values: [Infinity] }] }).success, false);
});

test('empty and single-point paths remain valid', () => {
  assert.equal(smoothPath([]), '');
  assert.equal(smoothPath([{ x: 10, y: 20 }]), 'M10,20');
});

test('smooth interpolation does not overshoot segment extrema', () => {
  const points = [20, 90, 30, 30, -40, 120].map((y, i) => ({ x: i * 30, y }));
  const curves = smoothPath(points).split(' C').slice(1);
  curves.forEach((curve, i) => {
    const values = curve.split(/[ ,]/).map(Number);
    for (let j = 0; j <= 100; j++) {
      const t = j / 100;
      const y = (1-t)**3 * points[i].y + 3*(1-t)**2*t*values[1] + 3*(1-t)*t*t*values[3] + t**3*values[5];
      assert.ok(y >= Math.min(points[i].y, points[i+1].y) - 1e-8);
      assert.ok(y <= Math.max(points[i].y, points[i+1].y) + 1e-8);
    }
  });
});

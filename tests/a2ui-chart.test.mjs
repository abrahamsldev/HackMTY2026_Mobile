import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { chartAdapterKind } from '../src/features/a2ui/components/chart-model.ts';
import { A2UIMessageProcessor } from '../src/features/a2ui/message-processor.ts';
import { a2uiChartValueSchema } from '../src/features/a2ui/components/chart-model.ts';
import {
  A2UI_BASIC_CATALOG_ID,
  A2UI_FINANCE_CATALOG_ID,
} from '../src/features/a2ui/types.ts';

const contractFixtures = JSON.parse(
  readFileSync(new URL('./fixtures/chart-contract.json', import.meta.url), 'utf8'),
);
const [area, heatmap] = contractFixtures.accepted;
const ring = contractFixtures.accepted.find((chart) => chart.kind === 'ring');

function messages(catalogId, chart) {
  return [
    { version: 'v0.9.1', createSurface: { surfaceId: 'chart-test', catalogId } },
    { version: 'v0.9.1', updateComponents: { surfaceId: 'chart-test', components: [
      { id: 'root', component: 'Chart', chart: { path: '/chart' } },
    ] } },
    { version: 'v0.9.1', updateDataModel: { surfaceId: 'chart-test', path: '/', value: { chart } } },
  ];
}

test('valid finance Chart values select the existing area, heatmap and ring adapters', () => {
  assert.equal(chartAdapterKind(area), 'area');
  assert.equal(chartAdapterKind(heatmap), 'heatmap');
  assert.equal(chartAdapterKind(ring), 'ring');
  for (const chart of [area, heatmap, ring]) {
    assert.equal(new A2UIMessageProcessor().process(messages(A2UI_FINANCE_CATALOG_ID, chart)).ok, true);
  }
});

test('Chart is rejected under Basic and unknown kinds or properties are rejected', () => {
  assert.equal(new A2UIMessageProcessor().process(messages(A2UI_BASIC_CATALOG_ID, area)).ok, false);
  for (const chart of contractFixtures.rejected) {
    assert.equal(chartAdapterKind(chart), 'invalid');
  }
  for (const chart of contractFixtures.accepted) {
    assert.equal(a2uiChartValueSchema.safeParse(chart).success, true);
  }
});

test('network chart bounds reject oversized and non-finite datasets', () => {
  const oversizedArea = { ...area, props: { ...area.props, data: Array.from({ length: 241 }, (_, index) => ({ label: `P${index}`, values: [index] })) } };
  const oversizedHeatmap = { ...heatmap, props: { data: Array.from({ length: 501 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, 1 + index));
    return { date: date.toISOString().slice(0, 10), value: index };
  }) } };
  assert.equal(a2uiChartValueSchema.safeParse(oversizedArea).success, false);
  assert.equal(a2uiChartValueSchema.safeParse(oversizedHeatmap).success, false);
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(a2uiChartValueSchema.safeParse({ ...area, props: { ...area.props, data: [{ label: 'Bad', values: [value] }] } }).success, false);
  }
});

test('empty datasets are valid and use the existing chart empty states', () => {
  assert.equal(a2uiChartValueSchema.safeParse({ ...area, props: { ...area.props, data: [] } }).success, true);
  assert.equal(a2uiChartValueSchema.safeParse({ ...heatmap, props: { data: [] } }).success, true);
});

test('thin client adapter delegates only to trusted charts and keeps a safe invalid fallback', () => {
  const adapter = readFileSync(
    new URL('../src/features/a2ui/components/chart.tsx', import.meta.url),
    'utf8',
  );
  assert.match(adapter, /value\.kind === 'area'/);
  assert.match(adapter, /value\.kind === 'ring'/);
  assert.match(adapter, /<AreaChart/);
  assert.match(adapter, /<HeatmapChart/);
  assert.match(adapter, /<ProgressRing/);
  assert.match(adapter, /<GenerativeError/);
  assert.doesNotMatch(adapter, /\.\.\.parsed\.data\.props/);
});

test('component gallery contains bounded A2UI previews for every chart kind', () => {
  const gallery = readFileSync(new URL('../src/app/(app)/explore.tsx', import.meta.url), 'utf8');
  assert.match(gallery, /catalog-area-preview/);
  assert.match(gallery, /catalog-heatmap-preview/);
  assert.match(gallery, /catalog-ring-preview/);
  assert.match(gallery, /A2UI_FINANCE_CATALOG_ID/);
});

test('a ring Chart resolves through a data binding and applies the client defaults', () => {
  const processed = new A2UIMessageProcessor().process(messages(A2UI_FINANCE_CATALOG_ID, ring));
  assert.equal(processed.ok, true);
  const minimal = a2uiChartValueSchema.safeParse({ kind: 'ring', props: { value: 1, max: 4, label: 'Mínimo' } });
  assert.ok(minimal.success);
  // Defaults are the client's, so a server that sends only the three required
  // fields still gets a spend meter that warns at 80 %.
  assert.equal(minimal.data.props.intent, 'spend');
  assert.equal(minimal.data.props.warnAt, 0.8);
  assert.equal(minimal.data.props.size, 'md');
});

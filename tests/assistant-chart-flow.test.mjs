import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { requestAgent } from '../src/features/assistant/agent.ts';
import { buildRenderPlan } from '../src/features/a2ui/catalog.ts';
import { chartAdapterKind } from '../src/features/a2ui/components/chart-model.ts';
import { A2UIMessageProcessor } from '../src/features/a2ui/message-processor.ts';
import { A2UI_FINANCE_CATALOG_ID } from '../src/features/a2ui/types.ts';

const USER_A = '68dc4d66-07b8-5893-95f1-07f06989a552';

const contract = JSON.parse(
  readFileSync(new URL('./fixtures/chart-contract.json', import.meta.url), 'utf8'),
);

function chartMessages(chart) {
  return [
    {
      version: 'v0.9.1',
      createSurface: { surfaceId: 'data-chart', catalogId: A2UI_FINANCE_CATALOG_ID },
    },
    {
      version: 'v0.9.1',
      updateComponents: {
        surfaceId: 'data-chart',
        components: [
          { id: 'root', component: 'Card', child: 'chart-column' },
          { id: 'chart-column', component: 'Column', children: ['chart'] },
          { id: 'chart', component: 'Chart', chart: { path: '/chart' } },
        ],
      },
    },
    {
      version: 'v0.9.1',
      updateDataModel: {
        surfaceId: 'data-chart',
        path: '/',
        value: { chart },
      },
    },
  ];
}

function findChart(plan) {
  if (plan.status !== 'ready') return null;
  if (plan.component.component === 'Chart') return plan.component;
  for (const child of plan.children) {
    const found = findChart(child);
    if (found) return found;
  }
  return null;
}

for (const [index, kind] of ['area', 'heatmap'].entries()) {
  test(`production chat transport produces a visible ${kind} finance surface`, async () => {
    const chart = contract.accepted[index];
    const messages = chartMessages(chart);
    const reply = await requestAgent({
      baseUrl: 'https://agent.example.com',
      query: kind === 'heatmap'
        ? 'Show account activity by day as a heatmap.'
        : 'Show account activity over time as a chart.',
      userId: USER_A,
      fetchImpl: async () => new Response(JSON.stringify({
        message: `${kind} chart ready.`,
        data: { ok: true },
        a2ui: { resource_uri: 'a2ui://finance/data-chart', messages },
      })),
    });

    assert.equal(reply.message, `${kind} chart ready.`);
    assert.deepEqual(reply.messages, messages);
    const processed = new A2UIMessageProcessor().process(reply.messages);
    assert.equal(processed.ok, true);
    assert.equal(processed.surfaces.length, 1);
    const surface = processed.surfaces[0];
    assert.equal(surface.surfaceId, 'data-chart');
    assert.equal(surface.catalogId, A2UI_FINANCE_CATALOG_ID);
    const component = findChart(buildRenderPlan(surface));
    assert.ok(component, 'the production surface must resolve a visible Chart component');
    const resolvedChart = surface.dataModel.chart;
    assert.equal(chartAdapterKind(resolvedChart), kind);
  });
}

test('the index route renders protocol messages separately beneath assistant text', () => {
  const index = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');
  const surface = readFileSync(
    new URL('../src/features/assistant/components/a2ui-surface.tsx', import.meta.url),
    'utf8',
  );
  const renderer = readFileSync(new URL('../src/features/a2ui/renderer.tsx', import.meta.url), 'utf8');

  assert.match(index, /assistant\.surface\.reply\.message/);
  assert.match(index, /assistant\.surface\.a2uiSurfaces\.map/);
  assert.match(index, /<A2UISurface/);
  assert.match(surface, /<A2UIRenderer/);
  assert.match(renderer, /case 'Chart'/);
  assert.match(renderer, /<A2UIChart/);
});

test('switching demo users remounts and clears the previous A2UI surface state', () => {
  const index = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');
  const hook = readFileSync(
    new URL('../src/features/assistant/use-assistant.ts', import.meta.url),
    'utf8',
  );

  assert.match(index, /<AssistantWorkspace key=\{currentUserId\}/);
  assert.match(hook, /useRef\(new A2UIMessageProcessor\(\)\)/);
  assert.match(hook, /request\.current\.controller\?\.abort\(\)/);
});

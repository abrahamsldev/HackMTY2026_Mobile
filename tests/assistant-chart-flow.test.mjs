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
      accountId: '04803dbe-97f1-4986-ace7-54c2d6196151',
      accessToken: 'test-authenticated-token',
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

test('the index route renders protocol surfaces inside the matching assistant message', () => {
  const index = readFileSync(new URL('../src/app/(app)/index.tsx', import.meta.url), 'utf8');
  const chatMessage = readFileSync(
    new URL('../src/features/assistant/components/chat-message.tsx', import.meta.url),
    'utf8',
  );
  const surface = readFileSync(
    new URL('../src/features/assistant/components/a2ui-surface.tsx', import.meta.url),
    'utf8',
  );
  const renderer = readFileSync(new URL('../src/features/a2ui/renderer.tsx', import.meta.url), 'utf8');

  assert.match(index, /content=\{activeResponse\?\.reply\.message\}/);
  assert.match(index, /surfaces=\{activeSurfaces\}/);
  assert.match(index, /assistant\.surface\.revision > activeResponseFloor/);
  assert.match(index, /assistant\.pending \|\| submissionLocked\.current/);
  assert.match(chatMessage, /surfaces\.map/);
  assert.match(chatMessage, /<A2UISurface/);
  assert.match(surface, /<A2UIRenderer/);
  assert.match(renderer, /case 'Chart'/);
  assert.match(renderer, /<A2UIChart/);
});

test('switching authenticated accounts remounts and clears the previous A2UI surface state', () => {
  const index = readFileSync(new URL('../src/app/(app)/index.tsx', import.meta.url), 'utf8');
  const hook = readFileSync(
    new URL('../src/features/assistant/use-assistant.ts', import.meta.url),
    'utf8',
  );

  assert.match(index, /<AssistantWorkspace key=\{session\.user\.id\}/);
  assert.match(hook, /useRef\(new AssistantResponseProcessor\(\)\)/);
  assert.match(hook, /request\.current\.controller\?\.abort\(\)/);
  assert.match(hook, /if \(!normalized \|\| inFlight\.current\) return/);
});

test('assistant chrome uses restrained Banorte outlines and animated vector status icons', () => {
  const composer = readFileSync(
    new URL('../src/features/assistant/components/chat-composer.tsx', import.meta.url),
    'utf8',
  );
  const chatMessage = readFileSync(
    new URL('../src/features/assistant/components/chat-message.tsx', import.meta.url),
    'utf8',
  );
  const welcome = readFileSync(
    new URL('../src/features/assistant/components/assistant-welcome.tsx', import.meta.url),
    'utf8',
  );
  const statusIcon = readFileSync(
    new URL('../src/features/assistant/components/assistant-status-icon.tsx', import.meta.url),
    'utf8',
  );
  const themeTokens = readFileSync(
    new URL('../src/constants/theme.ts', import.meta.url),
    'utf8',
  );
  const accessibilityTheme = readFileSync(
    new URL('../src/features/accessibility/theme.ts', import.meta.url),
    'utf8',
  );
  const globalCss = readFileSync(
    new URL('../src/global.css', import.meta.url),
    'utf8',
  );

  assert.match(composer, /outlineWidth: 0/);
  assert.match(composer, /boxShadow: 'none'/);
  assert.match(composer, /paddingVertical: 11/);
  assert.match(composer, /borderWidth: 2/);
  assert.match(composer, /MAX_INPUT_HEIGHT = 132/);
  assert.match(composer, /duration: 360/);
  assert.match(composer, /<View pointerEvents="none" style=\{styles\.placeholderContainer\}>/);
  assert.match(composer, /scrollEnabled/);
  assert.match(composer, /backgroundColor: banortePalette\.strongRed/);
  assert.match(composer, /borderColor: banortePalette\.white/);
  assert.doesNotMatch(composer, /💡|↵/u);
  assert.match(welcome, /borderColor: theme\.accent/);
  assert.match(chatMessage, /borderColor: theme\.accent/);
  assert.match(chatMessage, /duration: settings\.reduceMotion \? 0 : 620/);
  assert.match(statusIcon, /Animated\.loop/);
  assert.match(statusIcon, /duration: 1250/);
  assert.match(statusIcon, /theme\.success/);
  assert.match(statusIcon, /settings\.reduceMotion/);
  assert.match(themeTokens, /background: '#171719'/);
  assert.match(accessibilityTheme, /const adaptiveRed = dark \? '#FF4D67'/);
  assert.match(globalCss, /#assistant-query-input:hover::-webkit-scrollbar-thumb/);
  assert.match(globalCss, /scrollbar-color: transparent transparent/);
});

test('the latest query edits inline and retry actions use icon-only controls', () => {
  const index = readFileSync(new URL('../src/app/(app)/index.tsx', import.meta.url), 'utf8');
  const chatMessage = readFileSync(
    new URL('../src/features/assistant/components/chat-message.tsx', import.meta.url),
    'utf8',
  );
  const errorMessage = readFileSync(
    new URL('../src/features/assistant/components/assistant-error-message.tsx', import.meta.url),
    'utf8',
  );

  assert.match(index, /setEditingQuery\(activeQuery\)/);
  assert.match(index, /isEditing=\{editingTurnId === activeTurnId\}/);
  assert.match(index, /onEdit=\{assistant\.pending \? undefined : handleBeginEdit\}/);
  assert.match(index, /disabled=\{!assistant\.isConfigured \|\| Boolean\(editingTurnId\)\}/);
  assert.match(chatMessage, /label="Editar última consulta"/);
  assert.match(chatMessage, /'Copiar consulta'/);
  assert.match(chatMessage, /Clipboard\.setString\(text\)/);
  assert.match(chatMessage, /icon=\{copied \? 'confirm' : 'copy'\}/);
  assert.match(chatMessage, /accessibilityLabel="Editar consulta"/);
  assert.match(chatMessage, /label="Cancelar edición"[\s\S]*color=\{theme\.danger\}/);
  assert.match(chatMessage, /label="Enviar consulta editada"[\s\S]*color=\{theme\.success\}/);
  assert.match(chatMessage, /<TextInput[\s\S]*autoFocus/);
  assert.match(errorMessage, /function RetryIcon/);
  assert.match(errorMessage, /<RetryIcon color=\{theme\.accent\}/);
  assert.doesNotMatch(errorMessage, />\s*Reintentar\s*</);
  assert.doesNotMatch(errorMessage, />\s*Editar consulta\s*</);
});

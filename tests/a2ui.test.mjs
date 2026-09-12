import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { createA2UIAction } from '../src/features/a2ui/action.ts';
import { resolveDynamicString, resolveDynamicValue } from '../src/features/a2ui/bindings.ts';
import { buildRenderPlan } from '../src/features/a2ui/catalog.ts';
import { A2UIMessageProcessor } from '../src/features/a2ui/message-processor.ts';
import { a2uiMessageSchema, a2uiMessageSequenceSchema } from '../src/features/a2ui/schemas.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/agent-responses.json', import.meta.url)));
const template = fixture.databaseOverview;
const create = template[0];
const components = template[1];
const data = template[2];

test('accepts all four strict v0.9.1 envelope types and the MCP fixture', () => {
  const deletion = { version: 'v0.9.1', deleteSurface: { surfaceId: 'database-overview' } };
  for (const message of [create, components, data, deletion]) {
    assert.equal(a2uiMessageSchema.safeParse(message).success, true);
  }
});

test('rejects wrong versions, zero or multiple bodies, and unknown envelope fields', () => {
  for (const version of ['a2ui/v1', 'v0.9', 'v1.0', 'unknown']) {
    assert.equal(a2uiMessageSchema.safeParse({ ...create, version }).success, false);
  }
  assert.equal(a2uiMessageSchema.safeParse({ version: 'v0.9.1' }).success, false);
  assert.equal(a2uiMessageSchema.safeParse({ ...create, deleteSurface: { surfaceId: 'database-overview' } }).success, false);
  assert.equal(a2uiMessageSchema.safeParse({ ...create, extra: true }).success, false);
});

test('rejects unsupported catalogs, components, properties, duplicate IDs and malformed actions', () => {
  const unsupportedCatalog = structuredClone(create);
  unsupportedCatalog.createSurface.catalogId = 'https://example.com/catalog.json';
  assert.equal(a2uiMessageSchema.safeParse(unsupportedCatalog).success, false);
  const unknown = structuredClone(components);
  unknown.updateComponents.components[0].component = 'WebView';
  assert.equal(a2uiMessageSchema.safeParse(unknown).success, false);
  const property = structuredClone(components);
  property.updateComponents.components[2].style = { color: 'red' };
  assert.equal(a2uiMessageSchema.safeParse(property).success, false);
  const duplicate = structuredClone(components);
  duplicate.updateComponents.components.push(duplicate.updateComponents.components[0]);
  assert.equal(a2uiMessageSchema.safeParse(duplicate).success, false);
  const action = structuredClone(components);
  action.updateComponents.components.at(-1).action.event.name = 'bad action';
  assert.equal(a2uiMessageSchema.safeParse(action).success, false);
});

test('duplicate creation fails atomically while deletion is complete and missing deletion is safe', () => {
  const processor = new A2UIMessageProcessor();
  assert.equal(processor.process(template).ok, true);
  const before = processor.snapshot();
  assert.equal(processor.process([create]).ok, false);
  assert.equal(processor.snapshot()[0].components.size, before[0].components.size);
  assert.equal(processor.process([{ version: 'v0.9.1', deleteSurface: { surfaceId: 'missing' } }]).ok, true);
  assert.equal(processor.process([{ version: 'v0.9.1', deleteSurface: { surfaceId: 'database-overview' } }]).ok, true);
  assert.deepEqual(processor.snapshot(), []);
});

test('incremental upserts preserve omitted components and progressive references', () => {
  const processor = new A2UIMessageProcessor();
  assert.equal(processor.process([create, {
    version: 'v0.9.1', updateComponents: { surfaceId: 'database-overview', components: [
      { id: 'root', component: 'Card', child: 'later' },
    ] },
  }]).ok, true);
  assert.equal(buildRenderPlan(processor.snapshot()[0]).children[0].status, 'unsupported');
  assert.equal(processor.process([{
    version: 'v0.9.1', updateComponents: { surfaceId: 'database-overview', components: [
      { id: 'later', component: 'Text', text: 'Now available' },
    ] },
  }]).ok, true);
  const surface = processor.snapshot()[0];
  assert.equal(surface.components.size, 2);
  assert.equal(buildRenderPlan(surface).children[0].status, 'ready');
});

test('root planning protects against cycles and maximum depth', () => {
  const cycle = new A2UIMessageProcessor();
  cycle.process([create, { version: 'v0.9.1', updateComponents: {
    surfaceId: 'database-overview', components: [
      { id: 'root', component: 'Card', child: 'loop' },
      { id: 'loop', component: 'Card', child: 'root' },
    ],
  } }]);
  assert.equal(buildRenderPlan(cycle.snapshot()[0]).children[0].children[0].reason, 'cycle');

  const deepComponents = Array.from({ length: 34 }, (_, index) => ({
    id: index === 0 ? 'root' : `node_${index}`,
    component: 'Card', child: `node_${index + 1}`,
  }));
  const deep = new A2UIMessageProcessor();
  assert.equal(deep.process([create, { version: 'v0.9.1', updateComponents: {
    surfaceId: 'database-overview', components: deepComponents,
  } }]).ok, true);
  let plan = buildRenderPlan(deep.snapshot()[0]);
  while (plan.status === 'ready') plan = plan.children[0];
  assert.equal(plan.reason, 'depth');
});

test('full, nested, null, omitted-value and RFC 6901 updates are distinct and immutable', () => {
  const processor = new A2UIMessageProcessor();
  processor.process([create, data]);
  const published = processor.snapshot()[0];
  assert.equal(processor.process([{ version: 'v0.9.1', updateDataModel: {
    surfaceId: 'database-overview', path: '/nested/value', value: null,
  } }]).ok, true);
  assert.deepEqual(processor.snapshot()[0].dataModel.nested, { value: null });
  assert.equal(processor.process([{ version: 'v0.9.1', updateDataModel: {
    surfaceId: 'database-overview', path: '/nested/value',
  } }]).ok, true);
  assert.deepEqual(processor.snapshot()[0].dataModel.nested, {});
  processor.process([{ version: 'v0.9.1', updateDataModel: {
    surfaceId: 'database-overview', path: '/a~1b/~0key', value: 7,
  } }]);
  assert.equal(processor.snapshot()[0].dataModel['a/b']['~key'], 7);
  assert.equal('nested' in published.dataModel, false);
  processor.process([{ version: 'v0.9.1', updateDataModel: { surfaceId: 'database-overview', value: ['replacement'] } }]);
  assert.deepEqual(processor.snapshot()[0].dataModel, ['replacement']);
});

test('rejects malformed and prototype-polluting pointers without changing valid state', () => {
  const processor = new A2UIMessageProcessor();
  processor.process([create, data]);
  for (const path of ['relative', '/bad~escape', '/__proto__/polluted', '/x/constructor/y']) {
    const message = { version: 'v0.9.1', updateDataModel: { surfaceId: 'database-overview', path, value: true } };
    assert.equal(a2uiMessageSchema.safeParse(message).success, false);
    assert.equal(processor.process([message]).ok, false);
  }
  assert.equal({}.polluted, undefined);
  assert.equal(processor.snapshot()[0].dataModel.limit, 50);
});

test('literal and path bindings resolve safely, including missing values', () => {
  assert.equal(resolveDynamicString('literal', data.updateDataModel.value), 'literal');
  assert.equal(resolveDynamicString({ path: '/title' }, data.updateDataModel.value), 'Database overview');
  assert.equal(resolveDynamicString({ path: '/missing' }, data.updateDataModel.value), undefined);
  assert.equal(resolveDynamicValue({ path: '/limit' }, data.updateDataModel.value), 50);
});

test('button actions resolve only declared context into the official five fields', () => {
  const processor = new A2UIMessageProcessor();
  processor.process(template);
  const surface = processor.snapshot()[0];
  const button = surface.components.get('refresh_button');
  const action = createA2UIAction(surface, button, new Date('2026-09-12T12:00:00.000Z'));
  assert.deepEqual(action, {
    name: 'refresh_database_overview', surfaceId: 'database-overview',
    sourceComponentId: 'refresh_button', timestamp: '2026-09-12T12:00:00.000Z', context: { limit: 50 },
  });
});

test('A2UI actions reject identity fields in declarative context', () => {
  const action = structuredClone(components);
  action.updateComponents.components.at(-1).action.event.context = { filters: [{ email: 'person@example.com' }] };
  assert.equal(a2uiMessageSchema.safeParse(action).success, false);
});

test('multiple surfaces stay independent and invalid payloads preserve the last valid snapshot', () => {
  const processor = new A2UIMessageProcessor();
  processor.process(template);
  const second = [
    { version: 'v0.9.1', createSurface: { surfaceId: 'second', catalogId: create.createSurface.catalogId } },
    { version: 'v0.9.1', updateComponents: { surfaceId: 'second', components: [{ id: 'root', component: 'Text', text: 'Second' }] } },
  ];
  assert.equal(processor.process(second).ok, true);
  assert.deepEqual(processor.snapshot().map((surface) => surface.surfaceId), ['database-overview', 'second']);
  const before = processor.snapshot();
  assert.equal(processor.process([{ version: 'v1.0' }]).ok, false);
  assert.deepEqual(processor.snapshot().map((surface) => surface.components.size), before.map((surface) => surface.components.size));
  assert.equal(a2uiMessageSequenceSchema.safeParse([]).success, false);
});

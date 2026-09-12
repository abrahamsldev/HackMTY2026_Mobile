import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AssistantResponseProcessor } from '../src/features/assistant/response-processor.ts';
import { A2UI_BASIC_CATALOG_ID, A2UI_VERSION } from '../src/features/a2ui/types.ts';

// Same envelope and fixed surface id as the deployed agent; synthetic text only.
function response(text, surfaceId = 'chat-message') {
  return [
    { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: A2UI_BASIC_CATALOG_ID } },
    { version: A2UI_VERSION, updateComponents: { surfaceId, components: [
      { id: 'root', component: 'Card', child: 'message_text' },
      { id: 'message_text', component: 'Text', text: { path: '/message' } },
    ] } },
    { version: A2UI_VERSION, updateDataModel: { surfaceId, path: '/', value: { message: text } } },
  ];
}

test('consecutive chat replies can reuse the deployed surface id', () => {
  const processor = new AssistantResponseProcessor();
  assert.equal(processor.process(response('Primera'), true).ok, true);
  const next = processor.process(response('Segunda'), true);
  assert.equal(next.ok, true);
  assert.equal(next.surfaces.length, 1);
  assert.equal(next.surfaces[0].dataModel.message, 'Segunda');
});

test('a new query replaces previous surfaces, including text-only responses', () => {
  const processor = new AssistantResponseProcessor();
  processor.process(response('Anterior', 'previous'), true);
  const next = processor.process(response('Actual'), true);
  assert.deepEqual(next.surfaces.map(s => s.surfaceId), ['chat-message']);
  assert.deepEqual(processor.process(null, true).surfaces, []);
});

test('action replies support both incremental data and full surface replacement', () => {
  const processor = new AssistantResponseProcessor();
  processor.process([...response('Inicial'), ...response('Otra', 'other')], true);
  const delta = processor.process([response('Actualizada')[2]], false);
  assert.equal(delta.ok, true);
  assert.equal(delta.surfaces[0].dataModel.message, 'Actualizada');
  const replacement = processor.process(response('Reemplazo'), false);
  assert.equal(replacement.ok, true);
  assert.equal(replacement.surfaces.length, 2);
  assert.equal(replacement.surfaces.find(s => s.surfaceId === 'chat-message').dataModel.message, 'Reemplazo');
});

test('invalid replacements remain atomic and duplicate creation within a reply is rejected', () => {
  const processor = new AssistantResponseProcessor();
  processor.process(response('Válida'), true);
  const invalid = processor.process([...response('Nueva'), response('Duplicada')[0]], false);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.surfaces[0].dataModel.message, 'Válida');
  assert.equal(processor.process([response('Recuperada')[2]], false).ok, true);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { a2uiSchema, createDispatch, dispatchToQuery, requestAgent } from '../src/features/assistant/agent.ts';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/agent-responses.json', import.meta.url)));
const options = { baseUrl: 'https://agent.example.com', query: 'Revisar suscripciones', persona: 'luis' };

for (const fixture of fixtures) {
  test(`accepts the wire contract of ${fixture.template_id}`, () => {
    assert.deepEqual(a2uiSchema.parse(fixture), fixture);
  });
}

test('rejects unknown types, executable props, duplicate IDs and incorrect versions', () => {
  const unknown = structuredClone(fixtures[0]);
  unknown.surface.components[0].type = 'WebView';
  assert.equal(a2uiSchema.safeParse(unknown).success, false);
  const executable = structuredClone(fixtures[0]);
  executable.surface.components[0].props.onPress = 'eval("code")';
  assert.equal(a2uiSchema.safeParse(executable).success, false);
  const duplicate = structuredClone(fixtures[0]);
  duplicate.surface.components.push(duplicate.surface.components[0]);
  assert.equal(a2uiSchema.safeParse(duplicate).success, false);
  assert.equal(a2uiSchema.safeParse({ ...fixtures[0], version: 'a2ui/v2' }).success, false);
});

test('rejects invalid slider values and action intents', () => {
  const invalid = structuredClone(fixtures[2]);
  invalid.surface.components[1].props.step = 0;
  assert.equal(a2uiSchema.safeParse(invalid).success, false);
  invalid.surface.components[1].props.step = 3;
  invalid.surface.components[1].props.default_value = 19;
  assert.equal(a2uiSchema.safeParse(invalid).success, false);
  invalid.surface.components[1].props.default_value = 6;
  invalid.surface.components[2].props.action.intent = 'EXECUTE_SQL';
  assert.equal(a2uiSchema.safeParse(invalid).success, false);
});

test('dispatch uses the selected months and preserves protected static payload values', () => {
  const payload = a2uiSchema.parse(fixtures[2]);
  payload.surface.components[2].props.action.payload.amount = 2500;
  const event = createDispatch(payload, 'projection_confirm', { projection_term: 12, amount: 1 });
  assert.deepEqual(event.action.payload, { months: 12, amount: 2500 });
  assert.equal(payload.surface.components[2].props.action.payload.months, 6);
  assert.match(dispatchToQuery(event), /12 meses/);
  assert.match(dispatchToQuery(event), /A2UI_DISPATCH/);
  assert.throws(() => createDispatch(payload, 'projection_confirm', { projection_term: 7 }));
  assert.throws(() => createDispatch(payload, 'projection_term', {}));
});

test('sends the actual chat contract without MCP credentials or unsupported request fields', async () => {
  let called = false;
  const result = await requestAgent({ ...options, query: ' Revisar suscripciones ', fetchImpl: async (url, init) => {
    called = true;
    assert.equal(url, 'https://agent.example.com/api/v1/agent/chat');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { query: 'Revisar suscripciones', persona: 'luis' });
    assert.deepEqual(init.headers, { 'Content-Type': 'application/json', Accept: 'application/json' });
    return new Response(JSON.stringify(fixtures[1]), { status: 200 });
  } });
  assert.equal(called, true);
  assert.equal(result.template_id, 'Template_Subscriptions');
});

test('missing deployment URL never makes a network request or uses localhost', async () => {
  let called = false;
  await assert.rejects(requestAgent({ ...options, baseUrl: '', fetchImpl: async () => { called = true; } }), { code: 'configuration' });
  assert.equal(called, false);
});

test('malformed and incompatible agent responses fail recoverably', async () => {
  for (const body of ['not json', JSON.stringify({ ...fixtures[0], version: 'unknown' })]) {
    await assert.rejects(requestAgent({ ...options, fetchImpl: async () => new Response(body) }), { code: 'contract' });
  }
});

test('HTTP failures do not expose backend error text', async () => {
  await assert.rejects(requestAgent({ ...options, fetchImpl: async () => new Response('private database error', { status: 500 }) }), (error) => {
    assert.equal(error.code, 'response');
    assert.doesNotMatch(error.message, /database/);
    return true;
  });
});

test('network errors, timeout and cancellation are distinct', async () => {
  await assert.rejects(requestAgent({ ...options, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), { code: 'network' });
  const pendingFetch = (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  await assert.rejects(requestAgent({ ...options, timeoutMs: 5, fetchImpl: pendingFetch }), { code: 'timeout' });
  const controller = new AbortController();
  const pending = requestAgent({ ...options, signal: controller.signal, fetchImpl: pendingFetch });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});


test('a request cancelled before sending never reaches the transport', async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(requestAgent({ ...options, signal: controller.signal, fetchImpl: async () => { called = true; } }), { name: 'AbortError' });
  assert.equal(called, false);
});

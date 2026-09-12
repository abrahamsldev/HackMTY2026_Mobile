import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { requestAgent, requestAgentAction, parseAgentReply } from '../src/features/assistant/agent.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/agent-responses.json', import.meta.url)));
const messages = fixture.databaseOverview;
const options = { baseUrl: 'https://agent.example.com', query: 'Revisar base', persona: 'luis' };

test('extracts ordered official messages from the application transport wrapper', async () => {
  const result = await requestAgent({ ...options, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://agent.example.com/api/v1/agent/chat');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { query: 'Revisar base', persona: 'luis' });
    return new Response(JSON.stringify({
      message: 'Resumen disponible', data: {}, a2ui: { resource_uri: 'a2ui://database/overview', messages },
    }));
  } });
  assert.deepEqual(result.messages, messages);
  assert.equal(result.a2uiError, null);
});

test('plain text and invalid A2UI remain recoverable transport results', () => {
  assert.deepEqual(parseAgentReply({ message: 'Hola', data: {}, a2ui: null }), {
    message: 'Hola', messages: null, a2uiError: null,
  });
  const invalid = parseAgentReply({
    message: 'Conserva este texto', data: {},
    a2ui: { resourceUri: 'a2ui://database/overview', messages: [{ version: 'a2ui/v1' }] },
  });
  assert.equal(invalid.message, 'Conserva este texto');
  assert.equal(invalid.messages, null);
  assert.ok(invalid.a2uiError);
  assert.throws(() => parseAgentReply(messages[0]), { code: 'contract' });
});

test('structured actions keep the official five fields behind legacy query serialization', async () => {
  const action = {
    name: 'refresh_database_overview', surfaceId: 'database-overview',
    sourceComponentId: 'refresh_button', timestamp: '2026-09-12T12:00:00.000Z', context: { limit: 50 },
  };
  await requestAgentAction({
    baseUrl: options.baseUrl, persona: 'ana', action,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body).sort(), ['persona', 'query']);
      assert.match(body.query, /Acción A2UI:/);
      assert.match(body.query, /refresh_database_overview/);
      return new Response(JSON.stringify({ message: 'Actualizado', data: {}, a2ui: null }));
    },
  });
});

test('missing deployment URL never makes a network request or uses localhost', async () => {
  let called = false;
  await assert.rejects(
    requestAgent({ ...options, baseUrl: '', fetchImpl: async () => { called = true; } }),
    { code: 'configuration' },
  );
  assert.equal(called, false);
});

test('malformed responses and HTTP failures are sanitized', async () => {
  await assert.rejects(
    requestAgent({ ...options, fetchImpl: async () => new Response('not json') }),
    { code: 'contract' },
  );
  await assert.rejects(
    requestAgent({ ...options, fetchImpl: async () => new Response('private database error', { status: 500 }) }),
    (error) => error.code === 'response' && !/database/u.test(error.message),
  );
});

test('network errors, 60-second-compatible timeout and cancellation stay distinct', async () => {
  await assert.rejects(
    requestAgent({ ...options, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }),
    { code: 'network' },
  );
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
  await assert.rejects(
    requestAgent({ ...options, signal: controller.signal, fetchImpl: async () => { called = true; } }),
    { name: 'AbortError' },
  );
  assert.equal(called, false);
});

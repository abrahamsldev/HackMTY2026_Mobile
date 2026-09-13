import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';

import {
  agentStatusCopy,
  agentStatusFallbackCopy,
  agentStatusIds,
  agentStatusLabel,
  isAgentStatusId,
} from '../src/features/assistant/agent-status.ts';
import {
  createNdjsonReader,
  parseAgentStreamLine,
  requestAgent,
  requestAgentStream,
} from '../src/features/assistant/agent.ts';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const fixture = JSON.parse(readFileSync(new URL('./fixtures/agent-responses.json', import.meta.url)));
const messages = fixture.databaseOverview;
const USER = 'c1a3797d-b335-5a9d-98a1-402311f82c7a';
const TOKEN = 'test-session-access-token';
const options = { baseUrl: 'https://agent.example.com', query: 'Revisar base', userId: USER, accessToken: TOKEN };
const reply = { message: 'Resumen disponible', data: {}, a2ui: { resource_uri: 'a2ui://database/overview', messages } };
const resultLine = JSON.stringify({ type: 'result', result: reply });
const statusLine = status => JSON.stringify({ type: 'agent_status', status });

// The four sequences the orchestrator actually emits, per
// hackmty2026/tests/test_agent_status.py. `interpreting` repeats on purpose.
const backendSequences = [
  ['interpreting', 'interpreting', 'discovering_tools', 'selecting_tools', 'executing_tools', 'interpreting_results', 'building_ui', 'validating_ui'],
  ['interpreting', 'preparing_action', 'building_ui', 'validating_ui'],
  ['interpreting', 'discovering_tools', 'selecting_tools', 'executing_tools', 'interpreting_results', 'preparing_action', 'building_ui', 'validating_ui'],
  ['interpreting'],
];

/**
 * The smallest XMLHttpRequest the streaming reader needs: cumulative
 * `responseText`, one progress event per chunk, then load. `chunks` are written
 * verbatim so a line can be split across two progress events.
 */
function fakeXhr({ status = 200, contentType = 'application/x-ndjson', chunks = [], onSend } = {}) {
  const calls = { opened: [], headers: {}, body: undefined, aborted: 0 };
  class FakeXMLHttpRequest {
    readyState = 0;
    status = 0;
    responseText = '';
    open(method, url) { calls.opened.push([method, url]); this.readyState = 1; }
    setRequestHeader(name, value) { calls.headers[name] = value; }
    getResponseHeader(name) { return name.toLowerCase() === 'content-type' ? contentType : null; }
    abort() { calls.aborted += 1; this.onabort?.(); }
    send(body) {
      calls.body = body;
      if (onSend) return onSend(this);
      this.status = status;
      this.readyState = 2;
      this.onreadystatechange?.();
      for (const chunk of chunks) {
        this.responseText += chunk;
        this.readyState = 3;
        this.onprogress?.();
      }
      this.readyState = 4;
      this.onload?.();
    }
  }
  return { calls, install: () => { globalThis.XMLHttpRequest = FakeXMLHttpRequest; } };
}

async function withXhr(config, run) {
  const previous = globalThis.XMLHttpRequest;
  const xhr = fakeXhr(config);
  xhr.install();
  try {
    return await run(xhr.calls);
  } finally {
    if (previous === undefined) delete globalThis.XMLHttpRequest;
    else globalThis.XMLHttpRequest = previous;
  }
}

test('the copy map covers exactly the eight backend status ids', () => {
  assert.deepEqual([...agentStatusIds], [
    'interpreting', 'discovering_tools', 'selecting_tools', 'executing_tools',
    'interpreting_results', 'preparing_action', 'building_ui', 'validating_ui',
  ]);
  assert.deepEqual(Object.keys(agentStatusCopy).toSorted(), [...agentStatusIds].toSorted());
  for (const id of agentStatusIds) {
    assert.equal(typeof agentStatusCopy[id], 'string');
    assert.ok(agentStatusCopy[id].trim().length > 0, id);
    assert.equal(agentStatusLabel(id), agentStatusCopy[id]);
    assert.equal(isAgentStatusId(id), true);
  }
  assert.ok(agentStatusFallbackCopy.trim().length > 0);
  // Every real backend sequence resolves end to end, in any subset or order.
  for (const sequence of backendSequences) {
    assert.deepEqual(sequence.map(agentStatusLabel).filter(label => label === null), []);
  }
});

test('unknown, absent and prototype status ids resolve to no copy at all', () => {
  for (const value of ['pondering', 'INTERPRETING', 'interpreting ', '', 'toString', 'constructor', null, undefined, 7, {}, ['interpreting']]) {
    assert.equal(isAgentStatusId(value), false, String(value));
    assert.equal(agentStatusLabel(value), null, String(value));
  }
});

test('the status module can never advance a phase by itself', () => {
  const copy = source('../src/features/assistant/agent-status.ts');
  const label = source('../src/features/assistant/components/assistant-typing-indicator.tsx');
  for (const text of [copy, label]) {
    for (const clock of ['setTimeout', 'setInterval', 'requestAnimationFrame', 'Date.now', 'performance.now']) {
      assert.equal(text.includes(clock), false, clock);
    }
  }
  // No imports at all in the copy module: nothing to drive it but its caller.
  assert.doesNotMatch(copy, /^import\s/mu);
  // The hook stores what arrives on the stream and nothing else.
  const hook = source('../src/features/assistant/use-assistant.ts');
  assert.match(hook, /onStatus: next =>/u);
  for (const call of hook.match(/setStatus\([^)]*/gu) ?? []) {
    assert.ok(/setStatus\(null|setStatus\(current =>/u.test(call), call);
  }
});

test('NDJSON lines yield the statuses in order and exactly one result', () => {
  const reader = createNdjsonReader();
  const text = `${backendSequences[0].map(statusLine).join('\n')}\n${resultLine}\n`;
  const events = reader.read(text);
  assert.deepEqual(events.map(event => event.type), [...backendSequences[0].map(() => 'agent_status'), 'result']);
  assert.deepEqual(events.filter(event => event.type === 'agent_status').map(event => event.status), backendSequences[0]);
  assert.deepEqual(events.at(-1).result, reply);
  // Already-consumed lines are never replayed.
  assert.deepEqual(reader.read(text), []);
});

test('a line split across progress events stays buffered until its newline', () => {
  const reader = createNdjsonReader();
  const whole = `${statusLine('interpreting')}\n${statusLine('building_ui')}\n`;
  let text = whole.slice(0, 20);
  assert.deepEqual(reader.read(text), []);
  text += whole.slice(20, whole.indexOf('\n') + 1);
  assert.deepEqual(reader.read(text).map(event => event.status), ['interpreting']);
  text = whole;
  assert.deepEqual(reader.read(text).map(event => event.status), ['building_ui']);
  // A final line without a trailing newline only arrives on flush.
  const tail = `${text}${resultLine}`;
  assert.deepEqual(reader.read(tail), []);
  assert.deepEqual(reader.flush(tail).map(event => event.type), ['result']);
});

test('unknown status ids, unknown events and malformed lines are dropped, not fatal', () => {
  assert.equal(parseAgentStreamLine(statusLine('pondering')), null);
  assert.equal(parseAgentStreamLine('{"type":"agent_status"}'), null);
  assert.equal(parseAgentStreamLine('{"type":"thought","text":"the user is overdrawn"}'), null);
  assert.equal(parseAgentStreamLine('{ not json'), null);
  assert.equal(parseAgentStreamLine('[1,2]'), null);
  assert.equal(parseAgentStreamLine('null'), null);
  assert.equal(parseAgentStreamLine('   '), null);
  const reader = createNdjsonReader();
  const events = reader.read([
    statusLine('interpreting'), '{ not json', statusLine('pondering'),
    '{"type":"agent_status","status":"building_ui","thought":"private"}', resultLine, '',
  ].join('\n'));
  assert.deepEqual(events.map(event => event.status ?? event.type), ['interpreting', 'building_ui', 'result']);
});

test('a streamed turn reports every phase and resolves the same reply as the plain route', async () => {
  const seen = [];
  // The repeated `interpreting` line is deliberately cut in half, so the
  // second progress event is what completes it.
  const streamed = `${statusLine('interpreting')}\n${statusLine('interpreting')}\n${statusLine('executing_tools')}\n`;
  const cut = streamed.indexOf('\n') + 20;
  const chunks = [
    streamed.slice(0, cut),
    streamed.slice(cut),
    `${statusLine('pondering')}\n{ not json\n`,
    `${resultLine}\n`,
  ];
  const result = await withXhr({ chunks }, calls => requestAgentStream({
    ...options,
    onStatus: status => seen.push(status),
    fetchImpl: async () => assert.fail('the streaming route must not fall back'),
  }).then(value => {
    assert.deepEqual(calls.opened, [['POST', 'https://agent.example.com/api/v1/agent/chat/stream']]);
    assert.deepEqual(calls.headers, {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      Authorization: `Bearer ${TOKEN}`,
    });
    assert.deepEqual(JSON.parse(calls.body), { query: 'Revisar base', user_id: USER });
    return value;
  }));
  // The repeated `interpreting` reaches the hook twice; deduping is the hook's
  // job, and the unknown id never arrives at all.
  assert.deepEqual(seen, ['interpreting', 'interpreting', 'executing_tools']);
  assert.deepEqual(result.messages, messages);
  assert.equal(result.a2uiError, null);
});

test('a deployment without the streaming route falls back to the plain endpoint', async () => {
  for (const config of [
    { status: 404, contentType: 'application/json', chunks: ['{"detail":"Not Found"}'] },
    { status: 405, chunks: [] },
    { status: 200, contentType: 'application/json', chunks: [JSON.stringify(reply)] },
    { status: 200, contentType: 'text/html', chunks: ['<html>proxy</html>'] },
  ]) {
    let fallbackUrl;
    const result = await withXhr(config, () => requestAgentStream({
      ...options,
      onStatus: () => assert.fail('no phase may be reported without a stream'),
      fetchImpl: async (url, init) => {
        fallbackUrl = url;
        assert.equal(init.headers.Accept, 'application/json');
        return new Response(JSON.stringify(reply));
      },
    }));
    assert.equal(fallbackUrl, 'https://agent.example.com/api/v1/agent/chat');
    assert.deepEqual(result.messages, messages);
  }
});

test('a platform without XMLHttpRequest still answers through the plain endpoint', async () => {
  const previous = globalThis.XMLHttpRequest;
  delete globalThis.XMLHttpRequest;
  try {
    let called = 0;
    const result = await requestAgentStream({
      ...options,
      onStatus: () => assert.fail('no phase may be reported without a stream'),
      fetchImpl: async (url) => {
        called += 1;
        assert.equal(url, 'https://agent.example.com/api/v1/agent/chat');
        return new Response(JSON.stringify(reply));
      },
    });
    assert.equal(called, 1);
    assert.deepEqual(result.messages, messages);
  } finally {
    if (previous === undefined) delete globalThis.XMLHttpRequest;
    else globalThis.XMLHttpRequest = previous;
  }
});

test('structured A2UI actions never take the streaming route', async () => {
  const action = {
    name: 'refresh_database_overview', surfaceId: 'database-overview',
    sourceComponentId: 'refresh_button', timestamp: '2026-09-12T12:00:00.000Z', context: { limit: 50 },
  };
  await withXhr({ chunks: [resultLine] }, calls => requestAgentStream({
    ...options, action,
    onStatus: () => assert.fail('actions report no phases'),
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://agent.example.com/api/v1/agent/chat');
      assert.deepEqual(JSON.parse(init.body).action, action);
      return new Response(JSON.stringify({ message: 'Actualizado', data: {}, a2ui: null }));
    },
  }).then(() => assert.deepEqual(calls.opened, [])));
});

test('the streaming route keeps every guarantee of the plain one', async () => {
  const guarded = { onStatus: () => assert.fail('nothing may be reported'), fetchImpl: async () => assert.fail('nothing may be sent') };
  await withXhr({}, async calls => {
    for (const [patch, code] of [
      [{ baseUrl: '' }, 'configuration'],
      [{ baseUrl: 'http://agent.example.com' }, 'configuration'],
      [{ baseUrl: 'https://user:pass@agent.example.com' }, 'configuration'],
      [{ query: 'x'.repeat(8_001) }, 'response'],
      [{ query: '   ' }, 'response'],
      [{ userId: 'not-a-uuid' }, 'configuration'],
      [{ accessToken: '' }, 'authentication'],
      [{ accessToken: 'token with space' }, 'authentication'],
    ]) {
      await assert.rejects(requestAgentStream({ ...options, ...guarded, ...patch }), { code });
    }
    assert.deepEqual(calls.opened, []);
  });

  // Response size cap: aborted mid-stream, never parsed, never retried.
  await withXhr({ chunks: [`${'x'.repeat(1_000_001)}\n`] }, () => assert.rejects(
    requestAgentStream({ ...options, onStatus: () => {}, fetchImpl: async () => assert.fail('an oversized stream must not be retried') }),
    { code: 'contract', message: 'La respuesta del agente es demasiado grande.' },
  ));

  // A stream that ends without a result is a contract failure, not a retry.
  await withXhr({ chunks: [`${statusLine('interpreting')}\n`] }, () => assert.rejects(
    requestAgentStream({ ...options, onStatus: () => {}, fetchImpl: async () => assert.fail('a half-finished turn must not be replayed') }),
    { code: 'contract', message: 'El agente devolvió una respuesta que no se puede mostrar.' },
  ));

  // Authentication and server failures keep their own codes.
  for (const [status, code] of [[401, 'authentication'], [403, 'authentication'], [422, 'response'], [500, 'response']]) {
    await withXhr({ status, chunks: [] }, () => assert.rejects(
      requestAgentStream({ ...options, onStatus: () => {}, fetchImpl: async () => assert.fail('no retry on a real answer') }),
      { code },
    ));
  }
});

test('cancellation and the 60-second-compatible timeout stay distinct while streaming', async () => {
  const stalled = { onSend: () => {} };
  await withXhr(stalled, () => assert.rejects(
    requestAgentStream({ ...options, timeoutMs: 5, onStatus: () => {}, fetchImpl: async () => assert.fail('a timeout must not be retried') }),
    { code: 'timeout' },
  ));
  await withXhr(stalled, () => {
    const controller = new AbortController();
    const pending = requestAgentStream({
      ...options, signal: controller.signal, onStatus: () => {},
      fetchImpl: async () => assert.fail('a cancelled turn must not be retried'),
    });
    controller.abort();
    return assert.rejects(pending, { name: 'AbortError' });
  });
  await withXhr(stalled, async calls => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      requestAgentStream({ ...options, signal: controller.signal, onStatus: () => {}, fetchImpl: async () => assert.fail('nothing may be sent') }),
      { name: 'AbortError' },
    );
    assert.deepEqual(calls.opened, []);
  });
});

test('the plain endpoint keeps working untouched', async () => {
  const result = await requestAgent({ ...options, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://agent.example.com/api/v1/agent/chat');
    assert.deepEqual(init.headers, {
      'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${TOKEN}`,
    });
    return new Response(JSON.stringify(reply));
  } });
  assert.deepEqual(result.messages, messages);
});

test('assistant components import interactive primitives from the accessible module', () => {
  const directory = new URL('../src/features/assistant/components/', import.meta.url);
  const files = readdirSync(directory).filter(name => name.endsWith('.tsx'));
  assert.ok(files.length > 0);
  for (const name of files) {
    const text = readFileSync(new URL(name, directory), 'utf8');
    const reactNativeImports = text.match(/import\s*\{[^}]*\}\s*from\s*'react-native'/gu) ?? [];
    for (const statement of reactNativeImports) {
      assert.doesNotMatch(statement, /\bPressable\b/u, `${name} must import Pressable from @/components/accessible-primitives`);
      assert.doesNotMatch(statement, /\bTouchableOpacity\b/u, name);
    }
  }
});

test('the orb is decorative and the label under it carries the meaning', () => {
  const orb = source('../src/features/assistant/components/banorte-loader-icon.tsx');
  assert.match(orb, /accessible=\{false\}/u);
  for (const host of ['floating-chat-bubble', 'voice-processing-overlay']) {
    const text = source(`../src/features/assistant/components/${host}.tsx`);
    assert.match(text, /AgentStatusLabel/u, host);
  }
  // No fixed height on the label's container: the copy must be able to wrap.
  const label = source('../src/features/assistant/components/assistant-typing-indicator.tsx');
  const container = label.slice(label.indexOf('statusLabelContainer:'), label.indexOf('statusLabelCentered:'));
  assert.match(container, /minHeight:/u);
  assert.doesNotMatch(container, /\bheight:/u);
  assert.match(label, /accessibilityLiveRegion="polite"/u);
  assert.match(label, /accessibilityRole="progressbar"/u);
  assert.match(label, /settings\.reduceMotion/u);
});

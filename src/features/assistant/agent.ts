import { extractA2UITransportReply } from '../a2ui/transport.ts';
import type { A2UIAction, A2UIMessage } from '../a2ui/types.ts';
import { isAgentStatusId, type AgentStatusId } from './agent-status.ts';
import { z } from 'zod';

const MAX_RESPONSE_CHARS = 1_000_000;
const NDJSON_MEDIA_TYPE = 'application/x-ndjson';

export type AgentReply = {
  message: string;
  messages: A2UIMessage[] | null;
  a2uiError: string | null;
  actionResult?: { status: 'success' | 'failure'; message: string; code?: string };
};

export function parseAgentReply(input: unknown): AgentReply {
  try {
    return extractA2UITransportReply(input);
  } catch {
    throw new AgentRequestError(
      'contract',
      'La respuesta recibida no es compatible. Puedes intentar otra consulta.',
    );
  }
}

export class AgentRequestError extends Error {
  code: 'configuration' | 'network' | 'timeout' | 'response' | 'contract' | 'authentication';

  constructor(code: AgentRequestError['code'], message: string) {
    super(message);
    this.name = 'AgentRequestError';
    this.code = code;
  }
}

export type AgentRequestOptions = {
  baseUrl: string;
  query: string;
  action?: A2UIAction;
  userId: string;
  accountId: string;
  accessToken: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/**
 * Validates every guarantee of this transport before a byte leaves the device:
 * an https origin with no credentials, query or fragment; a query within the
 * 8000-character cap; a real user uuid and a real bank-account uuid; a
 * whitespace-free bearer token. Both the plain and the streaming route share it
 * so neither can drift.
 */
function prepareAgentRequest(
  {
    baseUrl,
    query,
    action,
    userId,
    accountId,
    accessToken,
  }: Pick<AgentRequestOptions, 'baseUrl' | 'query' | 'action' | 'userId' | 'accountId' | 'accessToken'>,
  path: '' | '/stream',
): { url: string; body: string; headers: Record<string, string> } {
  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/agent/chat${path}`);
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash
    ) throw new Error();
  } catch {
    throw new AgentRequestError('configuration', 'Falta configurar la dirección del agente.');
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery || normalizedQuery.length > 8_000) {
    throw new AgentRequestError('response', 'Escribe una consulta de hasta 8000 caracteres.');
  }
  const parsedUserId = z.uuid().safeParse(userId);
  if (!parsedUserId.success) {
    throw new AgentRequestError('configuration', 'La cuenta no tiene un identificador válido.');
  }
  const parsedAccountId = z.uuid().safeParse(accountId);
  if (!parsedAccountId.success) {
    throw new AgentRequestError('configuration', 'La cuenta bancaria no tiene un identificador válido.');
  }
  if (!accessToken || /\s/.test(accessToken)) throw new AgentRequestError('authentication', 'Inicia sesión para consultar al asistente.');

  return {
    url: endpoint.toString(),
    body: JSON.stringify({
      ...(action ? { action } : { query: normalizedQuery }),
      user_id: parsedUserId.data,
      account_id: parsedAccountId.data,
    }),
    headers: {
      'Content-Type': 'application/json',
      Accept: path ? NDJSON_MEDIA_TYPE : 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  };
}

function agentHttpError(status: number): AgentRequestError {
  return new AgentRequestError(
    status === 401 || status === 403 ? 'authentication' : 'response',
    status === 422
      ? 'El agente no pudo procesar la consulta de esta cuenta.'
      : status === 401 || status === 403
      ? 'Tu sesión no tiene acceso al agente. Vuelve a iniciar sesión.'
      : 'El agente no pudo atender la consulta. Inténtalo de nuevo.',
  );
}

function oversizedResponseError(): AgentRequestError {
  return new AgentRequestError('contract', 'La respuesta del agente es demasiado grande.');
}

function unreadableResponseError(): AgentRequestError {
  return new AgentRequestError('contract', 'El agente devolvió una respuesta que no se puede mostrar.');
}

function abortedError(): Error {
  const aborted = new Error('Consulta cancelada.');
  aborted.name = 'AbortError';
  return aborted;
}

/** The two line shapes the streaming route may emit, once validated. */
export type AgentStreamEvent =
  | { type: 'agent_status'; status: AgentStatusId }
  | { type: 'result'; result: unknown };

/**
 * One NDJSON line, or `null` when it carries nothing this client can use:
 * malformed JSON, a non-object, an unknown event type or an unknown status id.
 * Dropping instead of throwing is deliberate — a line the client cannot read
 * must never end a turn that is still going to deliver a result.
 */
export function parseAgentStreamLine(line: string): AgentStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as { type?: unknown; status?: unknown; result?: unknown };
  if (record.type === 'agent_status') {
    return isAgentStatusId(record.status) ? { type: 'agent_status', status: record.status } : null;
  }
  if (record.type === 'result') return { type: 'result', result: record.result };
  return null;
}

/**
 * Reads newline-delimited events out of the incrementally growing text of one
 * response. `XMLHttpRequest.responseText` is cumulative, so the reader keeps a
 * byte offset and only ever emits lines it has seen terminated: a line split
 * across two progress events stays buffered until its newline arrives.
 */
export function createNdjsonReader() {
  let consumed = 0;
  function read(text: string): AgentStreamEvent[] {
    const events: AgentStreamEvent[] = [];
    for (;;) {
      const index = text.indexOf('\n', consumed);
      if (index === -1) return events;
      const event = parseAgentStreamLine(text.slice(consumed, index));
      consumed = index + 1;
      if (event) events.push(event);
    }
  }
  return {
    read,
    /** Completed response: the last line may have no trailing newline. */
    flush(text: string): AgentStreamEvent[] {
      const events = read(text);
      const tail = text.slice(consumed);
      consumed = text.length;
      const event = tail ? parseAgentStreamLine(tail) : null;
      return event ? [...events, event] : events;
    },
  };
}

/** Internal signal: the stream route is not usable, so retry the plain route. */
class StreamUnavailableError extends Error {}

export type AgentStreamOptions = AgentRequestOptions & {
  onStatus?: (status: AgentStatusId) => void;
};

/**
 * Runs one query turn over the NDJSON route, reporting each coarse phase to
 * `onStatus` as its line arrives, and returns the same reply the plain route
 * returns. Falls back to the plain route whenever the stream is not usable: no
 * `XMLHttpRequest`, a deployment without the route, or a response that is not
 * `application/x-ndjson`. Structured A2UI actions always take the plain route —
 * the orchestrator reports no phases for them, so there is nothing to stream
 * and no reason to risk running an action twice.
 */
export async function requestAgentStream(options: AgentStreamOptions): Promise<AgentReply> {
  const { onStatus, ...request } = options;
  if (!onStatus || request.action) return requestAgent(request);
  try {
    return await streamAgentTurn(request, onStatus);
  } catch (error) {
    if (error instanceof StreamUnavailableError) return requestAgent(request);
    throw error;
  }
}

function streamAgentTurn(
  { baseUrl, query, userId, accountId, accessToken, signal, timeoutMs = 60_000 }: AgentRequestOptions,
  onStatus: (status: AgentStatusId) => void,
): Promise<AgentReply> {
  const prepared = prepareAgentRequest({ baseUrl, query, userId, accountId, accessToken }, '/stream');
  if (signal?.aborted) throw abortedError();
  // React Native's `fetch` does not expose `response.body` as a readable
  // stream, so incremental reads go through XMLHttpRequest, which grows
  // `responseText` on every progress event on native and on web alike.
  const XHR = (globalThis as { XMLHttpRequest?: typeof XMLHttpRequest }).XMLHttpRequest;
  if (!XHR) throw new StreamUnavailableError();

  return new Promise<AgentReply>((resolve, reject) => {
    const xhr = new XHR();
    const reader = createNdjsonReader();
    let result: unknown;
    let sawResult = false;
    let timedOut = false;
    let unavailable = false;
    let oversized = false;
    let done = false;

    const cancel = () => xhr.abort();
    const timeout = setTimeout(() => {
      timedOut = true;
      xhr.abort();
    }, timeoutMs);
    signal?.addEventListener('abort', cancel, { once: true });

    function settle(action: () => void) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
      action();
    }

    function isNdjson() {
      return (xhr.getResponseHeader('Content-Type') ?? '').toLowerCase().includes(NDJSON_MEDIA_TYPE);
    }

    function consume(final: boolean) {
      const text = xhr.responseText ?? '';
      if (text.length > MAX_RESPONSE_CHARS) {
        oversized = true;
        xhr.abort();
        return;
      }
      for (const event of final ? reader.flush(text) : reader.read(text)) {
        if (event.type === 'result') {
          result = event.result;
          sawResult = true;
        } else {
          onStatus(event.status);
        }
      }
    }

    xhr.onreadystatechange = () => {
      // Headers received: a deployment without the route, or one answering with
      // anything but NDJSON, is decided here, before any body is interpreted.
      if (done || xhr.readyState !== 2) return;
      if (xhr.status === 404 || xhr.status === 405 || xhr.status === 501 || !isNdjson()) {
        unavailable = true;
        xhr.abort();
      }
    };
    xhr.onprogress = () => {
      if (!done) consume(false);
    };
    xhr.onload = () => {
      if (done) return;
      if (unavailable || xhr.status === 404 || xhr.status === 405 || xhr.status === 501 || !isNdjson()) {
        return settle(() => reject(new StreamUnavailableError()));
      }
      if (xhr.status < 200 || xhr.status >= 300) return settle(() => reject(agentHttpError(xhr.status)));
      consume(true);
      if (oversized) return settle(() => reject(oversizedResponseError()));
      if (!sawResult) return settle(() => reject(unreadableResponseError()));
      try {
        const reply = parseAgentReply(result);
        settle(() => resolve(reply));
      } catch (error) {
        settle(() => reject(error));
      }
    };
    xhr.onabort = () => settle(() => {
      if (oversized) return reject(oversizedResponseError());
      if (signal?.aborted) return reject(abortedError());
      if (timedOut) {
        return reject(new AgentRequestError('timeout', 'El agente tardó demasiado en responder. Inténtalo de nuevo.'));
      }
      reject(new StreamUnavailableError());
    });
    // A transport failure on the streaming route says nothing about the plain
    // one; the retry reports the real network error with its own message.
    xhr.onerror = () => settle(() => reject(new StreamUnavailableError()));

    try {
      xhr.open('POST', prepared.url, true);
      for (const [header, value] of Object.entries(prepared.headers)) {
        xhr.setRequestHeader(header, value);
      }
      xhr.send(prepared.body);
    } catch {
      settle(() => reject(new StreamUnavailableError()));
    }
  });
}

export async function transcribeAudioWebhook({
  endpointUrl,
  uri,
  signal,
  timeoutMs = 60_000,
  fetchImpl = fetch,
}: {
  endpointUrl: string;
  uri: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  let endpoint: URL;
  try {
    endpoint = new URL(endpointUrl);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error();
    }
  } catch {
    throw new AgentRequestError('configuration', 'Falta configurar el webhook de transcripción.');
  }
  if (!uri) throw new AgentRequestError('response', 'No se encontró la grabación de audio.');

  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    // n8n's Webhook node reads the upload from the binary property named "data".
    let status: number;
    let responseText: string;
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      // expo-audio's web recorder yields a `blob:` object URL: it only holds
      // a MediaRecorder Blob in page memory, so it must be fetched into a
      // real Blob before it can be attached to FormData.
      let recordingBlob: Blob;
      try {
        const source = await fetch(uri);
        if (!source.ok) throw new Error(`local read responded ${source.status}`);
        recordingBlob = await source.blob();
      } catch (readError) {
        console.error('[assistant] failed to read recording uri', uri, readError);
        throw new AgentRequestError('response', 'No se pudo leer la grabación de audio.');
      }
      if (recordingBlob.size === 0) {
        throw new AgentRequestError('response', 'La grabación de audio está vacía.');
      }
      const mimeType = recordingBlob.type || 'audio/webm';
      const extension = mimeType.includes('wav')
        ? 'wav'
        : mimeType.includes('mpeg') || mimeType.includes('mp3')
        ? 'mp3'
        : mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('mp4') || mimeType.includes('m4a')
        ? 'm4a'
        : 'webm';
      const formBody = new FormData();
      formBody.append('data', recordingBlob, `recording.${extension}`);
      const response = await fetchImpl(endpoint.toString(), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formBody,
        signal: controller.signal,
      });
      status = response.status;
      responseText = await response.text();
    } else {
      // Native `file://` recordings: expo-file-system's native upload task
      // reads and streams the file straight from disk. This replaces RN's
      // classic `{ uri, name, type }` FormData shape, which goes through the
      // same generic fetch/XHR bridge as every other request and has a long
      // history of failing multipart uploads with a bare "Network request
      // failed" on some Android/iOS combinations, even though a plain GET
      // to the same host succeeds.
      const { File, UploadType } = await import('expo-file-system');
      let uploadResult: { status: number; body: string };
      try {
        uploadResult = await new File(uri).upload(endpoint.toString(), {
          httpMethod: 'POST',
          uploadType: UploadType.MULTIPART,
          fieldName: 'data',
          mimeType: 'audio/m4a',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch (uploadError) {
        console.error('[assistant] failed to upload recording', uri, uploadError);
        throw new AgentRequestError('network', 'No se pudo conectar con el webhook de transcripción de n8n.');
      }
      status = uploadResult.status;
      responseText = uploadResult.body;
    }

    if (status < 200 || status >= 300) {
      console.error('[assistant] n8n webhook responded', status, responseText);
      throw new AgentRequestError(
        'response',
        status === 404
          ? 'No se encontró el webhook de transcripción de n8n.'
          : 'n8n no pudo transcribir el audio.',
      );
    }
    let data: { text?: unknown; transcription?: unknown } | null = null;
    try {
      data = JSON.parse(responseText) as { text?: unknown; transcription?: unknown };
    } catch {
      // Some webhook workflows return the transcription as plain text.
    }
    const text = typeof data?.text === 'string'
      ? data.text
      : typeof data?.transcription === 'string'
      ? data.transcription
      : responseText;
    if (!text.trim()) {
      throw new AgentRequestError('response', 'No se detectó ninguna voz en la grabación. Intenta de nuevo hablando más cerca del micrófono.');
    }
    if (text.length > 8_000) {
      throw new AgentRequestError('contract', 'La transcripción recibida es demasiado larga. Intenta con una consulta más breve.');
    }
    return text.trim();
  } catch (error) {
    if (signal?.aborted) {
      const aborted = new Error('Transcripción cancelada.');
      aborted.name = 'AbortError';
      throw aborted;
    }
    if (timedOut) throw new AgentRequestError('timeout', 'La transcripción tardó demasiado. Inténtalo de nuevo.');
    if (error instanceof AgentRequestError) throw error;
    console.error('[assistant] transcribeAudioWebhook network failure', error);
    throw new AgentRequestError('network', 'No se pudo conectar con el webhook de transcripción de n8n.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function requestAgent({
  baseUrl,
  query,
  action,
  userId,
  accountId,
  accessToken,
  signal,
  timeoutMs = 60_000,
  fetchImpl = fetch,
}: AgentRequestOptions): Promise<AgentReply> {
  const prepared = prepareAgentRequest({ baseUrl, query, action, userId, accountId, accessToken }, '');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    if (controller.signal.aborted) throw new Error('Consulta cancelada.');
    const response = await fetchImpl(prepared.url, {
      method: 'POST',
      headers: prepared.headers,
      body: prepared.body,
      signal: controller.signal,
    });
    if (!response.ok) throw agentHttpError(response.status);
    const body = await response.text();
    if (body.length > MAX_RESPONSE_CHARS) throw oversizedResponseError();
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      throw unreadableResponseError();
    }
    return parseAgentReply(data);
  } catch (error) {
    if (signal?.aborted) throw abortedError();
    if (timedOut) {
      throw new AgentRequestError(
        'timeout',
        'El agente tardó demasiado en responder. Inténtalo de nuevo.',
      );
    }
    if (error instanceof AgentRequestError) throw error;
    throw new AgentRequestError(
      'network',
      'No se pudo conectar con el agente. Comprueba la conexión y que el servidor esté disponible.',
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export function requestAgentAction(
  options: Omit<AgentRequestOptions, 'query'> & { action: A2UIAction },
): Promise<AgentReply> {
  const { action, ...requestOptions } = options;
  return requestAgent({ ...requestOptions, query: `Acción: ${action.name}`, action });
}

export type { A2UIAction, A2UIMessage, AgentStatusId };

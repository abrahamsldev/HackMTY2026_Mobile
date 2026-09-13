import { extractA2UITransportReply, serializeActionForLegacyChat } from '../a2ui/transport.ts';
import type { A2UIAction, A2UIMessage } from '../a2ui/types.ts';
import { z } from 'zod';

export type AgentReply = {
  message: string;
  messages: A2UIMessage[] | null;
  a2uiError: string | null;
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
  userId: string;
  accessToken: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

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
  userId,
  accessToken,
  signal,
  timeoutMs = 60_000,
  fetchImpl = fetch,
}: AgentRequestOptions): Promise<AgentReply> {
  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/agent/chat`);
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
  if (!accessToken || /\s/.test(accessToken)) throw new AgentRequestError('authentication', 'Inicia sesión para consultar al asistente.');
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
    const response = await fetchImpl(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ query: normalizedQuery, user_id: parsedUserId.data }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new AgentRequestError(
        response.status === 401 || response.status === 403 ? 'authentication' : 'response',
        response.status === 422
          ? 'El agente no pudo procesar la consulta de esta cuenta.'
          : response.status === 401 || response.status === 403
          ? 'Tu sesión no tiene acceso al agente. Vuelve a iniciar sesión.'
          : 'El agente no pudo atender la consulta. Inténtalo de nuevo.',
      );
    }
    const body = await response.text();
    if (body.length > 1_000_000) {
      throw new AgentRequestError('contract', 'La respuesta del agente es demasiado grande.');
    }
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      throw new AgentRequestError(
        'contract',
        'El agente devolvió una respuesta que no se puede mostrar.',
      );
    }
    return parseAgentReply(data);
  } catch (error) {
    if (signal?.aborted) {
      const aborted = new Error('Consulta cancelada.');
      aborted.name = 'AbortError';
      throw aborted;
    }
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
  return requestAgent({ ...requestOptions, query: serializeActionForLegacyChat(action) });
}

export type { A2UIAction, A2UIMessage };

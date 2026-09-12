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

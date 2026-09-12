import { z } from 'zod';

import { extractA2UITransportReply, serializeActionForLegacyChat } from '../a2ui/transport.ts';
import type { A2UIAction, A2UIMessage } from '../a2ui/types.ts';

// The agent identifies the user by their own login email (Supabase Auth
// session), matched against public.users.email - never a fixed demo persona.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

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
  code: 'configuration' | 'network' | 'timeout' | 'response' | 'contract';

  constructor(code: AgentRequestError['code'], message: string) {
    super(message);
    this.name = 'AgentRequestError';
    this.code = code;
  }
}

export type AgentRequestOptions = {
  baseUrl: string;
  query: string;
  email: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export async function requestAgent({
  baseUrl,
  query,
  email,
  signal,
  timeoutMs = 60_000,
  fetchImpl = fetch,
}: AgentRequestOptions): Promise<AgentReply> {
  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/agent/chat`);
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash
    ) throw new Error();
  } catch {
    throw new AgentRequestError('configuration', 'Falta configurar la dirección del agente.');
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery || normalizedQuery.length > 8_000) {
    throw new AgentRequestError('response', 'Escribe una consulta de hasta 8000 caracteres.');
  }
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    throw new AgentRequestError('configuration', 'Completa tu correo electrónico en tu perfil para usar el asistente.');
  }
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: normalizedQuery, email: parsedEmail.data }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new AgentRequestError(
        'response',
        response.status === 401 || response.status === 403
          ? 'El agente rechazó el acceso. Revisa su configuración de autenticación.'
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

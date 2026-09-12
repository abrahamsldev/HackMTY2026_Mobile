import { useEffect, useRef, useState } from 'react';

import { type A2UIAction, type A2UISurfaceState } from '../a2ui';
import { AssistantResponseProcessor } from './response-processor';
import { AgentRequestError, requestAgent, requestAgentAction, type AgentReply } from './agent';
import { supabase } from '@/lib/supabase';
import { verifySession } from '../auth/auth-service';
import { agentBaseUrl } from './connection';

type AssistantSurface = {
  reply: AgentReply;
  revision: number;
  a2uiSurfaces: readonly A2UISurfaceState[];
};

export function useAssistant(currentUserId: string) {
  const [surface, setSurface] = useState<AssistantSurface | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const request = useRef<{ id: number; controller?: AbortController }>({ id: 0 });
  const inFlight = useRef(false);
  const processor = useRef(new AssistantResponseProcessor());
  const lastRequest = useRef<{ query: string; action?: A2UIAction } | null>(null);

  useEffect(() => () => {
    request.current.controller?.abort();
    request.current.id += 1;
  }, []);

  async function run(query: string, action?: A2UIAction) {
    const normalized = query.trim();
    if (!normalized || inFlight.current) return;
    inFlight.current = true;
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = request.current.id + 1;
    request.current = { id, controller };
    lastRequest.current = { query: normalized, action };
    setLastQuery(normalized);
    setPending(true);
    setError(null);
    try {
      if (!supabase) throw new AgentRequestError('authentication', 'Inicia sesión para consultar al asistente.');
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError) throw new AgentRequestError('authentication', 'No se pudo verificar tu sesión.');
      const verified = await verifySession(supabase, data.session);
      if (!verified || verified.user.id !== currentUserId) throw new AgentRequestError('authentication', 'Inicia sesión para consultar al asistente.');
      if (controller.signal.aborted || request.current.id !== id) return;
      const accessToken = verified.access_token;
      const reply = action
        ? await requestAgentAction({ baseUrl: agentBaseUrl, action, userId: currentUserId, accessToken, signal: controller.signal })
        : await requestAgent({ baseUrl: agentBaseUrl, query: normalized, userId: currentUserId, accessToken, signal: controller.signal });
      if (request.current.id === id) {
        const processed = processor.current.process(reply.messages, !action);
        const effectiveReply = !processed.ok
          ? { ...reply, a2uiError: processed.error }
          : reply;
        setSurface({
          reply: effectiveReply,
          revision: id,
          a2uiSurfaces: processed.surfaces,
        });
      }
    } catch (cause) {
      if (request.current.id !== id || controller.signal.aborted) return;
      setError(cause instanceof AgentRequestError ? cause.message : 'No se pudo mostrar la respuesta. Inténtalo de nuevo.');
    } finally {
      if (request.current.id === id) {
        request.current.controller = undefined;
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  function send(query: string) {
    return run(query);
  }

  function cancel() {
    request.current.controller?.abort();
    request.current.id += 1;
    request.current.controller = undefined;
    inFlight.current = false;
    setPending(false);
  }

  function dispatch(action: A2UIAction) {
    return run(`Acción de interfaz: ${action.name}`, action);
  }

  function retry() {
    const previous = lastRequest.current;
    if (previous) return run(previous.query, previous.action);
  }

  return { surface, pending, error, lastQuery, send, dispatch, cancel, isConfigured: Boolean(agentBaseUrl), retry };
}

import { useEffect, useRef, useState } from 'react';

import { AgentRequestError, dispatchToQuery, requestAgent, type A2UIDispatch, type AgentReply, type Persona } from './agent';
import { agentBaseUrl } from './connection';

export function useAssistant(persona: Persona) {
  const [surface, setSurface] = useState<{ reply: AgentReply; revision: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const request = useRef<{ id: number; controller?: AbortController }>({ id: 0 });

  useEffect(() => () => {
    request.current.controller?.abort();
    request.current.id += 1;
  }, []);

  async function send(query: string) {
    const normalized = query.trim();
    if (!normalized) return;
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = request.current.id + 1;
    request.current = { id, controller };
    setLastQuery(normalized);
    setPending(true);
    setError(null);
    try {
      const reply = await requestAgent({ baseUrl: agentBaseUrl, query: normalized, persona, signal: controller.signal });
      if (request.current.id === id) setSurface({ reply, revision: id });
    } catch (cause) {
      if (request.current.id !== id || controller.signal.aborted) return;
      setError(cause instanceof AgentRequestError ? cause.message : 'No se pudo mostrar la respuesta. Inténtalo de nuevo.');
    } finally {
      if (request.current.id === id) setPending(false);
    }
  }

  function cancel() {
    request.current.controller?.abort();
    request.current.id += 1;
    setPending(false);
  }

  function dispatch(event: A2UIDispatch) {
    void send(dispatchToQuery(event));
  }

  return { surface, pending, error, lastQuery, send, dispatch, cancel, isConfigured: Boolean(agentBaseUrl), retry: () => send(lastQuery) };
}

import { useEffect, useRef, useState } from 'react';

import { A2UIMessageProcessor, type A2UIAction, type A2UISurfaceState } from '../a2ui';
import { AgentRequestError, requestAgent, requestAgentAction, type AgentReply, type Persona } from './agent';
import { agentBaseUrl } from './connection';

type AssistantSurface = {
  reply: AgentReply;
  revision: number;
  a2uiSurfaces: readonly A2UISurfaceState[];
};

export function useAssistant(persona: Persona) {
  const [surface, setSurface] = useState<AssistantSurface | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const request = useRef<{ id: number; controller?: AbortController }>({ id: 0 });
  const processor = useRef(new A2UIMessageProcessor());

  useEffect(() => () => {
    request.current.controller?.abort();
    request.current.id += 1;
  }, []);

  async function run(query: string, action?: A2UIAction) {
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
      const reply = action
        ? await requestAgentAction({ baseUrl: agentBaseUrl, action, persona, signal: controller.signal })
        : await requestAgent({ baseUrl: agentBaseUrl, query: normalized, persona, signal: controller.signal });
      if (request.current.id === id) {
        const processed = reply.messages ? processor.current.process(reply.messages) : null;
        const effectiveReply = processed && !processed.ok
          ? { ...reply, a2uiError: processed.error }
          : reply;
        setSurface((current) => ({
          reply: effectiveReply,
          revision: id,
          a2uiSurfaces: processed?.surfaces ?? current?.a2uiSurfaces ?? processor.current.snapshot(),
        }));
      }
    } catch (cause) {
      if (request.current.id !== id || controller.signal.aborted) return;
      setError(cause instanceof AgentRequestError ? cause.message : 'No se pudo mostrar la respuesta. Inténtalo de nuevo.');
    } finally {
      if (request.current.id === id) setPending(false);
    }
  }

  function send(query: string) {
    return run(query);
  }

  function cancel() {
    request.current.controller?.abort();
    request.current.id += 1;
    setPending(false);
  }

  function dispatch(action: A2UIAction) {
    void run(`Acción de interfaz: ${action.name}`, action);
  }

  return { surface, pending, error, lastQuery, send, dispatch, cancel, isConfigured: Boolean(agentBaseUrl), retry: () => send(lastQuery) };
}

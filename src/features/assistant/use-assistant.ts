import { useEffect, useRef, useState } from 'react';

import { type A2UIAction, type A2UISurfaceState } from '../a2ui';
import { AssistantResponseProcessor } from './response-processor';
import { AgentRequestError, requestAgent, requestAgentAction, transcribeAudioWebhook, type AgentReply } from './agent';
import { supabase } from '@/lib/supabase';
import { verifySession } from '../auth/auth-service';
import { agentBaseUrl, transcriptionUrl } from './connection';

type AssistantSurface = {
  reply: AgentReply;
  revision: number;
  a2uiSurfaces: readonly A2UISurfaceState[];
};

export function useAssistant(currentUserId: string) {
  const [surface, setSurface] = useState<AssistantSurface | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ status: 'pending' | 'success' | 'failure'; message: string } | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const request = useRef<{ id: number; controller?: AbortController }>({ id: 0 });
  const inFlight = useRef(false);
  const processor = useRef(new AssistantResponseProcessor());
  const lastRequest = useRef<{ query: string; action?: A2UIAction } | null>(null);

  useEffect(() => () => {
    request.current.controller?.abort();
    request.current.id += 1;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supabase) {
        if (active) {
          setAccountError('No se pudo consultar la cuenta bancaria.');
          setAccountLoading(false);
        }
        return;
      }
      let lookup;
      try {
        lookup = await supabase
          .from('accounts')
          .select('id, account_type, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: true })
          .limit(50);
      } catch {
        if (active) {
          setAccountError('No se pudo consultar la cuenta bancaria.');
          setAccountLoading(false);
        }
        return;
      }
      if (!active) return;
      const { data, error: lookupError } = lookup;
      if (lookupError || !data?.length) {
        setAccountError('No encontramos una cuenta bancaria vinculada a tu usuario.');
        setAccountLoading(false);
        return;
      }
      const priority = { checking: 0, savings: 1, credit: 2 } as const;
      const selected = [...data].sort((left, right) =>
        (priority[left.account_type as keyof typeof priority] ?? 3) -
        (priority[right.account_type as keyof typeof priority] ?? 3),
      )[0];
      setAccountId(selected.id);
      setAccountLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  async function run(query: string, action?: A2UIAction): Promise<boolean> {
    const normalized = query.trim();
    if (!normalized || inFlight.current) return false;
    inFlight.current = true;
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = request.current.id + 1;
    request.current = { id, controller };
    lastRequest.current = { query: normalized, action };
    setLastQuery(normalized);
    setPending(true);
    setError(null);
    setActionStatus(action ? { status: 'pending', message: 'Enviando acción…' } : null);
    try {
      if (!supabase) throw new AgentRequestError('authentication', 'Inicia sesión para consultar al asistente.');
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError) throw new AgentRequestError('authentication', 'No se pudo verificar tu sesión.');
      const verified = await verifySession(supabase, data.session);
      if (!verified || verified.user.id !== currentUserId) throw new AgentRequestError('authentication', 'Inicia sesión para consultar al asistente.');
      if (controller.signal.aborted || request.current.id !== id) return false;
      const accessToken = verified.access_token;
      if (!accountId) throw new AgentRequestError('configuration', accountError || 'Espera mientras cargamos tu cuenta bancaria.');
      const reply = action
        ? await requestAgentAction({ baseUrl: agentBaseUrl, action, userId: currentUserId, accountId, accessToken, signal: controller.signal })
        : await requestAgent({ baseUrl: agentBaseUrl, query: normalized, userId: currentUserId, accountId, accessToken, signal: controller.signal });
      if (request.current.id === id) {
        if (action) {
          const result = reply.actionResult ?? (reply.a2uiError
            ? { status: 'failure', message: reply.a2uiError }
            : reply.messages?.length ? null : { status: 'failure', message: reply.message || 'El servicio no confirmó el resultado de la acción.' });
          setActionStatus(result);
          if (result?.status === 'failure') return false;
          if (!reply.messages) return result?.status === 'success';
        }
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
      return true;
    } catch (cause) {
      if (request.current.id !== id || controller.signal.aborted) return false;
      if (action) setActionStatus({ status: 'failure', message: cause instanceof AgentRequestError ? cause.message : 'No se pudo confirmar el resultado. Intenta de nuevo la misma operación.' });
      if (!action) setError(cause instanceof AgentRequestError ? cause.message : 'No se pudo mostrar la respuesta. Inténtalo de nuevo.');
      return false;
    } finally {
      if (request.current.id === id) {
        request.current.controller = undefined;
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  async function transcribe(uri: string) {
    if (inFlight.current) throw new AgentRequestError('response', 'Espera a que termine la consulta actual.');
    return transcribeAudioWebhook({
      endpointUrl: transcriptionUrl,
      uri,
    });
  }

  function send(query: string) {
    return run(query).then(() => undefined);
  }

  function cancel() {
    request.current.controller?.abort();
    request.current.id += 1;
    request.current.controller = undefined;
    inFlight.current = false;
    setPending(false);
    setActionStatus(previous => previous?.status === 'pending' ? { status: 'failure', message: 'Consulta cancelada; no se pudo confirmar el resultado de la acción.' } : previous);
  }

  function dispatch(action: A2UIAction) {
    return run(`Acción de interfaz: ${action.name}`, action);
  }

  function retry() {
    const previous = lastRequest.current;
    if (previous) return run(previous.query, previous.action).then(() => undefined);
  }

  return {
    surface,
    pending,
    error,
    actionStatus,
    lastQuery,
    send,
    transcribe,
    dispatch,
    cancel,
    isConfigured: Boolean(agentBaseUrl) && Boolean(accountId) && !accountLoading,
    configurationError: accountError,
    accountId,
    retry,
  };
}

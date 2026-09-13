/**
 * Coarse agent lifecycle phases and the only copy the user ever reads for them.
 *
 * The identifiers are the frozen backend contract: the orchestrator emits
 * `{"type":"agent_status","status":"<id>"}` lines on
 * `POST /api/v1/agent/chat/stream` and nothing else about the turn's internals
 * — no prompts, no reasoning, no tool names, no rows. The client only maps an
 * id to a phrase; it never infers, times or advances a phase on its own, which
 * is why this module has no clock, no state and no imports.
 *
 * Changing what the user reads means editing `agentStatusCopy` (or
 * `agentStatusFallbackCopy`) and nothing else.
 */

/** The complete vocabulary, in the order a full turn walks through it. */
export const agentStatusIds = [
  'interpreting',
  'discovering_tools',
  'selecting_tools',
  'executing_tools',
  'interpreting_results',
  'preparing_action',
  'building_ui',
  'validating_ui',
] as const;

export type AgentStatusId = (typeof agentStatusIds)[number];

/** The one configurable map of user-facing progress copy, keyed by status id. */
export const agentStatusCopy: Readonly<Record<AgentStatusId, string>> = {
  interpreting: 'Entendiendo tu solicitud…',
  discovering_tools: 'Buscando la información correcta…',
  selecting_tools: 'Eligiendo la información necesaria…',
  executing_tools: 'Obteniendo tus datos financieros…',
  interpreting_results: 'Revisando tu información…',
  preparing_action: 'Preparando tu acción…',
  building_ui: 'Construyendo tu respuesta…',
  validating_ui: 'Finalizando…',
};

/**
 * Shown while a turn is running but no phase has been reported yet: a plain
 * POST deployment that never streams, the audio upload and transcription that
 * happen before the agent is even called, or simply the moment before the
 * first line arrives.
 */
export const agentStatusFallbackCopy = 'Analizando tus finanzas…';

export function isAgentStatusId(value: unknown): value is AgentStatusId {
  return typeof value === 'string' && Object.hasOwn(agentStatusCopy, value);
}

/**
 * The phrase for a reported phase, or `null` when the id is unknown or absent.
 * Unknown ids never produce text: the raw identifier is not user-facing copy.
 */
export function agentStatusLabel(value: unknown): string | null {
  return isAgentStatusId(value) ? agentStatusCopy[value] : null;
}

import { z } from 'zod';

import { a2uiMessageSequenceSchema, jsonValueSchema } from './schemas.ts';
import { A2UI_LIMITS, type A2UIAction, type A2UIMessage } from './types.ts';

const a2uiTransportPayload = z.union([
  z.object({
    resource_uri: z.string().min(1).max(2_048),
    messages: z.array(z.unknown()).max(A2UI_LIMITS.messagesPerResponse),
  }).strict(),
  z.object({
    resourceUri: z.string().min(1).max(2_048),
    messages: z.array(z.unknown()).max(A2UI_LIMITS.messagesPerResponse),
  }).strict(),
]);

const chatResponseSchema = z.object({
  message: z.string().trim().min(1).max(16_000),
  data: z.record(z.string(), jsonValueSchema),
  a2ui: a2uiTransportPayload.nullable().optional(),
}).strict();

export type A2UITransportReply = {
  message: string;
  messages: A2UIMessage[] | null;
  a2uiError: string | null;
  actionResult?: z.infer<typeof actionResultSchema>;
};

const actionResultSchema = z.object({ status: z.enum(['success', 'failure']), message: z.string().min(1).max(2000), code: z.string().max(128).optional() }).strict();

export function extractA2UITransportReply(input: unknown): A2UITransportReply {
  const response = chatResponseSchema.safeParse(input);
  if (!response.success) throw new Error('invalid agent transport response');
  const outcome = actionResultSchema.safeParse(response.data.data.actionResult);
  const actionResult = outcome.success ? { actionResult: outcome.data } : {};
  if (!response.data.a2ui) {
    return { ...actionResult, message: response.data.message, messages: null, a2uiError: null };
  }
  const parsed = a2uiMessageSequenceSchema.safeParse(response.data.a2ui.messages);
  if (!parsed.success) {
    return {
      ...actionResult,
      message: response.data.message,
      messages: null,
      a2uiError: 'El detalle visual recibido no es compatible.',
    };
  }
  return { ...actionResult, message: response.data.message, messages: parsed.data, a2uiError: null };
}

export function serializeActionForLegacyChat(action: A2UIAction): string {
  return [
    'Actualiza esta consulta financiera de solo lectura o simulación usando la acción de interfaz adjunta.',
    `Acción A2UI: ${JSON.stringify(action)}`,
  ].join('\n');
}

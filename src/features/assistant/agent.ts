import { z } from 'zod';

// Wire contract from the orchestrator's schemas/a2ui.py. Props are further
// constrained to what our registered native components can safely render.
const text = z.string().min(1).max(4000);
const tags = z.array(z.string().max(64)).max(32).default([]);
// The agent identifies the user by their own login email (Supabase Auth
// session), matched against public.users.email - never a fixed demo persona.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const actionSchema = z.object({
  type: z.literal('A2UI_DISPATCH'),
  intent: z.enum(['REQUEST_CREDIT', 'MANAGE_SUBSCRIPTIONS', 'CONFIRM_SIMULATION', 'VIEW_DETAILS']),
  payload: z.record(z.string(), z.json()).default({}),
}).strict();

const base = { id: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), tags };
const sliderProps = z.object({
  label: text,
  min: z.number().finite(),
  max: z.number().finite(),
  step: z.number().positive().finite(),
  default_value: z.number().finite(),
}).strict().refine((p) => p.max > p.min && p.step <= p.max - p.min &&
  (p.max - p.min) / p.step <= 1000 && isSliderValue(p, p.default_value),
{ message: 'Invalid slider range, step or default value.' });

export const componentSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('Banner'), props: z.object({
    title: text, variant: z.enum(['info', 'warning', 'success', 'danger']),
    message: text.optional(),
  }).strict() }).strict(),
  z.object({ ...base, type: z.literal('Button'), props: z.object({
    label: text, action: actionSchema,
  }).strict() }).strict(),
  z.object({ ...base, type: z.literal('MetricCard'), props: z.object({
    title: text, value: z.number().finite(), currency: z.enum(['MXN', 'USD']).optional(),
  }).strict() }).strict(),
  z.object({ ...base, type: z.literal('InteractiveSlider'), props: sliderProps }).strict(),
]);

export const accessibilitySchema = z.object({
  font_scale: z.enum(['sm', 'md', 'lg', 'xl']),
  contrast: z.enum(['normal', 'high']),
  hit_target: z.enum(['normal', 'large']),
}).strict();

export const a2uiSchema = z.object({
  version: z.literal('a2ui/v1'),
  template_id: z.enum(['Template_Crisis_Flujo', 'Template_Subscriptions', 'Template_Projection']),
  applied_tags: tags,
  meta: z.object({ narrative: text, accessibility: accessibilitySchema }).strict(),
  surface: z.object({
    layout: z.literal('vertical_stack'),
    components: z.array(componentSchema).min(1).max(100),
  }).strict().refine(({ components }) => new Set(components.map((c) => c.id)).size === components.length,
    { message: 'Component IDs must be unique.' }),
}).strict();

export type A2UIPayload = z.infer<typeof a2uiSchema>;

// Deployed chat contract. Data and MCP envelopes are validated but never executed,
// fetched by resource URI or displayed as an arbitrary component tree.
const chatResponseSchema = z.object({
  message: z.string().trim().min(1).max(16000),
  data: z.record(z.string(), z.json()),
  a2ui: z.object({
    resource_uri: z.string().min(1).max(2048),
    messages: z.array(z.record(z.string(), z.json())).max(1000),
  }).strict().nullable().optional(),
}).strict();
export type AgentReply = { message: string; payload: A2UIPayload | null; hasUnsupportedSurface: boolean };
export function parseAgentReply(input: unknown): AgentReply {
  const chat = chatResponseSchema.safeParse(input);
  if (chat.success) return { message: chat.data.message, payload: null, hasUnsupportedSurface: chat.data.a2ui != null };
  const legacy = a2uiSchema.safeParse(input);
  if (legacy.success) return { message: '', payload: legacy.data, hasUnsupportedSurface: false };
  throw new AgentRequestError('contract', 'La respuesta recibida no es compatible. Puedes intentar otra consulta.');
}

export type A2UIComponent = z.infer<typeof componentSchema>;
export type A2UIAccessibility = z.infer<typeof accessibilitySchema>;
export type A2UIAction = z.infer<typeof actionSchema>;
export type A2UIDispatch = { componentId: string; templateId: A2UIPayload['template_id']; action: A2UIAction };

export function isSliderValue(props: { min: number; max: number; step: number }, value: number) {
  const steps = (value - props.min) / props.step;
  return Number.isFinite(value) && value >= props.min && value <= props.max &&
    Math.abs(steps - Math.round(steps)) < 0.000001;
}

export function createDispatch(surface: A2UIPayload, componentId: string, values: Record<string, number>): A2UIDispatch {
  const component = surface.surface.components.find((c) => c.id === componentId);
  if (!component || component.type !== 'Button') throw new Error('Acción no disponible.');
  const action = actionSchema.parse(component.props.action);
  // This version's projection template has one term slider. Only its value may
  // replace "months"; all other agent-provided payload fields remain untouched.
  if (action.intent === 'CONFIRM_SIMULATION' && surface.template_id === 'Template_Projection') {
    const sliders = surface.surface.components.filter((c) => c.type === 'InteractiveSlider');
    if (sliders.length !== 1) throw new Error('La simulación necesita un único plazo.');
    const slider = sliders[0];
    const months = values[slider.id] ?? slider.props.default_value;
    if (!Number.isInteger(months) || !isSliderValue(slider.props, months)) throw new Error('El plazo seleccionado no es válido.');
    action.payload = { ...action.payload, months };
  }
  return { componentId, templateId: surface.template_id, action };
}

export function dispatchToQuery(event: A2UIDispatch): string {
  const action = actionSchema.parse(event.action);
  const requests: Record<A2UIAction['intent'], string> = {
    REQUEST_CREDIT: 'Quiero consultar opciones de crédito para mi liquidez. Solo información, sin contratar un préstamo.',
    MANAGE_SUBSCRIPTIONS: 'Quiero revisar mis suscripciones y gastos recurrentes para encontrar opciones de ahorro. Sin cancelar servicios.',
    CONFIRM_SIMULATION: `Quiero simular una compra a ${action.payload.months} meses. Solo una simulación, sin realizar una compra.`,
    VIEW_DETAILS: 'Quiero ver más detalles de la información financiera que acabas de mostrar.',
  };
  // The existing backend only accepts query + persona, not an action endpoint.
  // Preserve the structured event inside query for the agent to interpret.
  return `${requests[action.intent]}\nEvento de la interfaz: ${JSON.stringify(event)}`;
}

export class AgentRequestError extends Error {
  code: 'configuration' | 'network' | 'timeout' | 'response' | 'contract';
  constructor(code: AgentRequestError['code'], message: string) {
    super(message);
    this.name = 'AgentRequestError';
    this.code = code;
  }
}

export async function requestAgent({ baseUrl, query, email, signal, timeoutMs = 60000, fetchImpl = fetch }: {
  baseUrl: string; query: string; email: string; signal?: AbortSignal;
  timeoutMs?: number; fetchImpl?: typeof fetch;
}): Promise<AgentReply> {
  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/agent/chat`);
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error();
  } catch {
    throw new AgentRequestError('configuration', 'Falta configurar la dirección del agente.');
  }
  const normalizedQuery = query.trim();
  if (!normalizedQuery || normalizedQuery.length > 8000) throw new AgentRequestError('response', 'Escribe una consulta de hasta 8000 caracteres.');
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) throw new AgentRequestError('configuration', 'Completa tu correo electrónico en tu perfil para usar el asistente.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    if (controller.signal.aborted) throw new Error('Consulta cancelada.');
    const response = await fetchImpl(endpoint.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: normalizedQuery, email: parsedEmail.data }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AgentRequestError('response',
      response.status === 401 || response.status === 403
        ? 'El agente rechazó el acceso. Revisa su configuración de autenticación.'
        : 'El agente no pudo atender la consulta. Inténtalo de nuevo.');
    const body = await response.text();
    if (body.length > 1_000_000) throw new AgentRequestError('contract', 'La respuesta del agente es demasiado grande.');
    let data: unknown;
    try { data = JSON.parse(body); } catch {
      throw new AgentRequestError('contract', 'El agente devolvió una respuesta que no se puede mostrar.');
    }
    return parseAgentReply(data);
  } catch (error) {
    if (signal?.aborted) {
      const aborted = new Error('Consulta cancelada.');
      aborted.name = 'AbortError';
      throw aborted;
    }
    if (timedOut) throw new AgentRequestError('timeout', 'El agente tardó demasiado en responder. Inténtalo de nuevo.');
    if (error instanceof AgentRequestError) throw error;
    throw new AgentRequestError('network', 'No se pudo conectar con el agente. Comprueba la conexión y que el servidor esté disponible.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

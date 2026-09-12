import { resolveDynamicValue } from './bindings.ts';
import { a2uiActionSchema } from './schemas.ts';
import {
  A2UI_LIMITS,
  type A2UIAction,
  type A2UIButtonComponent,
  type A2UISurfaceState,
  type JSONValue,
} from './types.ts';

export function createA2UIAction(
  surface: A2UISurfaceState,
  component: A2UIButtonComponent,
  now = new Date(),
): A2UIAction {
  const context: Record<string, JSONValue> = {};
  for (const [key, declaredValue] of Object.entries(component.action.event.context ?? {})) {
    const value = resolveDynamicValue(declaredValue, surface.dataModel);
    if (value === undefined) throw new Error('missing action binding');
    context[key] = value;
  }
  if (JSON.stringify(context).length > A2UI_LIMITS.actionContextBytes) {
    throw new Error('action context too large');
  }
  return a2uiActionSchema.parse({
    name: component.action.event.name,
    surfaceId: surface.surfaceId,
    sourceComponentId: component.id,
    timestamp: now.toISOString(),
    context,
  }) as A2UIAction;
}

import type { ActionHandler, GenerativeNode, UIActionEvent } from './types';

/**
 * Creates internal component action handlers by mapping serializable JSON actions
 * to native component callbacks without exposing arbitrary code execution.
 */
export type RuntimeActionPayload = Record<string, unknown>;

function isPlainObject(value: unknown): value is RuntimeActionPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  // Ignore React / React Native synthetic events if passed by native wrappers
  if ('nativeEvent' in value || 'target' in value) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Creates internal component action handlers by mapping serializable JSON actions
 * to native component callbacks without exposing arbitrary code execution.
 * Supports passing explicit dynamic payload objects from component interactions.
 */
export function createComponentActionHandlers(
  node: GenerativeNode,
  allowedActions: readonly string[],
  onAction?: ActionHandler,
): Record<string, (runtimePayload?: RuntimeActionPayload) => void> {
  const handlers: Record<string, (runtimePayload?: RuntimeActionPayload) => void> = {};

  if (!node.actions || !onAction) {
    return handlers;
  }

  for (const actionKey of Object.keys(node.actions)) {
    if (!allowedActions.includes(actionKey)) {
      console.warn(
        `[GenerativeUI] Action "${actionKey}" is not permitted for component type "${node.type}". Allowed: ${allowedActions.join(', ')}`,
      );
      continue;
    }

    const actionConfig = node.actions[actionKey];
    if (!actionConfig || !actionConfig.event) {
      continue;
    }

    handlers[actionKey] = (runtimePayload?: RuntimeActionPayload) => {
      // Reject arrays, non-plain objects, and native events in a controlled manner
      const validRuntimePayload: RuntimeActionPayload =
        runtimePayload !== undefined && isPlainObject(runtimePayload)
          ? { ...runtimePayload }
          : {};

      // Merge payloads: A2UI static payload takes priority over component runtime payload
      const mergedPayload = {
        ...validRuntimePayload,
        ...(actionConfig.payload ?? {}),
      };

      const event: UIActionEvent = {
        event: actionConfig.event,
        componentId: node.id,
        tool: actionConfig.tool,
        payload: mergedPayload,
      };

      try {
        const result = onAction(event);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error(
              `[GenerativeUI] Async action handler error for event "${event.event}":`,
              error,
            );
          });
        }
      } catch (error) {
        console.error(
          `[GenerativeUI] Action handler threw for event "${event.event}":`,
          error,
        );
      }
    };
  }

  return handlers;
}

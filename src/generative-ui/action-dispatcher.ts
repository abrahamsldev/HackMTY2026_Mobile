import type { ActionHandler, GenerativeNode, UIActionEvent } from './types';

/**
 * Creates internal component action handlers by mapping serializable JSON actions
 * to native component callbacks without exposing arbitrary code execution.
 */
export function createComponentActionHandlers(
  node: GenerativeNode,
  allowedActions: readonly string[],
  onAction?: ActionHandler,
): Record<string, () => void> {
  const handlers: Record<string, () => void> = {};

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

    handlers[actionKey] = () => {
      const event: UIActionEvent = {
        event: actionConfig.event,
        componentId: node.id,
        tool: actionConfig.tool,
        payload: actionConfig.payload,
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

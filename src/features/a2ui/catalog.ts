import { componentChildren } from './message-processor.ts';
import { A2UI_LIMITS, type A2UIComponent, type A2UISurfaceState } from './types.ts';

export const SUPPORTED_BASIC_COMPONENTS = ['Text', 'Button', 'Card', 'Column'] as const;

export type A2UIRenderPlan =
  | { status: 'ready'; component: A2UIComponent; children: readonly A2UIRenderPlan[] }
  | { status: 'unsupported'; reason: 'cycle' | 'depth' | 'missing' };

export function buildRenderPlan(
  surface: A2UISurfaceState,
  componentId = 'root',
  depth = 0,
  ancestors: ReadonlySet<string> = new Set(),
): A2UIRenderPlan {
  if (depth >= A2UI_LIMITS.maxRenderDepth) return { status: 'unsupported', reason: 'depth' };
  if (ancestors.has(componentId)) return { status: 'unsupported', reason: 'cycle' };
  const component = surface.components.get(componentId);
  if (!component) return { status: 'unsupported', reason: 'missing' };
  const nextAncestors = new Set(ancestors).add(componentId);
  return {
    status: 'ready',
    component,
    children: componentChildren(component).map((childId) =>
      buildRenderPlan(surface, childId, depth + 1, nextAncestors),
    ),
  };
}

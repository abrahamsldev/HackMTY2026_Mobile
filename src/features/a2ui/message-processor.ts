import { cloneDataModel, updateDataModel } from './data-model.ts';
import { a2uiMessageSequenceSchema } from './schemas.ts';
import {
  A2UI_LIMITS,
  type A2UIComponent,
  type A2UIMessage,
  type A2UISurfaceState,
} from './types.ts';

export type A2UIProcessResult =
  | { ok: true; surfaces: readonly A2UISurfaceState[] }
  | { ok: false; error: string; surfaces: readonly A2UISurfaceState[] };

function cloneSurface(surface: A2UISurfaceState): A2UISurfaceState {
  return {
    ...surface,
    theme: { ...surface.theme },
    components: new Map(surface.components),
    dataModel: cloneDataModel(surface.dataModel),
  };
}

function ordered(surfaces: ReadonlyMap<string, A2UISurfaceState>): A2UISurfaceState[] {
  return [...surfaces.values()].sort((left, right) => left.creationOrder - right.creationOrder);
}

export class A2UIMessageProcessor {
  private surfaces = new Map<string, A2UISurfaceState>();
  private nextCreationOrder = 0;

  snapshot(): readonly A2UISurfaceState[] {
    return ordered(this.surfaces).map(cloneSurface);
  }

  process(input: unknown): A2UIProcessResult {
    const parsed = a2uiMessageSequenceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'La interfaz recibida no es compatible.', surfaces: this.snapshot() };
    }

    const draft = new Map(
      [...this.surfaces].map(([surfaceId, surface]) => [surfaceId, cloneSurface(surface)]),
    );
    let creationOrder = this.nextCreationOrder;
    try {
      for (const message of parsed.data) {
        if ('createSurface' in message) {
          const body = message.createSurface;
          if (draft.has(body.surfaceId)) throw new Error('duplicate surface');
          draft.set(body.surfaceId, {
            surfaceId: body.surfaceId,
            catalogId: body.catalogId,
            theme: { ...(body.theme ?? {}) },
            sendDataModel: body.sendDataModel ?? false,
            components: new Map(),
            dataModel: {},
            creationOrder,
          });
          creationOrder += 1;
          continue;
        }

        if ('deleteSurface' in message) {
          draft.delete(message.deleteSurface.surfaceId);
          continue;
        }

        const body = 'updateComponents' in message
          ? message.updateComponents
          : message.updateDataModel;
        const surface = draft.get(body.surfaceId);
        if (!surface) throw new Error('surface has not been created');

        if ('components' in body) {
          const components = new Map(surface.components);
          for (const component of body.components) components.set(component.id, component);
          if (components.size > A2UI_LIMITS.componentsPerSurface) throw new Error('too many components');
          draft.set(body.surfaceId, { ...surface, components });
        } else {
          const hasValue = Object.prototype.hasOwnProperty.call(body, 'value');
          const dataModel = updateDataModel(surface.dataModel, body.path, hasValue, body.value);
          draft.set(body.surfaceId, { ...surface, dataModel });
        }
      }
    } catch {
      return { ok: false, error: 'No se pudo aplicar la interfaz recibida.', surfaces: this.snapshot() };
    }

    this.surfaces = draft;
    this.nextCreationOrder = creationOrder;
    return { ok: true, surfaces: this.snapshot() };
  }
}

export function componentChildren(component: A2UIComponent): readonly string[] {
  if (component.component === 'Column') return component.children;
  if (component.component === 'Card' || component.component === 'Button') return [component.child];
  return [];
}

export function messageSurfaceId(message: A2UIMessage): string {
  if ('createSurface' in message) return message.createSurface.surfaceId;
  if ('updateComponents' in message) return message.updateComponents.surfaceId;
  if ('updateDataModel' in message) return message.updateDataModel.surfaceId;
  return message.deleteSurface.surfaceId;
}

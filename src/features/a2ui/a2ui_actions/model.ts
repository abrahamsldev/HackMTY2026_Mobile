import { resolveDataPath, updateDataModel } from '../data-model.ts';
import { createA2UIAction } from '../action.ts';
import type { A2UIInputComponent, A2UISurfaceState, A2UIButtonComponent, JSONValue } from '../types.ts';

export function serverSignature(surface: A2UISurfaceState): string {
  return JSON.stringify({
    surfaceId: surface.surfaceId,
    catalogId: surface.catalogId,
    theme: surface.theme,
    sendDataModel: surface.sendDataModel,
    components: [...surface.components.entries()],
    dataModel: surface.dataModel,
    creationOrder: surface.creationOrder,
  });
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Synchronous writes: an event always sees the last keystroke, even before React renders. */
export class InputModel {
  private lastAction?: ReturnType<typeof createA2UIAction>;
  private server: A2UISurfaceState;
  private serverVersion: string;
  surface: A2UISurfaceState;
  constructor(surface: A2UISurfaceState) {
    this.server = surface;
    this.serverVersion = serverSignature(surface);
    this.surface = surface;
  }
  receive(surface: A2UISurfaceState): boolean {
    if (surface === this.server) return false;
    const version = serverSignature(surface);
    this.server = surface;
    if (version === this.serverVersion) return false;
    this.serverVersion = version;
    this.surface = surface;
    this.lastAction = undefined;
    return true;
  }
  write(component: A2UIInputComponent, value: JSONValue) {
    if (component.component === 'Slider') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < (component.min ?? 0) || value > component.max) throw new Error('Valor fuera del rango permitido.');
    } else if (typeof value !== 'string' || value.length > 4000) throw new Error('El texto supera el tamaño permitido.');
    if (resolveDataPath(this.surface.dataModel, component.value.path) !== value) this.lastAction = undefined;
    this.surface = { ...this.surface, dataModel: updateDataModel(this.surface.dataModel, component.value.path, true, value) };
  }
  action(button: A2UIButtonComponent) {
    for (const component of this.surface.components.values()) {
      if (component.component !== 'TextField' && component.component !== 'DateTimeInput' && component.component !== 'Slider') continue;
      const value = resolveDataPath(this.surface.dataModel, component.value.path);
      if (component.component === 'DateTimeInput' && !validDate(value)) throw new Error('Selecciona una fecha válida.');
      if (component.component === 'TextField' && (typeof value !== 'string' || !value.trim())) throw new Error('Completa los campos de texto.');
      if (component.component === 'Slider' && (typeof value !== 'number' || !Number.isFinite(value) || value < (component.min ?? 0) || value > component.max)) throw new Error('Revisa el importe seleccionado.');
    }
    if (this.lastAction?.sourceComponentId === button.id) return this.lastAction;
    this.lastAction = createA2UIAction(this.surface, button);
    return this.lastAction;
  }
}

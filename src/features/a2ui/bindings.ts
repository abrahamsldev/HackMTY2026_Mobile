import { resolveDataPath } from './data-model.ts';
import type { A2UIBinding, A2UIDynamicString, A2UIDynamicValue, JSONValue } from './types.ts';

function isBinding(value: A2UIDynamicValue | A2UIDynamicString): value is A2UIBinding {
  return typeof value === 'object' && !Array.isArray(value) && value !== null && 'path' in value;
}

export function resolveDynamicValue(
  value: A2UIDynamicValue,
  dataModel: JSONValue | undefined,
): JSONValue | undefined {
  return isBinding(value) ? resolveDataPath(dataModel, value.path) : value;
}

export function resolveDynamicString(
  value: A2UIDynamicString,
  dataModel: JSONValue | undefined,
): string | undefined {
  if (!isBinding(value)) return value;
  const resolved = resolveDataPath(dataModel, value.path);
  if (resolved === null || resolved === undefined) return undefined;
  if (typeof resolved === 'string') return resolved;
  if (typeof resolved === 'number' || typeof resolved === 'boolean') return String(resolved);
  return JSON.stringify(resolved);
}

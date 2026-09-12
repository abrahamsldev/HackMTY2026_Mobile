import { A2UI_LIMITS, type JSONValue } from './types.ts';
import { decodeJsonPointer } from './json-pointer.ts';

function cloneJson(value: JSONValue): JSONValue {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJson(item)]));
  }
  return value;
}

function serializedSize(value: JSONValue | undefined): number {
  return value === undefined ? 0 : JSON.stringify(value).length;
}

function arrayIndex(segment: string, length: number, allowEnd: boolean): number {
  if (!/^(0|[1-9][0-9]*)$/u.test(segment)) throw new Error('invalid array index');
  const index = Number(segment);
  if (!Number.isSafeInteger(index) || index > length || (!allowEnd && index === length)) {
    throw new Error('array index out of range');
  }
  return index;
}

export function updateDataModel(
  current: JSONValue | undefined,
  path: string | undefined,
  hasValue: boolean,
  value: JSONValue | undefined,
): JSONValue | undefined {
  const segments = decodeJsonPointer(path ?? '/');
  if (segments.length === 0) {
    const replacement = hasValue ? cloneJson(value as JSONValue) : undefined;
    if (serializedSize(replacement) > A2UI_LIMITS.dataModelBytes) throw new Error('data model too large');
    return replacement;
  }

  const root: JSONValue = current === undefined ? {} : cloneJson(current);
  if (root === null || typeof root !== 'object') throw new Error('data model path has no container');
  let parent: JSONValue[] | Record<string, JSONValue> = root;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    let child: JSONValue | undefined;
    if (Array.isArray(parent)) {
      child = parent[arrayIndex(segment, parent.length, false)];
    } else {
      child = parent[segment];
      if (child === undefined) {
        child = {};
        parent[segment] = child;
      }
    }
    if (child === null || typeof child !== 'object') throw new Error('data model path has no container');
    parent = child as JSONValue[] | Record<string, JSONValue>;
  }

  const leaf = segments.at(-1) as string;
  if (Array.isArray(parent)) {
    const index = arrayIndex(leaf, parent.length, hasValue);
    if (hasValue) {
      if (index === parent.length) parent.push(cloneJson(value as JSONValue));
      else parent[index] = cloneJson(value as JSONValue);
    } else {
      parent.splice(index, 1);
    }
  } else if (hasValue) {
    parent[leaf] = cloneJson(value as JSONValue);
  } else {
    delete parent[leaf];
  }

  if (serializedSize(root) > A2UI_LIMITS.dataModelBytes) throw new Error('data model too large');
  return root;
}

export function resolveDataPath(model: JSONValue | undefined, path: string): JSONValue | undefined {
  const segments = decodeJsonPointer(path);
  let value = model;
  for (const segment of segments) {
    if (Array.isArray(value)) {
      try {
        value = value[arrayIndex(segment, value.length, false)];
      } catch {
        return undefined;
      }
    } else if (value !== null && typeof value === 'object') {
      value = value[segment];
    } else {
      return undefined;
    }
  }
  return value;
}

export function cloneDataModel(value: JSONValue | undefined): JSONValue | undefined {
  return value === undefined ? undefined : cloneJson(value);
}

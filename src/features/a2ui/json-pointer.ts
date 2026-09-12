export function decodeJsonPointer(path: string): string[] {
  if (path === '/') return [];
  if (!path.startsWith('/') || path.includes('#')) {
    throw new Error('invalid JSON Pointer');
  }
  return path.slice(1).split('/').map((segment) => {
    if (/~(?![01])/u.test(segment)) throw new Error('invalid JSON Pointer escape');
    return segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
  });
}

export function isSafeJsonPointer(path: string): boolean {
  try {
    const segments = decodeJsonPointer(path);
    return segments.every(
      (segment) => !['__proto__', 'prototype', 'constructor'].includes(segment),
    );
  } catch {
    return false;
  }
}

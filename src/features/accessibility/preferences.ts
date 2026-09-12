import { z } from 'zod';

export const accessibilityPreferencesSchema = z.object({
  textScale: z.union([z.literal(1), z.literal(1.25), z.literal(1.5), z.literal(2)]).default(1),
  lineSpacing: z.union([z.literal(1), z.literal(1.3), z.literal(1.6)]).default(1),
  letterSpacing: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  boldText: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  appearance: z.enum(['system', 'light', 'dark']).default('system'),
  colorPalette: z.enum(['default', 'blue-orange', 'monochrome', 'banorte']).default('default'),
  reduceMotion: z.boolean().default(false),
  largeTargets: z.boolean().default(false),
  chartDataTable: z.boolean().default(false),
}).strict();
export type AccessibilityPreferences = z.infer<typeof accessibilityPreferencesSchema>;
export const defaultAccessibilityPreferences = accessibilityPreferencesSchema.parse({});
export const accessibilityStorageKey = (userId: string | null) => `accessibility:v1:${userId ? `user:${userId}` : 'guest'}`;

export function decodeAccessibilityPreferences(raw: string | null): AccessibilityPreferences {
  if (!raw) return { ...defaultAccessibilityPreferences };
  const stored = z.object({ version: z.literal(1), preferences: accessibilityPreferencesSchema }).strict().parse(JSON.parse(raw));
  return stored.preferences;
}
export function encodeAccessibilityPreferences(preferences: AccessibilityPreferences): string {
  return JSON.stringify({ version: 1, preferences: accessibilityPreferencesSchema.parse(preferences) });
}
export function resolveAccessibility(preferences: AccessibilityPreferences, system: { reduceMotion: boolean; boldText: boolean; screenReader: boolean; fontScale?: number }) {
  return {
    ...preferences,
    reduceMotion: preferences.reduceMotion || system.reduceMotion,
    boldText: preferences.boldText || system.boldText,
    minTargetSize: preferences.largeTargets ? 64 : 48,
    showChartData: preferences.chartDataTable || system.screenReader || preferences.largeTargets || preferences.textScale > 1 || (system.fontScale ?? 1) > 1,
  };
}

export function createPreferenceWriter(storage: { setItem: (key: string, value: string) => Promise<void> }, key: string) {
  let pending = Promise.resolve();
  return (preferences: AccessibilityPreferences) => {
    const encoded = encodeAccessibilityPreferences(preferences);
    const result = pending.catch(() => {}).then(() => storage.setItem(key, encoded));
    pending = result;
    return result;
  };
}

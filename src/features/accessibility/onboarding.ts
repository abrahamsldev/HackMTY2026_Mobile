import { z } from 'zod';
import { accessibilityPreferencesSchema, defaultAccessibilityPreferences, type AccessibilityPreferences } from './preferences.ts';

export const accessibilityAnswersSchema = z.object({
  age: z.enum(['under40', '40to59', '60plus', 'private']),
  glasses: z.enum(['yes', 'no', 'private']),
  reading: z.enum(['recommended', 'standard', 'large', 'veryLarge']),
  contrast: z.boolean(),
  motion: z.boolean(),
  targets: z.boolean(),
  distinguishColors: z.boolean(),
}).strict();
export type AccessibilityAnswers = z.infer<typeof accessibilityAnswersSchema>;
export const initialAccessibilityAnswers: AccessibilityAnswers = {
  age: 'private', glasses: 'private', reading: 'recommended',
  contrast: false, motion: false, targets: false, distinguishColors: false,
};

export function preferencesFromAnswers(input: AccessibilityAnswers): AccessibilityPreferences {
  const answers = accessibilityAnswersSchema.parse(input);
  // Age and glasses only suggest a modest enlargement; explicit reading choices win.
  const textScale = answers.reading === 'veryLarge' ? 2 : answers.reading === 'large' ? 1.5
    : answers.reading === 'standard' ? 1 : answers.age === '60plus' || answers.glasses === 'yes' ? 1.25 : 1;
  return { ...defaultAccessibilityPreferences, textScale,
    lineSpacing: textScale > 1 ? 1.3 : 1,
    boldText: answers.contrast, highContrast: answers.contrast,
    reduceMotion: answers.motion, largeTargets: answers.targets,
    chartDataTable: answers.distinguishColors,
  };
}

export function preferencesFromMetadata(value: unknown): AccessibilityPreferences {
  const parsed = accessibilityPreferencesSchema.safeParse(value);
  if (!parsed.success) return { ...defaultAccessibilityPreferences };
  return { ...parsed.data, colorPalette: parsed.data.colorPalette === 'default' ? 'banorte' : parsed.data.colorPalette };
}

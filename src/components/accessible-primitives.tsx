import { forwardRef } from 'react';
import { Text as NativeText, TextInput as NativeTextInput, Pressable as NativePressable, StyleSheet, type TextProps, type TextInputProps, type TextStyle, type PressableProps, type View } from 'react-native';
import { fontFor, isSansFamily } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';

function useAccessibleTextStyle(style: TextProps['style']): TextStyle {
  const { settings } = useAccessibility();
  const base = StyleSheet.flatten(style) ?? {};
  const fontSize = (base.fontSize ?? 14) * settings.textScale;
  const weight = settings.boldText ? '700' : base.fontWeight;
  // The app face ships one file per weight, so the weight has to become a family
  // name (Android will not synthesize one). A style that deliberately asked for
  // another family — mono card numbers, code — keeps it and its own weight.
  const sans = isSansFamily(base.fontFamily);
  return {
    fontSize,
    lineHeight: Math.max(fontSize * 1.3, (base.lineHeight ?? (base.fontSize ?? 14) * 1.4) * settings.textScale) * settings.lineSpacing,
    letterSpacing: (base.letterSpacing ?? 0) + settings.letterSpacing,
    ...(sans
      // `fontWeight: undefined` clears the incoming weight so iOS does not
      // synthesize a second bold on top of an already-bold family.
      ? { fontFamily: fontFor(weight), fontWeight: undefined }
      : settings.boldText
        ? { fontWeight: '700' as const }
        : {}),
    flexShrink: 1,
  };
}
export const Text = forwardRef<NativeText, TextProps>(function AccessibleText({ style, numberOfLines, ...props }, ref) {
  const { settings } = useAccessibility();
  const typography = useAccessibleTextStyle(style);
  return <NativeText {...props} ref={ref} allowFontScaling maxFontSizeMultiplier={0} numberOfLines={settings.textScale > 1 || settings.lineSpacing > 1 || settings.letterSpacing > 0 ? undefined : numberOfLines} style={[style, typography]} />;
});
export type TextInputHandle = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function AccessibleTextInput({ style, ...props }, ref) {
  const { settings } = useAccessibility();
  const typography = useAccessibleTextStyle(style);
  const originalHeight = StyleSheet.flatten(style)?.minHeight;
  return <NativeTextInput {...props} ref={ref} allowFontScaling maxFontSizeMultiplier={0} style={[style, typography, { minHeight: Math.max(typeof originalHeight === 'number' ? originalHeight : 0, settings.minTargetSize) }]} />;
});
// Compact chart marks have equivalent full-size controls in the chart data view.
export const Pressable = forwardRef<View, PressableProps & { compact?: boolean }>(function AccessiblePressable({ style, compact = false, ...props }, ref) {
  const { settings } = useAccessibility();
  return <NativePressable {...props} ref={ref} style={(state) => {
    const resolved = typeof style === 'function' ? style(state) : style;
    const flat = StyleSheet.flatten(resolved);
    return [resolved, !compact && {
      minHeight: Math.max(typeof flat?.minHeight === 'number' ? flat.minHeight : 0, settings.minTargetSize),
      minWidth: Math.max(typeof flat?.minWidth === 'number' ? flat.minWidth : 0, settings.minTargetSize),
    }];
  }} />;
});

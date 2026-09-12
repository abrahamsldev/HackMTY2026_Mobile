import { View, type TextInputProps } from 'react-native';
import { TextInput } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function AuthField({ label, ...props }: TextInputProps & { label: string }) {
  const theme = useTheme();
  return <View style={{ gap: 8 }}><ThemedText type="smallBold">{label}</ThemedText><TextInput {...props} accessibilityLabel={label} placeholderTextColor={theme.textSecondary} style={{ color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 }} /></View>;
}

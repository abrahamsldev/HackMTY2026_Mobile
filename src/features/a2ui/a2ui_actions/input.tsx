import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Pressable, TextInput } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { useTheme } from '@/hooks/use-theme';
import { resolveDynamicString } from '../bindings';
import { resolveDataPath } from '../data-model';
import type { A2UIInputComponent, JSONValue } from '../types';
import { DateInput } from './date-input';

export function A2UIInput({ component, model, disabled, onChange }: { component: A2UIInputComponent; model: JSONValue | undefined; disabled: boolean; onChange: (component: A2UIInputComponent, value: JSONValue) => void }) {
  const theme = useTheme(); const { settings } = useAccessibility();
  const [filter, setFilter] = useState('');
  const label = component.label ? resolveDynamicString(component.label, model) ?? 'Campo' : 'Valor';
  const value = resolveDataPath(model, component.value.path);
  const filteredOptions = useMemo(() => component.component === 'ChoicePicker'
    ? component.options.filter((option) => {
        const text = resolveDynamicString(option.label, model) ?? '';
        return text.toLocaleLowerCase('es-MX').includes(filter.trim().toLocaleLowerCase('es-MX'));
      })
    : [], [component, filter, model]);
  return <View style={{ width: '100%', gap: 8 }}><ThemedText type="smallBold">{label}</ThemedText>
    {component.component === 'Slider' ? <>
      <ThemedText>{typeof value === 'number' ? value.toLocaleString('es-MX', { maximumFractionDigits: 2 }) : 'Selecciona un valor'}</ThemedText>
      <Slider accessibilityLabel={label} disabled={disabled} minimumValue={component.min ?? 0} maximumValue={component.max} value={typeof value === 'number' ? value : component.min ?? 0} minimumTrackTintColor={theme.accent} thumbTintColor={theme.accent} onValueChange={next => onChange(component, Math.round(next * 100) / 100)} style={{ minHeight: settings.minTargetSize, width: '100%' }} />
    </> : component.component === 'ChoicePicker' ? <>
      {component.filterable && <TextInput accessibilityLabel={`Buscar en ${label}`} editable={!disabled} value={filter} onChangeText={setFilter} placeholder="Buscar contacto" placeholderTextColor={theme.textSecondary} style={{ padding: 12, borderRadius: 12, color: theme.text, backgroundColor: theme.backgroundElement, borderWidth: settings.highContrast ? 1 : 0, borderColor: theme.border, fontSize: 16 }} />}
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {filteredOptions.map((option) => {
          const selected = Array.isArray(value) && value.includes(option.value);
          const optionLabel = resolveDynamicString(option.label, model) ?? option.value;
          return <Pressable
            key={option.value}
            accessibilityRole={component.variant === 'multipleSelection' ? 'checkbox' : 'radio'}
            accessibilityLabel={optionLabel}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => {
              const current = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
              const next = component.variant === 'multipleSelection'
                ? selected ? current.filter((item) => item !== option.value) : [...current, option.value]
                : [option.value];
              onChange(component, next);
            }}
            style={({ pressed }) => ({
              minHeight: settings.minTargetSize,
              justifyContent: 'center',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: component.displayStyle === 'chips' ? 999 : 14,
              borderWidth: selected || settings.highContrast ? 2 : 1,
              borderColor: selected ? theme.accent : theme.border,
              backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
              opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
            })}>
            <ThemedText type="smallBold" style={{ color: selected ? theme.accent : theme.text }}>{optionLabel}</ThemedText>
          </Pressable>;
        })}
      </View>
    </> : component.component === 'DateTimeInput' ? <DateInput label={label} value={typeof value === 'string' ? value : ''} disabled={disabled} onChange={next => onChange(component, next)} /> :
      <TextInput accessibilityLabel={label} editable={!disabled} value={typeof value === 'string' ? value : ''} onChangeText={next => onChange(component, next)} maxLength={4000} multiline={component.variant === 'longText'} secureTextEntry={component.variant === 'obscured'} keyboardType={component.variant === 'number' ? 'decimal-pad' : 'default'} style={{ padding: 14, borderRadius: 14, color: theme.text, backgroundColor: theme.backgroundElement, borderWidth: settings.highContrast ? 1 : 0, borderColor: theme.border, fontSize: 16 }} />}
  </View>;
}

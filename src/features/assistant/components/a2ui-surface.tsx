import Slider from '@react-native-community/slider';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { createDispatch, type A2UIComponent, type A2UIDispatch, type A2UIPayload } from '../agent';

type Presentation = { color: string; background: string; border: string; fontSize: number; target: number };
type ComponentProps = {
  component: A2UIComponent;
  presentation: Presentation;
  disabled: boolean;
  value?: number;
  onValue: (value: number) => void;
  onPress: () => void;
};

// Only these registered components can be instantiated from an agent response.
const registry: Record<A2UIComponent['type'], (props: ComponentProps) => ReactNode> = {
  Banner: ({ component, presentation: p }) => {
    if (component.type !== 'Banner') return null;
    const critical = component.tags.includes('#alerta-roja');
    const label = critical || component.props.variant === 'danger' ? 'Alerta' :
      component.props.variant === 'warning' ? 'Aviso' : component.props.variant === 'success' ? 'Resultado' : 'Información';
    return (
      <View style={[styles.card, { backgroundColor: p.background, borderColor: p.border, borderLeftWidth: 5 }]}>
        <Text style={{ color: p.color, fontSize: p.fontSize * 0.85 }}>{label}</Text>
        <Text accessibilityRole="header" style={{ color: p.color, fontSize: p.fontSize * 1.2, fontWeight: '700' }}>{component.props.title}</Text>
        {component.props.message && <Text style={{ color: p.color, fontSize: p.fontSize }}>{component.props.message}</Text>}
      </View>
    );
  },
  MetricCard: ({ component, presentation: p }) => {
    if (component.type !== 'MetricCard') return null;
    return (
      <View style={[styles.card, { backgroundColor: p.background, borderColor: p.border }]}>
        <Text style={{ color: p.color, fontSize: p.fontSize }}>{component.props.title}</Text>
        <Text style={{ color: p.color, fontSize: p.fontSize * 1.8, fontWeight: '700' }}>
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: component.props.currency ?? 'MXN' }).format(component.props.value)}
        </Text>
      </View>
    );
  },
  Button: ({ component, presentation: p, disabled, onPress }) => {
    if (component.type !== 'Button') return null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.button, { minHeight: p.target, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
        <Text style={{ color: '#FFFFFF', fontSize: p.fontSize, fontWeight: '700', textAlign: 'center' }}>{component.props.label}</Text>
      </Pressable>
    );
  },
  InteractiveSlider: ({ component, presentation: p, disabled, value, onValue }) => {
    if (component.type !== 'InteractiveSlider') return null;
    const props = component.props;
    return (
      <View style={[styles.card, { backgroundColor: p.background, borderColor: p.border }]}>
        <Text style={{ color: p.color, fontSize: p.fontSize, fontWeight: '600' }}>{props.label}: {value}</Text>
        <Slider
          accessibilityLabel={props.label}
          accessibilityValue={{ min: props.min, max: props.max, now: value }}
          minimumValue={props.min}
          maximumValue={props.max}
          step={props.step}
          value={value}
          onValueChange={onValue}
          disabled={disabled}
          minimumTrackTintColor={p.color}
          maximumTrackTintColor={p.border}
          thumbTintColor={p.color}
          style={{ height: p.target, width: '100%' }}
        />
        <View style={styles.range}>
          <Text style={{ color: p.color, fontSize: p.fontSize * 0.85 }}>{props.min}</Text>
          <Text style={{ color: p.color, fontSize: p.fontSize * 0.85 }}>{props.max}</Text>
        </View>
      </View>
    );
  },
};

export function A2UISurface({ payload, disabled, onDispatch }: {
  payload: A2UIPayload; disabled: boolean; onDispatch: (event: A2UIDispatch) => void;
}) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(
    payload.surface.components.filter((c) => c.type === 'InteractiveSlider').map((c) => [c.id, c.props.default_value]),
  ));
  const [error, setError] = useState<string | null>(null);
  const fontSize = 18 * { sm: 0.9, md: 1, lg: 1.2, xl: 1.4 }[payload.meta.accessibility.font_scale];
  function presentation(componentTags: string[] = []): Presentation {
    const tags = [...payload.applied_tags, ...componentTags];
    const highContrast = payload.meta.accessibility.contrast === 'high' || tags.includes('#high-contrast');
    return {
      color: theme.text,
      background: highContrast ? theme.background : theme.backgroundElement,
      border: highContrast ? theme.text : theme.backgroundSelected,
      fontSize,
      target: payload.meta.accessibility.hit_target === 'large' || tags.includes('#big-targets') ? 64 : 48,
    };
  }
  return (
    <View style={styles.surface}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize, lineHeight: fontSize * 1.5 }}>
        {payload.meta.narrative}
      </Text>
      {payload.surface.components.map((component) => (
        <View key={component.id}>
          {registry[component.type]({
            component,
            presentation: presentation(component.tags),
            disabled,
            value: values[component.id],
            onValue: (value) => setValues((current) => ({ ...current, [component.id]: value })),
            onPress: () => {
              try {
                setError(null);
                onDispatch(createDispatch(payload, component.id, values));
              } catch {
                setError('No se pudo enviar la acción. Revisa el valor seleccionado.');
              }
            },
          })}
        </View>
      ))}
      {error && <Text accessibilityRole="alert" style={{ color: theme.text, fontSize }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { gap: Spacing.four },
  card: { padding: Spacing.three, borderRadius: 12, borderWidth: 1, gap: Spacing.three },
  button: { padding: Spacing.three, borderRadius: 12, backgroundColor: '#155EAF', justifyContent: 'center' },
  range: { flexDirection: 'row', justifyContent: 'space-between' },
});

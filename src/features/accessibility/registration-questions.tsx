import { View } from 'react-native';
import { Pressable } from '@/components/accessible-primitives';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { preferencesFromAnswers, type AccessibilityAnswers } from './onboarding';

export function RegistrationQuestions({ answers, onChange, disabled }: {
  answers: AccessibilityAnswers;
  onChange: (answers: AccessibilityAnswers) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  function question<K extends keyof AccessibilityAnswers>(key: K, title: string, options: { label: string; value: AccessibilityAnswers[K] }[]) {
    return <View style={{ gap: 8 }}><ThemedText type="smallBold">{title}</ThemedText><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(({ label, value }) => <Pressable key={String(value)} disabled={disabled} accessibilityRole="radio" accessibilityLabel={`${title}: ${label}`} accessibilityState={{ checked: answers[key] === value, disabled }} onPress={() => onChange({ ...answers, [key]: value })} style={{ padding: 12, borderWidth: 1, borderRadius: 12, maxWidth: '100%', borderColor: theme.border, backgroundColor: answers[key] === value ? theme.backgroundSelected : theme.background }}><ThemedText>{answers[key] === value ? '✓ ' : ''}{label}</ThemedText></Pressable>)}
    </View></View>;
  }
  const yesNo = [{ label: 'No', value: false }, { label: 'Sí', value: true }];
  const suggested = preferencesFromAnswers(answers);
  return <View style={{ gap: 20 }}>
    <ThemedText accessibilityRole="header" style={{ fontSize: 24, fontWeight: '700' }}>Hagamos la app cómoda para ti</ThemedText>
    <ThemedText>Estas respuestas ajustan automáticamente la lectura y los controles. Puedes dejarlas como están o cambiarlas después en Configuración. Solo guardamos los ajustes, no tu edad ni si usas lentes.</ThemedText>
    {question('age', '¿Cuál es tu rango de edad?', [{ label: 'Menos de 40', value: 'under40' }, { label: '40 a 59', value: '40to59' }, { label: '60 o más', value: '60plus' }, { label: 'Prefiero no decir', value: 'private' }])}
    {question('glasses', '¿Usas lentes para leer?', [{ label: 'Sí', value: 'yes' }, { label: 'No', value: 'no' }, { label: 'Prefiero no decir', value: 'private' }])}
    {question('reading', '¿Qué tamaño de letra te resulta cómodo?', [{ label: 'Recomendado', value: 'recommended' }, { label: 'Normal', value: 'standard' }, { label: 'Grande', value: 'large' }, { label: 'Muy grande', value: 'veryLarge' }])}
    {question('contrast', '¿Necesitas textos más marcados y alto contraste?', yesNo)}
    {question('motion', '¿Prefieres evitar las animaciones?', yesNo)}
    {question('targets', '¿Te ayudan los botones y controles más grandes?', yesNo)}
    {question('distinguishColors', '¿Te cuesta distinguir colores en los gráficos?', yesNo)}
    <View accessibilityLiveRegion="polite" style={{ padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, gap: 8 }}>
      <ThemedText type="smallBold">Tus ajustes iniciales</ThemedText>
      <ThemedText>Texto al {suggested.textScale * 100} % · Contraste {suggested.highContrast ? 'alto' : 'normal'} · Controles {suggested.largeTargets ? 'grandes' : 'normales'} · {suggested.reduceMotion ? 'Sin animaciones decorativas' : 'Animaciones suaves'}</ThemedText>
      <ThemedText>Paleta Banorte roja y blanca{suggested.chartDataTable ? ' · Gráficos acompañados de valores y etiquetas' : ''}.</ThemedText>
    </View>
  </View>;
}

import { useState } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ActionButton, Card, InfoBanner, StatusBadge } from '@/components/ui';
import { A2UIMessageProcessor } from '@/features/a2ui';
import { A2UISurface } from '@/features/assistant/components/a2ui-surface';
import { questionBank } from '@/features/assistant/question-bank';
import { Spacing } from '@/constants/theme';
import { bankingViewMessages } from './a2ui';
import { financialViewCatalog } from './catalog';
import { bankingViewSchema, type FinancialViewIntent } from './model';
import examples from './examples.json';

const previews = examples.map(input => {
  const data = bankingViewSchema.parse(input);
  const result = new A2UIMessageProcessor().process(bankingViewMessages(data));
  if (!result.ok) throw new Error(`Invalid banking preview: ${data.intent}`);
  return { intent: data.intent, surface: result.surfaces[0] };
});

export function FinancialViewGallery() {
  const [selected, setSelected] = useState<FinancialViewIntent>('transactions');
  const definition = financialViewCatalog[selected];
  const intent = questionBank.find(item => item.id === selected)!;
  const preview = previews.find(item => item.intent === selected)!;
  return <View style={{ gap: Spacing.four }}>
    <ThemedText accessibilityRole="header" type="subtitle">Una vista para cada pregunta</ThemedText>
    <InfoBanner title="Datos ficticios" message="Explora las 13 vistas del banco de preguntas. Buscar, ocultar saldos y comparar escenarios funciona aquí mismo; esta galería no realiza operaciones bancarias." />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>{questionBank.map(item => <ActionButton key={item.id} label={`${selected === item.id ? '✓ ' : ''}${item.area}`} variant={selected === item.id ? 'primary' : 'outline'} onPress={() => setSelected(item.id as FinancialViewIntent)} />)}</View>
    <Card variant="outlined"><View style={{ gap: Spacing.two }}>
      <StatusBadge label={definition.name} tone="info" />
      {intent.questions.map(question => <ThemedText key={question}>{question}</ThemedText>)}
      <ThemedText themeColor="textSecondary">{definition.composition}</ThemedText>
      <ThemedText type="smallBold">Componentes reutilizados</ThemedText><ThemedText type="small">{definition.components.join(' · ')}</ThemedText>
    </View></Card>
    <A2UISurface key={selected} surface={preview.surface} disabled={false} onDispatch={() => {}} />
    <Card variant="outlined"><View style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">Datos que debe enviar el agente</ThemedText><ThemedText type="small">{definition.requiredData}</ThemedText>
      <ThemedText type="smallBold">Interacciones de la vista</ThemedText><ThemedText type="small">{definition.localActions}</ThemedText>
      <ThemedText type="smallBold">Acciones que requieren al agente</ThemedText><ThemedText type="small">{definition.agentActions}</ThemedText>
    </View></Card>
  </View>;
}

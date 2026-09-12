import { useAccessibility } from '@/features/accessibility/accessibility-provider';
import { Text, Pressable } from '@/components/accessible-primitives';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { calendarDate, dateKey, heatLevel, heatmapChartPropsSchema, periodBounds, periodCells, shiftPeriod, type HeatmapChartData, type HeatmapView } from './heatmap-chart-model';

export type HeatmapChartProps = HeatmapChartData & {
  onDaySelect?: (event: { date: string; value: number | null }) => void;
  onPeriodChange?: (event: { view: HeatmapView; startDate: string; endDate: string }) => void;
};
const palettes = {
  green: ['#DCFCE7', '#86EFAC', '#22C55E', '#15803D'],
  blue: ['#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'],
  violet: ['#EDE9FE', '#C4B5FD', '#8B5CF6', '#6D28D9'],
  orange: ['#FFEDD5', '#FDBA74', '#F97316', '#C2410C'],
};
const weekdays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const viewLabels = { year: 'Año', month: 'Mes', week: 'Semana' };
const displayDate = (key: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-MX', { ...options, timeZone: 'UTC' }).format(calendarDate(key));

export function HeatmapChart({ onDaySelect, onPeriodChange, ...input }: HeatmapChartProps) {
  const theme = useTheme();
  const parsed = heatmapChartPropsSchema.safeParse(input);
  if (!parsed.success) return <Text accessibilityRole="alert" style={{ color: theme.text }}>No se puede mostrar el mapa de calor: datos inválidos.</Text>;
  return <HeatmapContent key={JSON.stringify(parsed.data)} {...parsed.data} onDaySelect={onDaySelect} onPeriodChange={onPeriodChange} />;
}

function HeatmapContent({ data, title, subtitle, initialDate, initialView = 'year', tone = 'green', currency, status = 'ready', onDaySelect, onPeriodChange }: HeatmapChartProps) {
  const theme = useTheme();
  const { settings } = useAccessibility();
  const [focus, setFocus] = useState(() => initialDate ?? data.map((day) => day.date).sort().at(-1) ?? dateKey(new Date()));
  const [view, setView] = useState<HeatmapView>(initialView);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | null>(null);
  const values = new Map(data.map((day) => [day.date, day.value]));
  const maximum = data.reduce((max, day) => Math.max(max, day.value), 0);
  const colors = [theme.backgroundSelected, ...(settings.colorPalette === 'monochrome' ? ['#E5E5E5', '#AAAAAA', '#555555', '#111111'] : palettes[settings.colorPalette === 'blue-orange' ? 'blue' : tone])];
  const cells = periodCells(focus, view);
  const bounds = periodBounds(focus, view);
  const format = (value: number) => new Intl.NumberFormat('es-MX', { ...(currency ? { style: 'currency', currency } : {}), maximumFractionDigits: 2 }).format(value);
  const navigate = (nextView: HeatmapView, date: string) => {
    setView(nextView); setFocus(date); setSelected(null);
    onPeriodChange?.({ view: nextView, ...periodBounds(date, nextView) });
  };
  const button = (label: string, action: () => void, active = false, disabled = false) => <Pressable accessibilityRole="button" accessibilityLabel={label === '‹' ? 'Periodo anterior' : label === '›' ? 'Periodo siguiente' : label} accessibilityState={{ selected: active, disabled }} disabled={disabled} onPress={action} style={[styles.button, { backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement, opacity: disabled ? 0.4 : 1 }]}><Text style={{ color: theme.text, fontWeight: active ? '700' : '400' }}>{label}</Text></Pressable>;
  const renderCell = (key: string | null, index: number) => {
    if (!key) return <View key={`blank${index}`} style={view === 'year' ? styles.tiny : styles.monthCell} />;
    const value = values.get(key); const level = heatLevel(value, maximum);
    const active = selected === key;
    return <Pressable compact key={key} accessibilityRole="button" accessibilityLabel={`${displayDate(key, { dateStyle: 'full' })}: ${value === undefined ? 'Sin datos' : format(value)}`} accessibilityState={{ selected: active }} onPress={() => { setSelected(key); setFocus(key); onDaySelect?.({ date: key, value: value ?? null }); }} style={[
      view === 'year' ? styles.tiny : view === 'month' ? styles.monthCell : styles.weekCell,
      { backgroundColor: level === null ? theme.background : colors[level], borderColor: active ? theme.text : theme.backgroundSelected, borderWidth: active ? 2 : level === null ? 1 : 0, borderStyle: level === null ? 'dashed' : 'solid', opacity: filter !== null && level !== filter ? 0.22 : 1 },
    ]}>
      {view !== 'year' && <Text style={{ color: level !== null && level >= 3 ? '#FFFFFF' : '#17212B', fontSize: 12, fontWeight: '600', ...(level === null || level === 0 ? { color: theme.text } : {}) }}>{calendarDate(key).getUTCDate()}</Text>}
      {view === 'week' && <Text numberOfLines={2} style={{ color: level !== null && level >= 3 ? '#FFFFFF' : level === null || level === 0 ? theme.text : '#17212B', fontSize: 12 }}>{value === undefined ? 'Sin datos' : format(value)}</Text>}
    </Pressable>;
  };
  const periodLabel = view === 'year' ? focus.slice(0, 4) : view === 'month' ? displayDate(focus, { month: 'long', year: 'numeric' }) : `${displayDate(bounds.startDate, { day: 'numeric', month: 'short', year: 'numeric' })} – ${displayDate(bounds.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const previous = shiftPeriod(focus, view, -1); const next = shiftPeriod(focus, view, 1);
  return <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
    {title && <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>}
    {subtitle && <Text style={{ color: theme.textSecondary }}>{subtitle}</Text>}
    <View style={styles.row}>{(['year', 'month', 'week'] as const).map((mode) => <View key={mode}>{button(viewLabels[mode], () => navigate(mode, selected ?? focus), mode === view)}</View>)}</View>
    <View style={styles.navigation}>{button('‹', () => navigate(view, previous), false, previous < '1900-01-01')}<Text accessibilityLiveRegion="polite" style={[styles.period, { color: theme.text }]}>{periodLabel}</Text>{button('›', () => navigate(view, next), false, next > '2100-12-31')}</View>
    {status === 'loading' ? <ActivityIndicator style={styles.placeholder} accessibilityLabel="Cargando mapa de calor" /> : !data.length ? <Text style={[styles.placeholder, { color: theme.textSecondary }]}>No hay datos para mostrar.</Text> : <>
      {view === 'year' ? <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Calendario anual. Desliza para ver todos los meses.">
        <View style={styles.row}>
          <View style={{ paddingTop: 30, gap: 3 }}>{weekdays.map((day, i) => <Text key={i} style={[styles.tiny, { color: theme.textSecondary, fontSize: 11 }]}>{day}</Text>)}</View>
          <View style={{ flexDirection: 'row', gap: 3, paddingBottom: 10 }}>{Array.from({ length: cells.length / 7 }, (_, week) => {
            const days = cells.slice(week * 7, week * 7 + 7);
            const monthStart = days.find((day) => day?.endsWith('-01'));
            return <View key={week} style={{ gap: 3 }}><View style={{ height: 27, width: 14, overflow: 'visible' }}>{monthStart && <Pressable compact accessibilityRole="button" accessibilityLabel={`Ampliar ${displayDate(monthStart, { month: 'long' })}`} onPress={() => navigate('month', monthStart)} style={{ width: 48, height: 27 }}><Text style={{ color: theme.textSecondary, fontSize: 11 }}>{displayDate(monthStart, { month: 'short' })}</Text></Pressable>}</View>{days.map(renderCell)}</View>;
          })}</View>
        </View>
      </ScrollView> : view === 'month' ? <View><View style={styles.calendar}>{weekdays.map((day, i) => <Text key={i} style={[styles.weekday, { color: theme.textSecondary }]}>{day}</Text>)}</View><View style={styles.calendar}>{cells.map(renderCell)}</View></View> : <View style={{ gap: 5 }}>{cells.map((key, index) => <View key={key ?? index} style={styles.weekRow}><Text style={{ color: theme.textSecondary, width: 38 }}>{key && displayDate(key, { weekday: 'short' })}</Text>{renderCell(key, index)}</View>)}</View>}
      <View style={styles.legend}><Text style={{ color: theme.textSecondary, fontSize: 12 }}>Menos</Text>{colors.map((color, level) => <Pressable key={level} accessibilityRole="button" accessibilityLabel={level === 0 ? 'Filtrar días con valor cero' : `Filtrar valores mayores que ${format((level - 1) * maximum / 4)} hasta ${format(level * maximum / 4)}`} accessibilityState={{ selected: filter === level }} onPress={() => setFilter(filter === level ? null : level)} style={[styles.swatch, { borderColor: filter === level ? theme.text : 'transparent' }]}><View style={{ width: 17, height: 17, borderRadius: 3, backgroundColor: color }} /></Pressable>)}<Text style={{ color: theme.textSecondary, fontSize: 12 }}>Más</Text></View>
      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Borde punteado: sin datos. {view === 'year' ? 'Toca un mes para ampliar o selecciona un día.' : 'Selecciona un día para ver su valor.'}{filter !== null ? ' Toca el color activo para quitar el filtro.' : ''}</Text>
      {!cells.some((key) => key && values.has(key)) && <Text style={{ color: theme.textSecondary }}>No hay datos en este periodo.</Text>}
      {selected && <View style={[styles.detail, { backgroundColor: theme.backgroundElement }]}><Text accessibilityLiveRegion="polite" style={{ color: theme.text, fontWeight: '600' }}>{displayDate(selected, { dateStyle: 'full' })}{'\n'}{values.has(selected) ? format(values.get(selected)!) : 'Sin datos'}</Text><View style={styles.row}>{view !== 'month' && button('Ampliar mes', () => navigate('month', selected))}{view !== 'week' && button('Ampliar semana', () => navigate('week', selected))}</View></View>}
      {settings.showChartData && <View style={{ gap: 8 }}><Text accessibilityRole="header" style={{ color: theme.text, fontWeight: '700' }}>Datos del periodo</Text>{cells.filter((key): key is string => key !== null).map((key) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: selected === key }} onPress={() => { setSelected(key); setFocus(key); onDaySelect?.({ date: key, value: values.get(key) ?? null }); }} style={{ padding: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 8 }}><Text style={{ color: theme.text }}>{displayDate(key, { dateStyle: 'medium' })}: {values.has(key) ? format(values.get(key)!) : 'Sin datos'}</Text></Pressable>)}</View>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, width: '100%' },
  title: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 9 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  period: { flex: 1, textAlign: 'center', fontWeight: '600', textTransform: 'capitalize' },
  tiny: { width: 14, height: 14, borderRadius: 3 },
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.285714%', textAlign: 'center', paddingVertical: 8, fontSize: 12 },
  monthCell: { width: '13.285714%', margin: '0.5%', aspectRatio: 1, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekCell: { flex: 1, minHeight: 48, borderRadius: 6, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  swatch: { minWidth: 32, minHeight: 44, borderWidth: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  detail: { padding: 12, gap: 10, borderRadius: 10 },
  placeholder: { paddingVertical: 48, textAlign: 'center' },
});

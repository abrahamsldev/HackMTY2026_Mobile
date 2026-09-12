import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { areaChartPropsSchema, chartDomain, smoothPath, type AreaChartData } from './area-chart-model';

export type AreaChartProps = AreaChartData & {
  onPointSelect?: (event: { index: number; label: string; values: number[] }) => void;
};
const palette = { blue: '#3B82F6', violet: '#A78BFA', green: '#22C55E', orange: '#F59E0B' };
const tones = ['blue', 'violet', 'green', 'orange'] as const;

export function AreaChart(props: AreaChartProps) {
  const { onPointSelect, ...input } = props;
  const parsed = areaChartPropsSchema.safeParse(input);
  const theme = useTheme();
  if (!parsed.success) return <Text accessibilityRole="alert" style={{ color: theme.text }}>No se puede mostrar el gráfico: datos inválidos.</Text>;
  // Remount interaction state when the actual data changes, including equal-length updates.
  return <AreaChartContent key={JSON.stringify(parsed.data)} {...parsed.data} onPointSelect={onPointSelect} />;
}

function AreaChartContent({ title, subtitle, data, series, height = 260, currency, status = 'ready', onPointSelect }: AreaChartProps) {
  const theme = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [width, setWidth] = useState(320);
  const [selected, setSelected] = useState<number | null>(null);
  const [reveal] = useState(() => new Animated.Value(0));
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const animation = Animated.timing(reveal, { toValue: 1, duration: reducedMotion ? 0 : 700, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [reveal, reducedMotion]);

  const left = 44;
  const right = Math.max(left + 1, width - 16);
  const top = 16;
  const bottom = height - 32;
  const [min, max] = chartDomain(data);
  const x = (index: number) => data.length === 1 ? (left + right) / 2 : left + index * (right - left) / Math.max(1, data.length - 1);
  const y = (value: number) => bottom - (value - min) / (max - min) * (bottom - top);
  const color = (index: number) => palette[series[index].tone ?? tones[index]];
  const format = (value: number, compact = false) => new Intl.NumberFormat('es-MX', {
    ...(currency && !compact ? { style: 'currency', currency } : {}),
    notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : 2,
  }).format(value);
  const choose = useCallback((position: number, emit = false) => {
    if (!data.length || status !== 'ready') return;
    const index = Math.max(0, Math.min(data.length - 1, Math.round((position - left) / (right - left) * (data.length - 1))));
    setSelected(index);
    if (emit) onPointSelect?.({ index, label: data[index].label, values: [...data[index].values] });
  }, [data, status, left, right, onPointSelect]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => status === 'ready' && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderMove: (event) => choose(event.nativeEvent.locationX),
    onPanResponderRelease: (event) => choose(event.nativeEvent.locationX, true),
    onPanResponderTerminationRequest: () => true,
  }), [choose, status]);
  const active = selected === null ? null : data[selected];
  const tickCount = Math.min(data.length, Math.max(2, Math.floor(width / 85)));
  const indices = Array.from({ length: tickCount }, (_, i) => Math.round(i * (data.length - 1) / Math.max(1, tickCount - 1)));

  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
      {title && <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>}
      {subtitle && <Text style={{ color: theme.textSecondary }}>{subtitle}</Text>}
      <View style={styles.legend}>
        {series.map((item, i) => <View key={i} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: color(i) }]} />
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{item.label}</Text>
        </View>)}
      </View>
      {status === 'loading' ? <View style={[styles.placeholder, { height }]}><ActivityIndicator accessibilityLabel="Cargando gráfico" /><Text style={{ color: theme.textSecondary }}>Cargando datos…</Text></View> : !data.length ?
        <View style={[styles.placeholder, { height }]}><Text style={{ color: theme.textSecondary }}>No hay datos para este periodo.</Text></View> :
        <View onLayout={(event) => setWidth(Math.max(100, event.nativeEvent.layout.width))}>
          <View {...pan.panHandlers}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={`${title ?? 'Gráfico de áreas'}. ${data.length} puntos. Desliza para explorar.`}
            accessibilityValue={{ min: 1, max: data.length, now: (selected ?? 0) + 1, text: active ? `${active.label}: ${active.values.map((v, i) => `${series[i].label} ${format(v)}`).join(', ')}` : data[0].label }}
            accessibilityActions={[{ name: 'increment', label: 'Siguiente punto' }, { name: 'decrement', label: 'Punto anterior' }]}
            onAccessibilityAction={(event) => choose(x(Math.max(0, Math.min(data.length - 1, (selected ?? 0) + (event.nativeEvent.actionName === 'increment' ? 1 : -1)))), true)}
            onPress={(event) => choose(event.nativeEvent.locationX, true)}
            onPointerMove={(event) => { if (event.nativeEvent.pointerType === 'mouse') choose(event.nativeEvent.offsetX); }}
            {...(Platform.OS === 'web' ? { onKeyDown: (event: { key: string; preventDefault: () => void }) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault();
                choose(x(Math.max(0, Math.min(data.length - 1, (selected ?? 0) + (event.key === 'ArrowRight' ? 1 : -1)))), true);
              }
            } } : {})}
            onHoverOut={() => setSelected(null)}>
            <Animated.View style={{ width: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, width] }), height, overflow: 'hidden' }} pointerEvents="none">
              <Svg width={width} height={height}>
                <Defs>{series.map((_, i) => <LinearGradient key={i} id={`${id}fill${i}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color(i)} stopOpacity={0.35} /><Stop offset="1" stopColor={color(i)} stopOpacity={0.015} />
                </LinearGradient>)}</Defs>
                {[0, 1, 2, 3, 4].map((tick) => {
                  const value = min + (max - min) * tick / 4;
                  return <ChartGridRow key={tick} left={left} right={right} y={y(value)} label={format(value, true)} color={theme.textSecondary} grid={theme.backgroundSelected} />;
                })}
                {series.map((_, i) => {
                  const points = data.map((point, index) => ({ x: x(index), y: y(point.values[i]) }));
                  const path = smoothPath(points);
                  return <Path key={`fill${i}`} d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#${id}fill${i})`} />;
                })}
                {series.map((_, i) => <Path key={`line${i}`} d={smoothPath(data.map((point, index) => ({ x: x(index), y: y(point.values[i]) })))} fill="none" stroke={color(i)} strokeWidth={2.5} strokeLinecap="round" />)}
                {data.length === 1 && series.map((_, i) => <Circle key={`single${i}`} cx={x(0)} cy={y(data[0].values[i])} r={4} fill={color(i)} />)}
                {indices.map((index) => <SvgText key={index} x={x(index)} y={height - 8} textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'} fill={theme.textSecondary} fontSize={10}>{data[index].label}</SvgText>)}
                {selected !== null && <Line x1={x(selected)} x2={x(selected)} y1={top} y2={bottom} stroke={theme.textSecondary} strokeDasharray="4 4" />}
                {selected !== null && series.map((_, i) => <Circle key={`selected${i}`} cx={x(selected)} cy={y(data[selected].values[i])} r={5} fill={theme.background} stroke={color(i)} strokeWidth={2.5} />)}
              </Svg>
            </Animated.View>
          </Pressable>
          </View>
          {active && <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.tooltip, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, left: Math.max(0, Math.min(width - Math.min(180, width), x(selected!) - 90)), maxWidth: Math.min(180, width) }]}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>{active.label}</Text>
            {series.map((item, i) => <Text key={i} style={{ color: theme.text, fontSize: 12 }}>{item.label}: {format(active.values[i])}</Text>)}
          </View>}
        </View>}
    </View>
  );
}

function ChartGridRow({ left, right, y, label, color, grid }: { left: number; right: number; y: number; label: string; color: string; grid: string }) {
  return <><Line x1={left} x2={right} y1={y} y2={y} stroke={grid} strokeDasharray="3 5" /><SvgText x={left - 8} y={y + 4} textAnchor="end" fontSize={10} fill={color}>{label}</SvgText></>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, width: '100%' },
  title: { fontSize: 18, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 7, width: 7, borderRadius: 4 },
  placeholder: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  tooltip: { position: 'absolute', top: 8, borderWidth: 1, borderRadius: 10, padding: 10, gap: 5 },
});

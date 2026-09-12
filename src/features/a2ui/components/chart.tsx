import { Text } from '@/components/accessible-primitives';
import { AreaChart } from '@/components/charts/area-chart';
import { HeatmapChart } from '@/components/charts/heatmap-chart';
import { GenerativeError } from '@/components/generative';
import { StyleSheet, View } from 'react-native';

import type { A2UIBinding, A2UIChartValue, JSONValue } from '../types';
import { resolveA2UIChart } from './chart-model';

function defaultSummary(chart: A2UIChartValue): string {
  if (chart.kind === 'area') {
    return `Gráfico de áreas con ${chart.props.data.length} puntos y ${chart.props.series.length} series.`;
  }
  return `Mapa de calor de calendario con ${chart.props.data.length} valores por fecha.`;
}

export function A2UIChart({
  chart,
  dataModel,
}: {
  chart: A2UIChartValue | A2UIBinding;
  dataModel: JSONValue | undefined;
}) {
  const parsed = resolveA2UIChart(chart, dataModel);
  if (!parsed.success) {
    return (
      <GenerativeError
        nodeId="a2ui-chart"
        type="Chart"
        error="Los datos del gráfico no son válidos."
      />
    );
  }

  const value = parsed.data;
  const summary = value.accessibleSummary ?? defaultSummary(value);
  if (value.kind === 'area') {
    const { title, subtitle, data, series, height, currency, status } = value.props;
    return (
      <View>
        <Text style={styles.screenReaderSummary}>{summary}</Text>
        <AreaChart
          title={title}
          subtitle={subtitle}
          data={data}
          series={series}
          height={height}
          currency={currency}
          status={status}
        />
      </View>
    );
  }

  const { title, subtitle, data, initialDate, initialView, tone, currency, status } = value.props;
  return (
    <View>
      <Text style={styles.screenReaderSummary}>{summary}</Text>
      <HeatmapChart
        title={title}
        subtitle={subtitle}
        data={data}
        initialDate={initialDate}
        initialView={initialView}
        tone={tone}
        currency={currency}
        status={status}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenReaderSummary: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
});

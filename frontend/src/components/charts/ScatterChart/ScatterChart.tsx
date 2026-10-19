import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import { chartHeight } from '../ChartShell/ChartShell.utils';

import type { ScatterChartProps } from './ScatterChart.interface';
import type { EChartsOption } from 'echarts';

/** Renders an echarts scatter chart with multiple series, legend, tooltip, and grid. */
export default function ScatterChart({
  data, height = chartHeight, loading, errorMessage,
}: ScatterChartProps) {
  const option: EChartsOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    legend: { show: true, bottom: 0 },
    xAxis: { type: 'value' as const },
    yAxis: { type: 'value' as const },
    grid: { top: 8, right: 24, bottom: 0, left: 0 },
    series: data.map((s) => ({
      type: 'scatter' as const,
      name: s.name,
      data: s.data.map((p) => [p.x, p.y]),
    })),
  }), [data]);

  return <ChartShell loading={loading} errorMessage={errorMessage} height={height} option={option} />;
}

export type { ScatterChartProps } from './ScatterChart.interface';

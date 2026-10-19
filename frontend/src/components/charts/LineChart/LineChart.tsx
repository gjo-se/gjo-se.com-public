import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import { buildCartesianOption, chartHeight, getAxisLabelColor, getGridStrokeColor } from '../ChartShell/ChartShell.utils';

import type { LineChartProps } from './LineChart.interface';
import type { EChartsOption } from 'echarts';

/** Renders an echarts line chart with multiple series, dots, loading skeleton, and error state. */
export default function LineChart({
  data, xDataKey, lines, height = chartHeight, loading, errorMessage,
}: LineChartProps) {
  const option: EChartsOption = useMemo(() => {
    const series = lines.map((l) => ({
      type: 'line' as const,
      data: data.map((d) => d[l.dataKey] as number | string),
      name: l.name ?? l.dataKey,
      smooth: true,
      symbolSize: l.dot === false ? 0 : 6,
      showSymbol: l.dot !== false,
      lineStyle: {
        color: l.stroke,
        width: l.strokeWidth ?? 2,
      },
      itemStyle: l.stroke ? { color: l.stroke } : undefined,
    }));

    return buildCartesianOption(data, xDataKey, series, getGridStrokeColor(), getAxisLabelColor());
  }, [data, xDataKey, lines]);

  return <ChartShell loading={loading} errorMessage={errorMessage} height={height} option={option} />;
}

export type { LineChartProps } from './LineChart.interface';

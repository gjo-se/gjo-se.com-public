import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import { buildCartesianOption, chartHeight, getAxisLabelColor, getGridStrokeColor } from '../ChartShell/ChartShell.utils';

import type { AreaChartProps } from './AreaChart.interface';
import type { EChartsOption } from 'echarts';

/** Renders an echarts area chart with gradient fills, loading skeleton, and error state. */
export default function AreaChart({
  data, xDataKey, areas, height = chartHeight, loading, errorMessage,
}: AreaChartProps) {
  const option: EChartsOption = useMemo(() => {
    const series = areas.map((a) => ({
      type: 'line' as const,
      data: data.map((d) => d[a.dataKey] as number | string),
      name: a.name ?? a.dataKey,
      lineStyle: a.stroke ? { color: a.stroke, width: 2 } : { width: 2 },
      itemStyle: a.stroke ? { color: a.stroke } : undefined,
      areaStyle: a.fill
        ? { color: a.fill, opacity: 0.25 }
        : { opacity: 0.25 },
    }));

    return buildCartesianOption(data, xDataKey, series, getGridStrokeColor(), getAxisLabelColor());
  }, [data, xDataKey, areas]);

  return <ChartShell loading={loading} errorMessage={errorMessage} height={height} option={option} />;
}

export type { AreaChartProps } from './AreaChart.interface';

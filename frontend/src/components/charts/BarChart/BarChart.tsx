import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import { buildCartesianOption, chartHeight, getAxisLabelColor, getGridStrokeColor } from '../ChartShell/ChartShell.utils';

import type { BarChartProps } from './BarChart.interface';
import type { EChartsOption } from 'echarts';

/**
 * BarChart – echarts bar chart with loading/error states.
 * No className prop – styling exclusively via props.
 */
export default function BarChart({
  data, xDataKey, bars, height = chartHeight, loading, errorMessage,
}: BarChartProps) {
  const option: EChartsOption = useMemo(() => {
    const series = bars.map((b) => ({
      type: 'bar' as const,
      data: data.map((d) => d[b.dataKey] as number | string),
      name: b.name ?? b.dataKey,
      itemStyle: {
        color: b.fill,
        borderRadius: b.radius ?? [4, 4, 0, 0],
      },
    }));

    return buildCartesianOption(data, xDataKey, series, getGridStrokeColor(), getAxisLabelColor());
  }, [data, xDataKey, bars]);

  return <ChartShell loading={loading} errorMessage={errorMessage} height={height} option={option} />;
}

export type { BarChartProps } from './BarChart.interface';

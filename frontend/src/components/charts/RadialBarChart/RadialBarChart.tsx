import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import { chartHeight } from '../ChartShell/ChartShell.utils';

import type { RadialBarChartProps } from './RadialBarChart.interface';
import type { EChartsOption } from 'echarts';

/**
 * Radial bar chart rendered via echarts polar bar series.
 *
 * Uses `coordinateSystem: 'polar'` with an `angleAxis` for category labels
 * and a `radiusAxis` for the value scale. This is the closest echarts
 * equivalent to recharts' `<RadialBarChart>`.
 */
export default function RadialBarChart({
  data, height = chartHeight + 40, loading, errorMessage,
}: RadialBarChartProps) {
  const option: EChartsOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    legend: { show: true, bottom: 0 },
    polar: {
      radius: ['20%', '90%'],
    },
    angleAxis: {
      type: 'category' as const,
      data: data.map((d) => d.name),
      startAngle: 75,
    },
    radiusAxis: {},
    series: [{
      type: 'bar' as const,
      coordinateSystem: 'polar' as const,
      data: data.map((d) => ({
        value: d.value,
        name: d.name,
        itemStyle: d.fill ? { color: d.fill } : undefined,
      })),
      barCategoryGap: '20%',
    }],
  }), [data]);

  return <ChartShell loading={loading} errorMessage={errorMessage} height={height} option={option} />;
}

export type { RadialBarChartProps } from './RadialBarChart.interface';

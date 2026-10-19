import { useMemo } from 'react';

import ChartShell from '../ChartShell/ChartShell';
import { chartHeight } from '../ChartShell/ChartShell.utils';

import type { PieChartProps } from './PieChart.interface';
import type { EChartsOption } from 'echarts';

/** Renders an echarts pie or donut chart with labelled segments, legend, loading skeleton, and error state. */
export default function PieChart({
  data, dataKey = 'value', height = chartHeight, donut, loading, errorMessage,
}: PieChartProps) {
  const option: EChartsOption = useMemo(() => ({
    tooltip: { trigger: 'item' as const },
    legend: { show: true, bottom: 0 },
    series: [{
      type: 'pie' as const,
      radius: donut ? ['40%', '70%'] : '70%',
      center: ['50%', '50%'],
      data: data.map((d) => ({
        name: d.name,
        value: Number(d[dataKey as keyof typeof d] ?? d.value),
      })),
      label: {
        formatter: '{b} {d}%',
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.2)',
        },
      },
    }],
  }), [data, dataKey, donut]);

  return <ChartShell loading={loading} errorMessage={errorMessage} height={height} option={option} />;
}

export type { PieChartProps } from './PieChart.interface';

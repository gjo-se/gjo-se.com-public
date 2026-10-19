import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import Text from '@src/components/primitives/Text';

import LoadingView from './LoadingView';
import { GRID, resolveColor } from './SkillAnalysis.constants';

import type { EChartsOption } from 'echarts';

interface MonthlyChartProps {
  monthly: { month: string; total: number; matching: number }[];
  loading: boolean;
}

/** Line chart of projects per month (total vs. ≥75% match). */
export default function MonthlyChart({ monthly, loading }: MonthlyChartProps) {
  const option: EChartsOption = useMemo(() => ({
    xAxis: {
      type: 'category',
      data: monthly.map((d) => d.month),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    grid: GRID,
    tooltip: { trigger: 'axis' as const },
    series: [
      {
        type: 'line',
        data: monthly.map((d) => d.total),
        name: 'Projekte/Monat',
        smooth: true,
        showSymbol: false,
        lineStyle: { color: resolveColor('var(--color-chart-1)'), width: 2 },
      },
      {
        type: 'line',
        data: monthly.map((d) => d.matching),
        name: 'Passende/Monat (≥75%)',
        smooth: true,
        showSymbol: false,
        lineStyle: { color: resolveColor('var(--color-chart-2)'), width: 2 },
      },
    ],
  }), [monthly]);

  if (loading) return <LoadingView height={250} />;
  if (monthly.length === 0) return <Text color="muted">Keine Daten.</Text>;
  return <ReactECharts option={option} style={{ height: 250, width: '100%' }} notMerge />;
}

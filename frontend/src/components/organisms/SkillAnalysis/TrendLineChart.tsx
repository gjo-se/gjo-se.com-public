import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import LoadingView from './LoadingView';
import { GRID, resolveColor } from './SkillAnalysis.constants';

import type { EChartsOption } from 'echarts';

interface TrendLineChartProps {
  trendRows: Record<string, unknown>[];
  trendLines: { dataKey: string; name: string; stroke: string }[];
  activeSkill: string | null;
  loading: boolean;
}

/** Line chart of skill demand over time, highlighting the active skill. */
export default function TrendLineChart({ trendRows, trendLines, activeSkill, loading }: TrendLineChartProps) {
  const option: EChartsOption = useMemo(() => ({
    xAxis: {
      type: 'category',
      data: trendRows.map((r) => r.window as string),
      axisLabel: { fontSize: 11, color: resolveColor('var(--color-muted-foreground)') },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11, color: resolveColor('var(--color-muted-foreground)') } },
    grid: GRID,
    tooltip: {
      trigger: 'item' as const,
      formatter: (paramsOrArr) => {
        const p = (Array.isArray(paramsOrArr) ? paramsOrArr[0] : paramsOrArr);
        if (!p) return '';
        const value = (Number(p.value) * 100).toFixed(1);
        return `<span style="color:#6b7280">${p.name}</span> · <span style="color:${p.color}">${value}%</span> · <span style="color:#6b7280">${p.seriesName}</span>`;
      },
    },
    series: trendLines.map((l) => {
      const opacity = activeSkill
        ? (l.name === activeSkill ? 1 : 0.12)
        : 0.85;
      return {
        type: 'line' as const,
        data: trendRows.map((r) => Number(r[l.dataKey])),
        name: l.name,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: l.stroke, width: l.name === activeSkill ? 3 : 2, opacity },
        itemStyle: { color: l.stroke, opacity },
        emphasis: { focus: 'series' as const },
      };
    }),
  }), [trendRows, trendLines, activeSkill]);

  if (loading) return <LoadingView height={300} />;
  return <ReactECharts option={option} style={{ height: 300, width: '100%' }} notMerge />;
}

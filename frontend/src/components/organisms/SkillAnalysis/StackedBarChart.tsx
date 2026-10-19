import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';

import LoadingView from './LoadingView';
import { GRID, resolveColor } from './SkillAnalysis.constants';

import type { EChartsOption } from 'echarts';

interface StackedBarChartProps {
  trendRows: Record<string, unknown>[];
  stackedSkills: string[];
  skillColor: Map<string, string>;
  activeSkill: string | null;
  loading: boolean;
}

/** Stacked bar chart of project volume per skill over time. */
export default function StackedBarChart({
  trendRows,
  stackedSkills,
  skillColor,
  activeSkill,
  loading,
}: StackedBarChartProps) {
  const option: EChartsOption = useMemo(() => ({
    xAxis: {
      type: 'category',
      data: trendRows.map((r) => r.window as string),
      axisLabel: { fontSize: 11, color: resolveColor('var(--color-muted-foreground)') },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11, color: resolveColor('var(--color-muted-foreground)') } },
    grid: GRID,
    tooltip: { trigger: 'axis' as const },
    series: stackedSkills.map((s) => {
      const opacity = activeSkill
        ? (s === activeSkill ? 1 : 0.25)
        : 1;
      return {
        type: 'bar' as const,
        data: trendRows.map((r) => Number(r[s])),
        name: s,
        stack: 'total',
        itemStyle: { color: skillColor.get(s), opacity, borderRadius: [0, 0, 0, 0] },
        emphasis: { focus: 'series' as const },
      };
    }),
  }), [trendRows, stackedSkills, skillColor, activeSkill]);

  if (loading) return <LoadingView height={300} />;
  return <ReactECharts option={option} style={{ height: 300, width: '100%' }} notMerge />;
}

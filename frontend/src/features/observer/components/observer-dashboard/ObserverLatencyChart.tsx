import ReactECharts from 'echarts-for-react';
import { useMemo, useState } from 'react';


import Skeleton from '@src/components/primitives/Skeleton';
import Text from '@src/components/primitives/Text';
import type { TimelinePoint } from '@src/features/observer/core/types';
import { useObserverTickets } from '@src/features/observer/hooks/useObserverTickets';
import { fetchMetrics } from '@src/features/observer/services/observerMetricsService';

import { useAutoRefresh } from '../../hooks/useAutoRefresh';

import type { EChartsOption } from 'echarts';

const METRICS_KEY = ['observer-metrics'];

const LINE_COLORS = {
  p50: '#10b981',
  p95: '#f59e0b',
  p99: '#ef4444',
};

function fmtHour(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtSec(ms: number): string {
  return `${(ms / 1000).toFixed(0)}s`;
}

/** Observer latency chart – echarts line chart with P50/P95/P99, baseline, and anomaly markers. */
export default function ObserverLatencyChart() {
  const { data: metrics, isLoading } = useAutoRefresh(METRICS_KEY, () => fetchMetrics('24h'));
  const { tickets } = useObserverTickets();
  const [selectedTask, setSelectedTask] = useState<string>('description-merge');

  const tasks = metrics?.tasks.map((t) => t.name) ?? [];

  const timeline: TimelinePoint[] = (metrics?.timeline ?? [])
    .filter((p) => p.task === selectedTask)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const chartData = timeline.map((p) => ({
    ts: fmtHour(p.ts),
    p50: p.p50_ms ? p.p50_ms / 1000 : null,
    p95: p.p95_ms ? p.p95_ms / 1000 : null,
    p99: p.p99_ms ? p.p99_ms / 1000 : null,
  }));

  const baseline = metrics?.tasks.find((t) => t.name === selectedTask)?.p95_ms;
  const baselineSec = baseline ? baseline / 1000 : undefined;

  const anomalyTimestamps = tickets
    .filter((t) => t.task === selectedTask)
    .map((t) => fmtHour(t.created_at));

  const option: EChartsOption = useMemo(() => {
    const tsLabels = chartData.map((d) => d.ts);
    const p50Data = chartData.map((d) => d.p50);
    const p95Data = chartData.map((d) => d.p95);
    const p99Data = chartData.map((d) => d.p99);

    const p95Series: Record<string, unknown> = {
      type: 'line',
      name: 'p95',
      data: p95Data,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: LINE_COLORS.p95, width: 2, type: 'dashed' },
    };

    if (baselineSec !== undefined) {
      p95Series.markLine = {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#6b7280', type: 'dashed' },
        data: [{ yAxis: baselineSec, label: { formatter: 'Baseline p95', fontSize: 11 } }],
      };
    }

    const p50Series: Record<string, unknown> = {
      type: 'line',
      name: 'p50',
      data: p50Data,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: LINE_COLORS.p50, width: 2 },
    };

    if (anomalyTimestamps.length > 0) {
      p50Series.markLine = {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
        data: anomalyTimestamps.map((ts) => ({ xAxis: ts })),
      };
    }

    return {
      xAxis: {
        type: 'category',
        data: tsLabels,
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 12, formatter: (v: number) => fmtSec(v) },
      },
      grid: { top: 8, right: 24, bottom: 0, left: 0 },
      tooltip: {
        trigger: 'axis',
        formatter: (paramsOrArr) => {
          const params = Array.isArray(paramsOrArr) ? paramsOrArr : [paramsOrArr];
          if (!params.length) return '';
          const label = `Zeit: ${params[0].name}`;
          const lines = params.map(
            (p) => `${p.marker}${p.seriesName}: ${Number(p.value).toFixed(1)}s`,
          );
          return `${label}<br/>${lines.join('<br/>')}`;
        },
      },
      legend: { show: true, bottom: 0 },
      series: [p50Series, p95Series, { type: 'line', name: 'p99', data: p99Data, smooth: true, showSymbol: false, lineStyle: { color: LINE_COLORS.p99, width: 2, type: 'dotted' } }],
    };
  }, [chartData, baselineSec, anomalyTimestamps]);

  if (isLoading) {
    return <Skeleton />;
  }

  if (chartData.length === 0) {
    return (
      <div className="py-8">
        <Text size="sm" color="muted" align="center">Keine Daten für gewähltes Zeitfenster</Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="task-select" className="text-sm text-on-surface-secondary">Task:</label>
          <select
            id="task-select"
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="rounded border border-border bg-surface px-2 py-1 text-sm text-on-surface"
          >
            {tasks.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      <ReactECharts option={option} style={{ width: '100%', height: 350 }} notMerge />
    </div>
  );
}

import Text from '@src/components/primitives/Text';
import { fetchMetrics } from '@src/features/observer/services/observerMetricsService';

import { useAutoRefresh } from '../../hooks/useAutoRefresh';

import { CARD } from './constants';

const METRICS_KEY = ['observer-metrics'];

function fmtMs(ms: number | null): string {
  if (ms === null || ms === undefined) return '--';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function latencyClass(currentMs: number | null, baselineMs?: number): string {
  if (currentMs === null) return 'text-on-surface-muted';
  if (baselineMs && currentMs > baselineMs * 2) return 'text-destructive';
  if (baselineMs && currentMs > baselineMs) return 'text-warning';
  return 'text-success';
}

/**
 *
 */
export default function ObserverHealthCard({ task }: { task: string }) {
  const { data: metrics } = useAutoRefresh(METRICS_KEY, () => fetchMetrics('24h'));
  const taskMetric = metrics?.tasks.find(t => t.name === task);

  return (
    <div className={CARD}>
      <Text as="h3" size="sm" weight="medium">{task}</Text>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <Text as="span" size="xs" color="secondary">p50</Text>
          <div className={`text-lg ${latencyClass(taskMetric?.p50_ms ?? null)}`}>
            <Text as="p" weight="semibold">
              {fmtMs(taskMetric?.p50_ms ?? null)}
            </Text>
          </div>
        </div>
        <div>
          <Text as="span" size="xs" color="secondary">p95</Text>
          <div className={`text-lg ${latencyClass(taskMetric?.p95_ms ?? null)}`}>
            <Text as="p" weight="semibold">
              {fmtMs(taskMetric?.p95_ms ?? null)}
            </Text>
          </div>
        </div>
        <div>
          <Text as="span" size="xs" color="secondary">p99</Text>
          <div className={`text-lg ${latencyClass(taskMetric?.p99_ms ?? null)}`}>
            <Text as="p" weight="semibold">
              {fmtMs(taskMetric?.p99_ms ?? null)}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

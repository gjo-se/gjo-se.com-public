import Text from '@src/components/primitives/Text';
import { fetchMetrics } from '@src/features/observer/services/observerMetricsService';

import { useAutoRefresh } from '../../hooks/useAutoRefresh';
// TODO: Re-enable when timeline comparison is implemented.
// import type { TimelinePoint } from '@src/features/observer/core/types';

import { CARD } from './constants';


const METRICS_KEY = ['observer-metrics'];

function errorClass(rate: number): string {
  if (rate > 0.05) return 'text-destructive';
  if (rate > 0.02) return 'text-warning';
  return 'text-success';
}

/**
 *
 */
export default function ObserverErrorCard({ task }: { task: string }) {
  const { data: metrics } = useAutoRefresh(METRICS_KEY, () => fetchMetrics('24h'));
  const taskMetric = metrics?.tasks.find(t => t.name === task);
  const rate = taskMetric?.error_rate ?? 0;

  return (
    <div className={CARD}>
      <Text as="h3" size="sm" weight="medium">Error-Rate: {task}</Text>
      <div className={`mt-2 text-2xl ${errorClass(rate)}`}>
        <Text as="p" weight="bold">
          {(rate * 100).toFixed(1)}%
          <div className="ml-2">
            <Text as="span" size="md">{trendArrow(rate, 0)}</Text>
          </div>
        </Text>
      </div>
      <div className="mt-1">
        <Text as="p" size="xs" color="secondary">der letzten 24h</Text>
      </div>
    </div>
  );
}

// TODO: Re-enable when timeline comparison is implemented.
// function prevErrorRate(timeline: TimelinePoint[], task: string): number | null {
//   const points = timeline.filter(p => p.task === task);
//   if (points.length < 2) return null;
//   return points[points.length - 2].p50_ms !== null ? 1 : 0;
// }


function trendArrow(current: number, previous: number | null): string {
  if (previous === null || previous === current) return '→';
  return current > previous ? '↑' : '↓';
}

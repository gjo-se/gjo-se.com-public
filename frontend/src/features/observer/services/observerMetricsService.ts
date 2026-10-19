import type { ObserverMetrics } from '@src/features/observer/core/types';
import { api } from '@src/lib/api/axios';

/**
 *
 */
export async function fetchMetrics(window = '24h'): Promise<ObserverMetrics> {
  const res = await api.get<ObserverMetrics>('/admin/llm/observer/metrics', {
    params: { window },
  });
  return res.data;
}

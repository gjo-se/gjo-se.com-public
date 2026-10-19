/**
 * Tests: observerMetricsService
 *
 * Verifies the metrics endpoint and its window parameter (default + explicit).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { fetchMetrics } from '@src/features/observer/services/observerMetricsService';

import { httpBoundary } from '../../helpers/httpBoundary';

const URL = '/admin/llm/observer/metrics';

beforeEach(() => {
  httpBoundary.reset();
});

describe('observerMetricsService', () => {
  it('loads the metrics for the default window', async () => {
    httpBoundary.on('get', URL, () => ({ calls: 3 }));

    await expect(fetchMetrics()).resolves.toEqual({ calls: 3 });
    expect(httpBoundary.calls[0].params).toEqual({ window: '24h' });
  });

  it('passes an explicit window', async () => {
    httpBoundary.on('get', URL, () => ({ calls: 9 }));

    await fetchMetrics('7d');

    expect(httpBoundary.calls[0].params).toEqual({ window: '7d' });
  });

  it('propagates request errors', async () => {
    httpBoundary.on('get', URL, () => {
      throw new Error('offline');
    });

    await expect(fetchMetrics()).rejects.toThrow('offline');
  });
});

/**
 * Tests: useLLMCallLogStats – derives the dashboard tiles from stats + newest errors.
 *
 * Covers the empty/default equivalence class, the "most common error type"
 * maximum (with tie boundary), the distinct-task count and the explicit error
 * path when the aggregate request fails.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CallLogOut, CallLogStats } from '@src/lib/api/callLog';
import { useLLMCallLogStats } from '@src/features/llm/hooks/useLLMCallLogStats';

const api = vi.hoisted(() => {
  let stats: CallLogStats | null = null
  let errors: CallLogOut[] = []
  let dead: CallLogOut[] = []
  let statsFailure: Error | null = null

  return {
    fetchCallLogStats: (): Promise<CallLogStats> => {
      if (statsFailure) return Promise.reject(statsFailure)
      return Promise.resolve(stats ?? { total: 0, success: 0, errors: 0, by_error_type: {} })
    },
    fetchCallLogs: (params?: { retry_status?: string }): Promise<{ items: CallLogOut[]; total: number }> => {
      const items = params?.retry_status === 'dead' ? dead : errors
      return Promise.resolve({ items, total: items.length })
    },
    reset(): void {
      stats = null
      errors = []
      dead = []
      statsFailure = null
    },
    respondStatsWith(next: CallLogStats): void {
      stats = next
    },
    respondErrorsWith(next: CallLogOut[]): void {
      errors = next
    },
    respondDeadWith(next: CallLogOut[]): void {
      dead = next
    },
    failStatsWith(error: Error): void {
      statsFailure = error
    },
  }
})

vi.mock('@src/lib/api/callLog', () => ({
  fetchCallLogStats: api.fetchCallLogStats,
  fetchCallLogs: api.fetchCallLogs,
}));

function errorRow(id: number, task: string, createdAt: string): CallLogOut {
  return { id, task, created_at: createdAt } as CallLogOut;
}

describe('useLLMCallLogStats', () => {
  beforeEach(() => {
    api.reset();
    localStorage.clear();
  });

  it('returns zero tiles before statistics are loaded', () => {
    const { result } = renderHook(() => useLLMCallLogStats());

    expect(result.current.tiles).toEqual({
      errorsToday: 0,
      mostCommonErrorType: null,
      affectedTasks: 0,
    });
    expect(result.current.newestErrorAt).toBeNull();
  });

  it('derives the tiles from stats and the newest errors', async () => {
    api.respondStatsWith({
      total: 20,
      success: 15,
      errors: 5,
      by_error_type: { rate_limit: 3, provider_error: 2 },
    });
    api.respondErrorsWith([
      errorRow(3, 'merge_description', '2025-01-03T00:00:00Z'),
      errorRow(2, 'merge_description', '2025-01-02T00:00:00Z'),
      errorRow(1, 'classify_skills', '2025-01-01T00:00:00Z'),
    ]);

    const { result } = renderHook(() => useLLMCallLogStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tiles).toEqual({
      errorsToday: 5,
      mostCommonErrorType: 'rate_limit',
      affectedTasks: 2,
    });
    expect(result.current.newestErrorAt).toBe('2025-01-03T00:00:00Z');
  });

  it('keeps the first error type on a count tie', async () => {
    api.respondStatsWith({
      total: 2,
      success: 0,
      errors: 2,
      by_error_type: { no_mapping: 1, provider_error: 1 },
    });

    const { result } = renderHook(() => useLLMCallLogStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tiles.mostCommonErrorType).toBe('no_mapping');
  });

  it('reports an explicit error when the statistics request fails', async () => {
    api.failStatsWith(new Error('stats offline'));

    const { result } = renderHook(() => useLLMCallLogStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Statistik.');
    expect(result.current.stats).toBeNull();
  });
});

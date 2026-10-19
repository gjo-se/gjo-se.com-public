/**
 * Tests: useTaskEvalRuns – loads runs, starts polling after a trigger and
 * stops as soon as every candidate in the batch is terminal.
 *
 * The HTTP edge is faked; polling uses fake timers to stay deterministic.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskEvalRuns } from '@src/features/llm/hooks/useTaskEvalRuns';
import type { LlmEvalRun } from '@src/features/llm/services/evalRunService';

const http = vi.hoisted(() => {
  const requests: string[] = []
  let latest: unknown = null
  let batch: unknown[] = []
  let history: unknown[] = []
  let postFailure: Error | null = null

  return {
    requests,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        requests.push(`GET ${url}`)
        if (url.endsWith('/eval/latest')) return Promise.resolve({ data: latest })
        if (url.endsWith('/eval/latest-batch')) return Promise.resolve({ data: batch })
        return Promise.resolve({ data: history })
      },
      post: (url: string): Promise<{ data: unknown }> => {
        requests.push(`POST ${url}`)
        return postFailure
          ? Promise.reject(postFailure)
          : Promise.resolve({ data: { message: 'queued', task: 'merge_description', trigger: 'manual' } })
      },
    },
    reset(): void {
      requests.length = 0
      latest = null
      batch = []
      history = []
      postFailure = null
    },
    respondLatestWith(next: unknown): void {
      latest = next
    },
    respondBatchWith(next: unknown[]): void {
      batch = next
    },
    respondHistoryWith(next: unknown[]): void {
      history = next
    },
    failTriggerWith(error: Error): void {
      postFailure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function run(id: number, status: LlmEvalRun['overall_status']): LlmEvalRun {
  return {
    id,
    task: 'merge_description',
    model_config_id: 1,
    trigger: 'manual',
    gate_results: null,
    overall_status: status,
    reviewer: null,
    created_at: '2025-01-01T00:00:00Z',
  };
}

describe('useTaskEvalRuns', () => {
  beforeEach(() => {
    http.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the latest run and the latest batch', async () => {
    http.respondLatestWith(run(2, 'passed'));
    http.respondBatchWith([run(1, 'passed'), run(2, 'passed')]);

    const { result } = renderHook(() => useTaskEvalRuns('merge_description'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.latestRun).toEqual(run(2, 'passed'));
    expect(result.current.latestBatch).toHaveLength(2);
    expect(result.current.isRunning).toBe(false);
  });

  it('does not load anything without a task key', () => {
    const { result } = renderHook(() => useTaskEvalRuns(undefined));

    expect(result.current.latestRun).toBeNull();
    expect(http.requests).toEqual([]);
  });

  it('starts polling after a trigger and stops when all runs are terminal', async () => {
    vi.useFakeTimers();
    http.respondLatestWith(run(2, 'running'));
    http.respondBatchWith([run(2, 'running')]);

    const { result } = renderHook(() => useTaskEvalRuns('merge_description'));

    await act(async () => {
      await result.current.triggerEval();
    });

    expect(http.requests).toContain('POST /admin/llm/tasks/merge_description/eval');
    expect(result.current.isRunning).toBe(true);

    http.respondLatestWith(run(2, 'passed'));
    http.respondBatchWith([run(1, 'passed'), run(2, 'passed')]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.latestRun?.overall_status).toBe('passed');
  });

  it('reports an error when the trigger request fails', async () => {
    http.failTriggerWith(new Error('queue down'));

    const { result } = renderHook(() => useTaskEvalRuns('merge_description'));

    await act(async () => {
      await result.current.triggerEval();
    });

    expect(result.current.error).toBe('Eval-Run konnte nicht gestartet werden.');
    expect(result.current.isRunning).toBe(false);
  });

  it('loads the run history on refresh', async () => {
    http.respondLatestWith(run(2, 'passed'));
    http.respondBatchWith([run(2, 'passed')]);
    http.respondHistoryWith([run(1, 'failed'), run(2, 'passed')]);

    const { result } = renderHook(() => useTaskEvalRuns('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.runs).toHaveLength(2);
    expect(http.requests).toContain('GET /admin/llm/eval-runs/merge_description');
  });
});

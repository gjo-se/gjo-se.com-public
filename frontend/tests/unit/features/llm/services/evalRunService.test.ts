/**
 * Tests: evalRunService – HTTP contract plus graceful-degradation paths.
 *
 * The two "latest" endpoints intentionally swallow errors and return neutral
 * values; those are the real error paths covered here. Trigger defaults and
 * explicit triggers are both verified.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchEvalRuns,
  fetchLatestEval,
  fetchLatestEvalBatch,
  triggerEval,
  type LlmEvalRun,
} from '@src/features/llm/services/evalRunService';

const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'post'
    url: string
    body?: unknown
  }

  const calls: RecordedCall[] = []
  let getResult: unknown = undefined
  let postResult: unknown = undefined
  let failure: Error | null = null

  return {
    calls,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'get', url })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: getResult })
      },
      post: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'post', url, body })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: postResult })
      },
    },
    reset(): void {
      calls.length = 0
      getResult = undefined
      postResult = undefined
      failure = null
    },
    respondGetWith(next: unknown): void {
      getResult = next
    },
    respondPostWith(next: unknown): void {
      postResult = next
    },
    failWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

const run: LlmEvalRun = {
  id: 9,
  task: 'merge_description',
  model_config_id: 3,
  trigger: 'manual',
  gate_results: null,
  overall_status: 'passed',
  reviewer: null,
  created_at: '2025-01-01T00:00:00Z',
};

describe('evalRunService', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads the eval runs of a task', async () => {
    http.respondGetWith([run]);

    await expect(fetchEvalRuns('merge_description')).resolves.toEqual([run]);
    expect(http.calls).toEqual([
      { method: 'get', url: '/admin/llm/eval-runs/merge_description' },
    ]);
  });

  it('loads the latest eval run', async () => {
    http.respondGetWith(run);

    await expect(fetchLatestEval('merge_description')).resolves.toEqual(run);
    expect(http.calls).toEqual([
      { method: 'get', url: '/admin/llm/tasks/merge_description/eval/latest' },
    ]);
  });

  it('returns null when the latest eval request fails', async () => {
    http.failWith(new Error('not found'));

    await expect(fetchLatestEval('merge_description')).resolves.toBeNull();
  });

  it('returns an empty batch when the latest-batch request fails', async () => {
    http.failWith(new Error('not found'));

    await expect(fetchLatestEvalBatch('missing')).resolves.toEqual([]);
  });

  it('triggers a manual eval by default', async () => {
    http.respondPostWith({ message: 'queued', task: 'merge_description', trigger: 'manual' });

    await expect(triggerEval('merge_description')).resolves.toEqual({
      message: 'queued',
      task: 'merge_description',
      trigger: 'manual',
    });
    expect(http.calls).toEqual([
      { method: 'post', url: '/admin/llm/tasks/merge_description/eval', body: { trigger: 'manual' } },
    ]);
  });

  it('passes an explicit trigger through', async () => {
    http.respondPostWith({ message: 'queued', task: 'merge_description', trigger: 'model_change' });

    await triggerEval('merge_description', 'model_change');

    expect(http.calls[0]).toEqual({
      method: 'post',
      url: '/admin/llm/tasks/merge_description/eval',
      body: { trigger: 'model_change' },
    });
  });
});

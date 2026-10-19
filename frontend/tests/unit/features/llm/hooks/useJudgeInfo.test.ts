/**
 * Tests: useJudgeInfo – loads the LangFuse judge model.
 *
 * Success exposes the payload and leaves loading=false; a failed request
 * surfaces the error message (real error path) and also stops loading.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useJudgeInfo } from '@src/features/llm/hooks/useJudgeInfo';

const http = vi.hoisted(() => {
  const urls: string[] = []
  let response: { data: unknown } | null = null
  let failure: Error | null = null

  return {
    urls,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        urls.push(url)
        if (failure) return Promise.reject(failure)
        return Promise.resolve(response ?? { data: null })
      },
    },
    reset(): void {
      urls.length = 0
      response = null
      failure = null
    },
    respondWith(next: unknown): void {
      response = { data: next }
    },
    failWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

describe('useJudgeInfo', () => {
  beforeEach(() => {
    http.reset();
  });

  it('exposes the judge model once loaded', async () => {
    const judge = {
      provider: 'langfuse',
      model_name: 'gpt-4o',
      internal_model_id: 3,
      internal_display_name: 'GPT-4o',
      configured: true,
    };
    http.respondWith(judge);

    const { result } = renderHook(() => useJudgeInfo());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.judgeInfo).toEqual(judge);
    expect(result.current.error).toBeNull();
    expect(http.urls).toEqual(['/admin/llm/eval-runs/judge-info']);
  });

  it('reports the error message and stops loading on failure', async () => {
    http.failWith(new Error('judge unavailable'));

    const { result } = renderHook(() => useJudgeInfo());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.judgeInfo).toBeNull();
    expect(result.current.error).toBe('judge unavailable');
  });
});

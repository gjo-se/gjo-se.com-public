/**
 * Tests: useLLMObservability – loads the LangSmith dashboard config once.
 *
 * Success exposes the config; a failing request is best-effort and leaves the
 * config null without throwing.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLLMObservability } from '@src/features/llm/hooks/useLLMObservability';

const api = vi.hoisted(() => {
  let response: unknown = null
  let failure: Error | null = null
  let attempts = 0

  return {
    fetchObservabilityConfig: (): Promise<unknown> => {
      attempts += 1
      if (failure) return Promise.reject(failure)
      return Promise.resolve(response)
    },
    reset(): void {
      response = null
      failure = null
      attempts = 0
    },
    respondWith(next: unknown): void {
      response = next
    },
    failWith(error: Error): void {
      failure = error
    },
    attempts(): number {
      return attempts
    },
  }
})

vi.mock('@src/lib/api/callLog', () => ({
  fetchObservabilityConfig: api.fetchObservabilityConfig,
}));

describe('useLLMObservability', () => {
  beforeEach(() => {
    api.reset();
  });

  it('exposes the observability config once loaded', async () => {
    const config = { enabled: true, project_name: 'gjose', url: 'https://smith.example/project' };
    api.respondWith(config);

    const { result } = renderHook(() => useLLMObservability());

    await waitFor(() => expect(result.current.config).toEqual(config));
  });

  it('keeps the config null when the request fails', async () => {
    api.failWith(new Error('offline'));

    const { result } = renderHook(() => useLLMObservability());

    await waitFor(() => expect(api.attempts()).toBe(1));
    expect(result.current.config).toBeNull();
  });
});

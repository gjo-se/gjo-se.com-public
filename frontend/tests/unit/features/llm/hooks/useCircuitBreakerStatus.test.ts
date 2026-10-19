/**
 * Tests: useCircuitBreakerStatus – loads and refreshes breaker states and
 * resets a breaker through the admin API.
 *
 * Only CLOSED states are used so the 30s polling interval never starts; the
 * error path must leave the list empty without throwing.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCircuitBreakerStatus } from '@src/features/llm/hooks/useCircuitBreakerStatus';
import type { CircuitBreakerStatus } from '@src/features/llm/services/circuitBreakerService';

const http = vi.hoisted(() => {
  const requests: string[] = []
  let list: CircuitBreakerStatus[] = []
  let failure: Error | null = null

  return {
    requests,
    api: {
      get: (): Promise<{ data: unknown }> => {
        requests.push('GET')
        return failure ? Promise.reject(failure) : Promise.resolve({ data: list })
      },
      post: (url: string): Promise<{ data: unknown }> => {
        requests.push(`POST ${url}`)
        return Promise.resolve({ data: {} })
      },
    },
    reset(): void {
      requests.length = 0
      list = []
      failure = null
    },
    respondWith(next: CircuitBreakerStatus[]): void {
      list = next
    },
    failWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function breaker(providerKey: string, state: CircuitBreakerStatus['state']): CircuitBreakerStatus {
  return {
    provider_key: providerKey,
    state,
    failure_count: 0,
    opened_at: null,
    last_probe_at: null,
    threshold: 3,
    cooldown_seconds: 60,
  };
}

describe('useCircuitBreakerStatus', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads all breaker states on mount', async () => {
    http.respondWith([breaker('direct', 'CLOSED'), breaker('openrouter', 'CLOSED')]);

    const { result } = renderHook(() => useCircuitBreakerStatus());

    await waitFor(() => expect(result.current.breakers).toHaveLength(2));

    expect(result.current.breakers.map((b) => b.provider_key)).toEqual(['direct', 'openrouter']);
  });

  it('refreshes the breaker list on demand', async () => {
    http.respondWith([breaker('direct', 'CLOSED')]);
    const { result } = renderHook(() => useCircuitBreakerStatus());
    await waitFor(() => expect(result.current.breakers).toHaveLength(1));

    http.respondWith([breaker('direct', 'CLOSED'), breaker('openrouter', 'CLOSED')]);
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.breakers).toHaveLength(2));
  });

  it('resets a breaker through the API and reloads the list', async () => {
    http.respondWith([breaker('direct', 'CLOSED')]);
    const { result } = renderHook(() => useCircuitBreakerStatus());
    await waitFor(() => expect(result.current.breakers).toHaveLength(1));

    http.respondWith([breaker('direct', 'CLOSED'), breaker('openrouter', 'CLOSED')]);
    await act(async () => {
      await result.current.handleReset('direct');
    });

    expect(http.requests).toContain('POST /admin/llm/circuit-breaker/direct/reset');
    expect(result.current.breakers).toHaveLength(2);
  });

  it('keeps the list empty when loading fails', async () => {
    http.failWith(new Error('offline'));

    const { result } = renderHook(() => useCircuitBreakerStatus());

    await waitFor(() => expect(http.requests.length).toBe(1));
    expect(result.current.breakers).toEqual([]);
  });
});

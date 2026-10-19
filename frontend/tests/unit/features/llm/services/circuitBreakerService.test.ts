/**
 * Tests: circuitBreakerService – HTTP contract for the circuit-breaker admin API.
 *
 * The HTTP edge is faked (boundary); assertions check the observable request
 * (method, path, payload) and the returned data, including the error path.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchCircuitBreakers,
  resetCircuitBreaker,
  type CircuitBreakerStatus,
} from '@src/features/llm/services/circuitBreakerService';

const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'post'
    url: string
  }

  const calls: RecordedCall[] = []
  let getResult: unknown = []
  let postResult: unknown = undefined
  let failure: Error | null = null

  return {
    calls,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'get', url })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: getResult })
      },
      post: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'post', url })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: postResult })
      },
    },
    reset(): void {
      calls.length = 0
      getResult = []
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

const closedBreaker: CircuitBreakerStatus = {
  provider_key: 'direct',
  state: 'CLOSED',
  failure_count: 0,
  opened_at: null,
  last_probe_at: null,
  threshold: 3,
  cooldown_seconds: 60,
};

describe('circuitBreakerService', () => {
  beforeEach(() => {
    http.reset();
  });

  it('reads all breaker statuses from the admin endpoint', async () => {
    http.respondGetWith([closedBreaker]);

    await expect(fetchCircuitBreakers()).resolves.toEqual([closedBreaker]);
    expect(http.calls).toEqual([{ method: 'get', url: '/admin/llm/circuit-breaker' }]);
  });

  it('resets a breaker via its encoded provider key', async () => {
    http.respondPostWith({ provider_key: 'open router/x', state: 'CLOSED', failure_count: 0 });

    await expect(resetCircuitBreaker('open router/x')).resolves.toEqual({
      provider_key: 'open router/x',
      state: 'CLOSED',
      failure_count: 0,
    });
    expect(http.calls).toEqual([
      { method: 'post', url: '/admin/llm/circuit-breaker/open%20router%2Fx/reset' },
    ]);
  });

  it('propagates request failures to the caller', async () => {
    http.failWith(new Error('backend down'));

    await expect(fetchCircuitBreakers()).rejects.toThrow('backend down');
  });
});

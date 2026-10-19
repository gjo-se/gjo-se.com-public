/**
 * Tests: useLLMProviders – client-side provider table hook.
 *
 * Verifies the filter for internal `~` providers, the table contract, the
 * load error path and the sync action (result + reload).
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLLMProviders } from '@src/features/llm/hooks/useLLMProviders';
import type { LLMProviderAdmin } from '@src/lib/api/llmProviders';

const http = vi.hoisted(() => {
  const requests: string[] = []
  let providers: LLMProviderAdmin[] = []
  let syncResult: unknown = { providers_upserted: 1, models_upserted: 5, snapshots_created: 0 }
  let listFailure: Error | null = null

  return {
    requests,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        requests.push(`GET ${url}`)
        return listFailure ? Promise.reject(listFailure) : Promise.resolve({ data: providers })
      },
      patch: (url: string): Promise<{ data: unknown }> => {
        requests.push(`PATCH ${url}`)
        return Promise.resolve({ data: {} })
      },
      post: (url: string): Promise<{ data: unknown }> => {
        requests.push(`POST ${url}`)
        return Promise.resolve({ data: syncResult })
      },
    },
    reset(): void {
      requests.length = 0
      providers = []
      syncResult = { providers_upserted: 1, models_upserted: 5, snapshots_created: 0 }
      listFailure = null
    },
    respondProvidersWith(next: LLMProviderAdmin[]): void {
      providers = next
    },
    respondSyncWith(next: unknown): void {
      syncResult = next
    },
    failListWith(error: Error): void {
      listFailure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function provider(id: number, name: string): LLMProviderAdmin {
  return { id, name, display_name: name, api_base: null, created_at: '2025-01-01T00:00:00Z' };
}

describe('useLLMProviders', () => {
  beforeEach(() => {
    http.reset();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('loads providers and hides internal "~" entries', async () => {
    http.respondProvidersWith([
      provider(1, 'openai'),
      provider(2, '~internal'),
      provider(3, 'openrouter'),
    ]);

    const { result } = renderHook(() => useLLMProviders());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((p) => p.name)).toEqual(['openai', 'openrouter']);
    expect(result.current.table.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('reports a load error and keeps the data empty', async () => {
    http.failListWith(new Error('offline'));

    const { result } = renderHook(() => useLLMProviders());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Daten.');
    expect(result.current.table.data).toEqual([]);
  });

  it('syncs models, exposes the result and reloads the providers', async () => {
    http.respondProvidersWith([provider(1, 'openai')]);
    const { result } = renderHook(() => useLLMProviders());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const syncPayload = { providers_upserted: 2, models_upserted: 11, snapshots_created: 4 };
    http.respondSyncWith(syncPayload);

    await act(async () => {
      await result.current.handleSync();
    });

    expect(result.current.syncResult).toEqual(syncPayload);
    expect(result.current.syncing).toBe(false);
    expect(http.requests).toContain('POST /admin/llm/models/sync');
    expect(http.requests.filter((r) => r === 'GET /admin/llm/providers')).toHaveLength(2);
  });
});

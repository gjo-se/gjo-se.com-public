/**
 * Tests: modelCatalogService – HTTP contract for the LLM model catalog.
 *
 * Verifies which filters reach the server, that count omits paging/sorting
 * while the list adds them, and that empty/null filters are not sent.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchModelById,
  fetchModelCount,
  fetchModels,
  patchLLMModelActive,
  syncLLMModels,
  type LLMModelEntry,
} from '@src/features/llm/services/modelCatalogService';

const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'patch' | 'post'
    url: string
    config?: unknown
    body?: unknown
  }

  const calls: RecordedCall[] = []
  let getResult: unknown = undefined
  let patchResult: unknown = undefined
  let postResult: unknown = undefined

  return {
    calls,
    api: {
      get: (url: string, config?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'get', url, config })
        return Promise.resolve({ data: getResult })
      },
      patch: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'patch', url, body })
        return Promise.resolve({ data: patchResult })
      },
      post: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'post', url })
        return Promise.resolve({ data: postResult })
      },
    },
    reset(): void {
      calls.length = 0
      getResult = undefined
      patchResult = undefined
      postResult = undefined
    },
    respondGetWith(next: unknown): void {
      getResult = next
    },
    respondPatchWith(next: unknown): void {
      patchResult = next
    },
    respondPostWith(next: unknown): void {
      postResult = next
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

const model = { id: 5, display_name: 'GPT-4' } as LLMModelEntry;

describe('modelCatalogService', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads a single model by id', async () => {
    http.respondGetWith(model);

    await expect(fetchModelById(5)).resolves.toBe(model);
    expect(http.calls).toEqual([{ method: 'get', url: '/admin/llm/models/5', config: undefined }]);
  });

  it('sends only filter params to the count endpoint', async () => {
    http.respondGetWith({ total: 12 });

    await expect(
      fetchModelCount({ provider_id: 2, q: 'gpt', is_active: false, offset: 40, limit: 20 }),
    ).resolves.toBe(12);

    expect(http.calls[0]).toEqual({
      method: 'get',
      url: '/admin/llm/models/count',
      config: {
        params: { provider_id: '2', q: 'gpt', is_active: 'false' },
      },
    });
  });

  it('adds sorting and paging params for the list endpoint', async () => {
    http.respondGetWith([model]);

    await expect(
      fetchModels({ q: 'gpt', sort_by: 'display_name', sort_order: 'asc', offset: 20, limit: 10 }),
    ).resolves.toEqual([model]);

    expect(http.calls[0]).toEqual({
      method: 'get',
      url: '/admin/llm/models',
      config: {
        params: {
          q: 'gpt',
          sort_by: 'display_name',
          sort_order: 'asc',
          offset: '20',
          limit: '10',
        },
      },
    });
  });

  it('omits empty filters and keeps the zero price bound', async () => {
    http.respondGetWith([]);

    await fetchModels({ q: '', provider_id: null, price_min: 0, reasoning: true });

    expect(http.calls[0]).toEqual({
      method: 'get',
      url: '/admin/llm/models',
      config: { params: { price_min: '0', reasoning: 'true' } },
    });
  });

  it('patches the active flag of a model', async () => {
    http.respondPatchWith({ ...model, active: true });

    const result = await patchLLMModelActive(5, true);

    expect(http.calls[0]).toEqual({
      method: 'patch',
      url: '/admin/llm/models/5',
      body: { active: true },
    });
    expect(result.active).toBe(true);
  });

  it('triggers the full model sync', async () => {
    const syncResult = { providers_upserted: 2, models_upserted: 10, snapshots_created: 3 };
    http.respondPostWith(syncResult);

    await expect(syncLLMModels()).resolves.toEqual(syncResult);
    expect(http.calls[0]).toEqual({ method: 'post', url: '/admin/llm/models/sync' });
  });
});

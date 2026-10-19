/**
 * Tests: modelConfigService – HTTP contract for model configs.
 *
 * Covers create/read/update/delete paths and the error propagation path
 * (create rejection).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createModelConfig,
  deleteModelConfig,
  fetchModelConfigs,
  updateModelConfig,
  type ModelConfigRow,
} from '@src/features/llm/services/modelConfigService';

const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'post' | 'patch' | 'delete'
    url: string
    body?: unknown
  }

  const calls: RecordedCall[] = []
  let result: unknown = undefined
  let failure: Error | null = null

  return {
    calls,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'get', url })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: result })
      },
      post: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'post', url, body })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: result })
      },
      patch: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'patch', url, body })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: result })
      },
      delete: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'delete', url })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: result })
      },
    },
    reset(): void {
      calls.length = 0
      result = undefined
      failure = null
    },
    respondWith(next: unknown): void {
      result = next
    },
    failWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

const row = { id: 4, task: 'merge_description', model_id: 5 } as ModelConfigRow;

describe('modelConfigService', () => {
  beforeEach(() => {
    http.reset();
  });

  it('creates a config for a task', async () => {
    http.respondWith(row);

    await expect(
      createModelConfig('merge_description', { model_id: 5, is_production: true }),
    ).resolves.toBe(row);
    expect(http.calls[0]).toEqual({
      method: 'post',
      url: '/admin/llm/model-config/merge_description',
      body: { model_id: 5, is_production: true },
    });
  });

  it('loads all configs of a task', async () => {
    http.respondWith([row]);

    await expect(fetchModelConfigs('merge_description')).resolves.toEqual([row]);
    expect(http.calls[0]).toEqual({
      method: 'get',
      url: '/admin/llm/model-config/merge_description',
    });
  });

  it('updates a config partially', async () => {
    http.respondWith({ ...row, is_production: false });

    await expect(updateModelConfig(4, { is_production: false })).resolves.toMatchObject({
      is_production: false,
    });
    expect(http.calls[0]).toEqual({
      method: 'patch',
      url: '/admin/llm/model-config/4',
      body: { is_production: false },
    });
  });

  it('deletes a config by id', async () => {
    await deleteModelConfig(4);

    expect(http.calls[0]).toEqual({ method: 'delete', url: '/admin/llm/model-config/4' });
  });

  it('propagates create failures', async () => {
    http.failWith(new Error('conflict'));

    await expect(createModelConfig('merge_description', { model_id: 5 })).rejects.toThrow('conflict');
  });
});

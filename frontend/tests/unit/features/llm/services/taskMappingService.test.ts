/**
 * Tests: taskMappingService – HTTP contract for task mapping administration.
 *
 * Covers the list read plus the two write verbs, including the exact payloads
 * used by the auto-save UI.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchTasks,
  setTaskMappingActive,
  upsertTaskMapping,
  type TaskWithMapping,
} from '@src/features/llm/services/taskMappingService';

const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'patch' | 'put'
    url: string
    body?: unknown
  }

  const calls: RecordedCall[] = []
  let result: unknown = undefined

  return {
    calls,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        calls.push({ method: 'get', url })
        return Promise.resolve({ data: result })
      },
      patch: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'patch', url, body })
        return Promise.resolve({ data: result })
      },
      put: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'put', url, body })
        return Promise.resolve({ data: result })
      },
    },
    reset(): void {
      calls.length = 0
      result = undefined
    },
    respondWith(next: unknown): void {
      result = next
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

const task = { key: 'merge_description', display_name: 'Merge Description' } as TaskWithMapping;

describe('taskMappingService', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads all tasks with their mappings', async () => {
    http.respondWith([task]);

    await expect(fetchTasks()).resolves.toEqual([task]);
    expect(http.calls[0]).toEqual({ method: 'get', url: '/admin/llm/tasks' });
  });

  it('toggles the active flag of a mapping', async () => {
    http.respondWith({ ...task, mapping: { active: false } });

    const result = await setTaskMappingActive('merge_description', false);

    expect(http.calls[0]).toEqual({
      method: 'patch',
      url: '/admin/llm/task-mappings/merge_description/active',
      body: { active: false },
    });
    expect(result.mapping?.active).toBe(false);
  });

  it('creates or replaces a mapping with the full payload', async () => {
    http.respondWith(task);

    await upsertTaskMapping('merge_description', {
      model_id: 5,
      credential_id: null,
      active: true,
    });

    expect(http.calls[0]).toEqual({
      method: 'put',
      url: '/admin/llm/task-mappings/merge_description',
      body: { model_id: 5, credential_id: null, active: true },
    });
  });
});

/**
 * Tests: useLLMTaskMappings – loads tasks and keeps the list in sync after
 * upsert/toggle writes.
 *
 * The HTTP edge is faked; the hook's own state is the observable contract.
 * Error paths return null and expose a task-scoped message.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLLMTaskMappings } from '@src/features/llm/hooks/useLLMTaskMappings';
import type { TaskWithMapping } from '@src/features/llm/services/taskMappingService';

const http = vi.hoisted(() => {
  let tasks: unknown[] = []
  let writeResult: unknown = undefined
  let writeFailure: Error | null = null

  return {
    api: {
      get: (): Promise<{ data: unknown }> => Promise.resolve({ data: tasks }),
      put: (): Promise<{ data: unknown }> => {
        if (writeFailure) return Promise.reject(writeFailure)
        return Promise.resolve({ data: writeResult })
      },
      patch: (): Promise<{ data: unknown }> => {
        if (writeFailure) return Promise.reject(writeFailure)
        return Promise.resolve({ data: writeResult })
      },
    },
    reset(): void {
      tasks = []
      writeResult = undefined
      writeFailure = null
    },
    respondTasksWith(next: unknown[]): void {
      tasks = next
    },
    respondWriteWith(next: unknown): void {
      writeResult = next
    },
    failWriteWith(error: Error): void {
      writeFailure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function makeTask(key: string, active = true): TaskWithMapping {
  return {
    key,
    display_name: key,
    description: '',
    allowed_triggers: ['manual'],
    placeholders: [],
    mapping: { id: 1, model_id: 5, active } as TaskWithMapping['mapping'],
    active_prompt_version: 1,
  };
}

describe('useLLMTaskMappings', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads tasks and ends the loading state', async () => {
    http.respondTasksWith([makeTask('merge_description'), makeTask('classify_skills')]);

    const { result } = renderHook(() => useLLMTaskMappings());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks.map((t) => t.key)).toEqual(['merge_description', 'classify_skills']);
    expect(result.current.error).toBeNull();
  });

  it('replaces only the updated task after an upsert', async () => {
    http.respondTasksWith([makeTask('merge_description'), makeTask('classify_skills')]);
    const { result } = renderHook(() => useLLMTaskMappings());
    await waitFor(() => expect(result.current.tasks).toHaveLength(2));

    const updated = makeTask('merge_description', false);
    http.respondWriteWith(updated);

    await act(async () => {
      await result.current.handleUpsertMapping('merge_description', {
        model_id: 10,
        credential_id: null,
        active: false,
      });
    });

    expect(result.current.tasks[0]).toEqual(updated);
    expect(result.current.tasks[1].key).toBe('classify_skills');
  });

  it('returns the toggled task and updates the list', async () => {
    http.respondTasksWith([makeTask('merge_description', true)]);
    const { result } = renderHook(() => useLLMTaskMappings());
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    const toggled = makeTask('merge_description', false);
    http.respondWriteWith(toggled);

    let returned: TaskWithMapping | null = null;
    await act(async () => {
      returned = await result.current.handleToggleActive('merge_description', false);
    });

    expect(returned).toEqual(toggled);
    expect(result.current.tasks[0].mapping?.active).toBe(false);
  });

  it('surfaces a save error and returns null when upsert fails', async () => {
    http.respondTasksWith([makeTask('merge_description')]);
    const { result } = renderHook(() => useLLMTaskMappings());
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    http.failWriteWith(new Error('conflict'));

    let returned: TaskWithMapping | null = null;
    await act(async () => {
      returned = await result.current.handleUpsertMapping('merge_description', {
        model_id: 10,
        credential_id: null,
        active: true,
      });
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Fehler beim Speichern des Mappings für "merge_description".');
  });

  it('surfaces a toggle error and returns null when the patch fails', async () => {
    http.respondTasksWith([makeTask('merge_description')]);
    const { result } = renderHook(() => useLLMTaskMappings());
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    http.failWriteWith(new Error('conflict'));

    let returned: TaskWithMapping | null = null;
    await act(async () => {
      returned = await result.current.handleToggleActive('merge_description', false);
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Fehler beim Umschalten des Active-Status für "merge_description".');
  });
});

/**
 * Tests: useLLMTaskDetail – aggregates mapping + observer data for one task.
 *
 * Covers found/not-found, load failures, the two auto-save paths and the
 * observer error path. Polling is left on real timers (15s never elapses).
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLLMTaskDetail } from '@src/features/llm/hooks/useLLMTaskDetail';
import type { TaskWithMapping } from '@src/features/llm/services/taskMappingService';

const http = vi.hoisted(() => {
  const requests: string[] = []
  let tasks: unknown[] = []
  let triggerResult: unknown = null
  let examplesResult: unknown = null
  let writeResult: unknown = null
  let tasksFailure: Error | null = null
  let observerFailure: Error | null = null
  let writeFailure: Error | null = null

  return {
    requests,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        requests.push(`GET ${url}`)
        if (url.endsWith('/triggers')) {
          return observerFailure ? Promise.reject(observerFailure) : Promise.resolve({ data: triggerResult })
        }
        if (url.endsWith('/examples')) {
          return observerFailure ? Promise.reject(observerFailure) : Promise.resolve({ data: examplesResult })
        }
        return tasksFailure ? Promise.reject(tasksFailure) : Promise.resolve({ data: tasks })
      },
      put: (url: string): Promise<{ data: unknown }> => {
        requests.push(`PUT ${url}`)
        return writeFailure ? Promise.reject(writeFailure) : Promise.resolve({ data: writeResult })
      },
      patch: (url: string): Promise<{ data: unknown }> => {
        requests.push(`PATCH ${url}`)
        return writeFailure ? Promise.reject(writeFailure) : Promise.resolve({ data: writeResult })
      },
    },
    reset(): void {
      requests.length = 0
      tasks = []
      triggerResult = null
      examplesResult = null
      writeResult = null
      tasksFailure = null
      observerFailure = null
      writeFailure = null
    },
    respondTasksWith(next: unknown[]): void {
      tasks = next
    },
    respondObserverWith(triggers: unknown, examples: unknown): void {
      triggerResult = triggers
      examplesResult = examples
    },
    respondWriteWith(next: unknown): void {
      writeResult = next
    },
    failTasksWith(error: Error): void {
      tasksFailure = error
    },
    failObserverWith(error: Error): void {
      observerFailure = error
    },
    failWriteWith(error: Error): void {
      writeFailure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function makeTask(overrides: Partial<TaskWithMapping> = {}): TaskWithMapping {
  return {
    key: 'merge_description',
    display_name: 'Merge Description',
    description: '',
    allowed_triggers: ['manual'],
    placeholders: [],
    mapping: { id: 1, model_id: 5, active: true } as TaskWithMapping['mapping'],
    active_prompt_version: 2,
    ...overrides,
  };
}

describe('useLLMTaskDetail', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads the task plus trigger stats and examples', async () => {
    http.respondTasksWith([makeTask(), makeTask({ key: 'other' })]);
    http.respondObserverWith(
      { task_key: 'merge_description', allowed: ['manual'], observed: [], unused: [] },
      { task_key: 'merge_description', input_example: null, output_schema: null, output_example: null },
    );

    const { result } = renderHook(() => useLLMTaskDetail('merge_description'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.task?.key).toBe('merge_description');
    expect(result.current.triggerStats?.allowed).toEqual(['manual']);
    expect(result.current.taskExamples?.task_key).toBe('merge_description');
    expect(result.current.observerLoading).toBe(false);
  });

  it('reports a not-found task by key', async () => {
    http.respondTasksWith([makeTask()]);

    const { result } = renderHook(() => useLLMTaskDetail('missing_task'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.task).toBeNull();
    expect(result.current.error).toBe('Task "missing_task" nicht gefunden.');
  });

  it('reports a task load failure', async () => {
    http.failTasksWith(new Error('offline'));

    const { result } = renderHook(() => useLLMTaskDetail('merge_description'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden des Tasks.');
  });

  it('does nothing when no task key is provided', () => {
    const { result } = renderHook(() => useLLMTaskDetail(undefined));

    expect(result.current.loading).toBe(true);
    expect(http.requests).toEqual([]);
  });

  it('replaces the mapping after a successful save', async () => {
    http.respondTasksWith([makeTask()]);
    http.respondObserverWith(null, null);
    const { result } = renderHook(() => useLLMTaskDetail('merge_description'));
    await waitFor(() => expect(result.current.task).not.toBeNull());

    const nextTask = makeTask({
      mapping: { id: 1, model_id: 9, active: true } as TaskWithMapping['mapping'],
    });
    http.respondWriteWith(nextTask);

    await act(async () => {
      await result.current.saveMapping({ model_id: 9, credential_id: null, active: true });
    });

    expect(http.requests).toContain('PUT /admin/llm/task-mappings/merge_description');
    expect(result.current.task?.mapping?.model_id).toBe(9);
  });

  it('replaces the mapping after a successful active toggle', async () => {
    http.respondTasksWith([makeTask()]);
    http.respondObserverWith(null, null);
    const { result } = renderHook(() => useLLMTaskDetail('merge_description'));
    await waitFor(() => expect(result.current.task).not.toBeNull());

    http.respondWriteWith(
      makeTask({ mapping: { id: 1, model_id: 5, active: false } as TaskWithMapping['mapping'] }),
    );

    await act(async () => {
      await result.current.toggleActive(false);
    });

    expect(http.requests).toContain('PATCH /admin/llm/task-mappings/merge_description/active');
    expect(result.current.task?.mapping?.active).toBe(false);
  });

  it('reports a save failure without replacing the mapping', async () => {
    http.respondTasksWith([makeTask()]);
    http.respondObserverWith(null, null);
    const { result } = renderHook(() => useLLMTaskDetail('merge_description'));
    await waitFor(() => expect(result.current.task).not.toBeNull());

    http.failWriteWith(new Error('conflict'));
    await act(async () => {
      await result.current.saveMapping({ model_id: 9, credential_id: null, active: true });
    });

    expect(result.current.error).toBe('Fehler beim Speichern der Zuordnung.');
    expect(result.current.task?.mapping?.model_id).toBe(5);
  });

  it('reports an observer load failure', async () => {
    http.respondTasksWith([makeTask()]);
    http.failObserverWith(new Error('observer down'));

    const { result } = renderHook(() => useLLMTaskDetail('merge_description'));

    await waitFor(() => expect(result.current.observerLoading).toBe(false));

    expect(result.current.observerError).toBe('Fehler beim Laden der Live-Daten.');
  });
});

/**
 * Tests: useLLMTasks – client-side task overview table.
 *
 * Covers row formatting from the registry/mapping data (provider label,
 * missing model/prompt, active flag) and the load error path.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLLMTasks } from '@src/features/llm/hooks/useLLMTasks';
import type { TaskWithMapping } from '@src/features/llm/services/taskMappingService';

const http = vi.hoisted(() => {
  let tasks: unknown[] = []
  let failure: Error | null = null

  return {
    api: {
      get: (): Promise<{ data: unknown }> => {
        return failure ? Promise.reject(failure) : Promise.resolve({ data: tasks })
      },
    },
    reset(): void {
      tasks = []
      failure = null
    },
    respondWith(next: unknown[]): void {
      tasks = next
    },
    failWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));

function makeTask(overrides: Partial<TaskWithMapping> = {}): TaskWithMapping {
  return {
    key: 'merge_description',
    display_name: 'Merge Description',
    description: '',
    allowed_triggers: ['manual', 'model_change'],
    placeholders: [],
    mapping: {
      id: 1,
      model_id: 5,
      model_display_name: 'GPT-4',
      credential_id: 3,
      credential_label: 'gjo-se.com',
      credential_portal: 'direct',
      credential_provider: 'deepseek',
      active: true,
      status: 'active',
      status_color_token: 'green',
    } as TaskWithMapping['mapping'],
    active_prompt_version: 3,
    ...overrides,
  };
}

describe('useLLMTasks', () => {
  beforeEach(() => {
    http.reset();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('formats registry, mapping and prompt data into table rows', async () => {
    http.respondWith([makeTask()]);

    const { result } = renderHook(() => useLLMTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      id: 'merge_description',
      displayName: 'Merge Description',
      description: 'Triggers: manual, model_change',
      provider: 'direct · deepseek · gjo-se.com',
      model: 'GPT-4',
      prompt: 'v3',
      active: true,
      status: 'active',
    });
  });

  it('uses an em dash for a mapping without credential and model', async () => {
    http.respondWith([
      makeTask({
        mapping: null,
        active_prompt_version: null,
      }),
    ]);

    const { result } = renderHook(() => useLLMTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      provider: '\u2013',
      model: '\u2013',
      prompt: 'Kein Prompt',
      active: false,
      status: null,
    });
  });

  it('skips empty credential parts when building the provider label', async () => {
    http.respondWith([
      makeTask({
        mapping: {
          id: 1,
          model_id: 5,
          model_display_name: 'GPT-4',
          credential_id: 3,
          credential_label: null,
          credential_portal: null,
          credential_provider: 'openrouter',
          active: true,
          status: null,
          status_color_token: null,
        } as TaskWithMapping['mapping'],
      }),
    ]);

    const { result } = renderHook(() => useLLMTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0].provider).toBe('openrouter');
  });

  it('reports a load error when the tasks request fails', async () => {
    http.failWith(new Error('offline'));

    const { result } = renderHook(() => useLLMTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Tasks.');
    expect(result.current.table.data).toEqual([]);
  });
});

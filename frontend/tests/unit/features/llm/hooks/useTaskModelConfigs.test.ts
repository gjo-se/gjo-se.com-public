/**
 * Tests: useTaskModelConfigs – unified model-config table hook.
 *
 * Covers row formatting (hyperparameters with model-default fallback), the
 * ghost-row create payload, the role cycle (none → production → none,
 * production-taken → fallback; both taken → no-op), inline hyperparameter
 * saves and the two validation error paths.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTaskModelConfigs } from '@src/features/llm/hooks/useTaskModelConfigs';
import type { ModelConfigRow } from '@src/features/llm/services/modelConfigService';
import type { LLMModelEntry } from '@src/features/llm/services/modelCatalogService';

const http = vi.hoisted(() => {
  interface RecordedWrite {
    method: 'post' | 'patch' | 'delete'
    url: string
    body?: unknown
  }

  const writes: RecordedWrite[] = []
  let configs: ModelConfigRow[] = []
  let models: LLMModelEntry[] = []
  let breakers: { provider_key: string; state: string }[] = []
  let loadFailure: Error | null = null
  let writeFailure: Error | null = null

  const credentials = [
    {
      id: 3,
      source_type: 'llm',
      active: true,
      portal: 'direct',
      provider: 'deepseek',
      label: 'gjo-se.com',
      service: 'deepseek',
    },
    { id: 4, source_type: 'llm', active: false, portal: 'x', provider: 'x', label: 'x', service: 'x' },
    { id: 5, source_type: 'llm', active: true, portal: null, provider: null, label: null, service: 'local' },
  ]

  return {
    writes,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        if (url === '/admin/llm/models') return Promise.resolve({ data: models })
        if (url === '/admin/credentials') return Promise.resolve({ data: credentials })
        if (url === '/admin/llm/circuit-breaker') return Promise.resolve({ data: breakers })
        if (url === '/admin/llm/models/count') return Promise.resolve({ data: { total: models.length } })
        if (loadFailure) return Promise.reject(loadFailure)
        return Promise.resolve({ data: configs })
      },
      post: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        writes.push({ method: 'post', url, body })
        return Promise.resolve({ data: {} })
      },
      patch: (url: string, body?: unknown): Promise<{ data: unknown }> => {
        writes.push({ method: 'patch', url, body })
        if (writeFailure) return Promise.reject(writeFailure)
        return Promise.resolve({ data: {} })
      },
      delete: (url: string): Promise<{ data: unknown }> => {
        writes.push({ method: 'delete', url })
        return Promise.resolve({ data: {} })
      },
    },
    reset(): void {
      writes.length = 0
      configs = []
      models = []
      breakers = []
      loadFailure = null
      writeFailure = null
    },
    respondConfigsWith(next: ModelConfigRow[]): void {
      configs = next
    },
    respondModelsWith(next: LLMModelEntry[]): void {
      models = next
    },
    respondBreakersWith(next: { provider_key: string; state: string }[]): void {
      breakers = next
    },
    failLoadWith(error: Error): void {
      loadFailure = error
    },
    failWritesWith(error: Error): void {
      writeFailure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function config(overrides: Partial<ModelConfigRow> = {}): ModelConfigRow {
  return {
    id: 1,
    task: 'merge_description',
    model_id: 5,
    model_display_name: 'GPT-4',
    credential_id: 3,
    credential_label: 'gjo-se.com',
    provider_name: 'deepseek',
    hyperparameters: { temperature: 0.2, max_tokens: 500, reasoning: 'low' },
    is_production: false,
    is_fallback: false,
    is_eval: false,
    status: 'active',
    status_color_token: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function model(defaults: Record<string, unknown> | null = null): LLMModelEntry {
  return {
    id: 5,
    openrouter_id: 'openai/gpt-4',
    native_model_id: 'gpt-4',
    provider_id: 1,
    provider_name: 'openai',
    provider_display_name: 'OpenAI',
    display_name: 'GPT-4',
    description: null,
    context_window: 8192,
    active: true,
    status: null,
    status_color_token: null,
    current_price_input: null,
    current_price_output: null,
    first_seen_at: '2025-01-01T00:00:00Z',
    last_seen_at: '2025-06-01T00:00:00Z',
    supported_parameters: null,
    architecture: null,
    reasoning: null,
    default_parameters: defaults,
    top_provider: null,
    max_completion_tokens: null,
    knowledge_cutoff: null,
    hugging_face_id: null,
    created: null,
    canonical_slug: null,
    is_locally_installed: false,
    task_type: 'general',
    task_tags: null,
    provider_installed: false,
  };
}

describe('useTaskModelConfigs', () => {
  beforeEach(() => {
    http.reset();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('formats configs with provider label and hyperparameters', async () => {
    http.respondConfigsWith([config()]);
    http.respondModelsWith([model()]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      id: 1,
      providerDisplay: 'direct · deepseek · gjo-se.com',
      temperature: '0.2',
      maxTokens: '500',
      reasoningSort: 'low',
      advancedJson: '',
      isProduction: false,
      isFallback: false,
    });
  });

  it('falls back to the model defaults for a missing hyperparameter', async () => {
    http.respondConfigsWith([config({ hyperparameters: null })]);
    http.respondModelsWith([model({ temperature: 0.7, max_tokens: 1000 })]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0].temperature).toBe('0.7');
    expect(result.current.table.data[0].maxTokens).toBe('1000');
    expect(result.current.table.data[0].reasoningSort).toBe('off');
  });

  it('builds the create payload from the ghost row values', async () => {
    http.respondConfigsWith([]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({
        modelDisplay: '5',
        providerDisplay: '3',
        temperature: '0.4',
        maxTokens: '250',
        topP: '0.9',
        reasoning: 'off',
        advancedJson: '{"seed":7}',
      });
    });

    const create = http.writes.find((w) => w.method === 'post');
    expect(create?.url).toBe('/admin/llm/model-config/merge_description');
    expect(create?.body).toEqual({
      model_id: 5,
      credential_id: 3,
      hyperparameters: { temperature: 0.4, max_tokens: 250, top_p: 0.9, seed: 7 },
    });
  });

  it('rejects a ghost create without a model', async () => {
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));

    await expect(result.current.onGhostCreate({ modelDisplay: '' })).rejects.toThrow(
      'Modell ist erforderlich.',
    );
  });

  it('rejects a ghost create without a task key', async () => {
    const { result } = renderHook(() => useTaskModelConfigs(undefined));

    await expect(result.current.onGhostCreate({ modelDisplay: '5' })).rejects.toThrow(
      'Kein Task ausgewählt.',
    );
  });

  it('cycles a row from none to production', async () => {
    http.respondConfigsWith([config({ id: 1 })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const setRole = result.current.rowActions.find((action) => action.key === 'setRole');

    await act(async () => {
      await setRole?.onAction(result.current.table.data[0]);
    });

    expect(http.writes).toContainEqual({
      method: 'patch',
      url: '/admin/llm/model-config/1',
      body: { is_production: true, is_fallback: false },
    });
  });

  it('unsets production when the row is already production', async () => {
    http.respondConfigsWith([config({ id: 1, is_production: true })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const setRole = result.current.rowActions.find((action) => action.key === 'setRole');

    await act(async () => {
      await setRole?.onAction(result.current.table.data[0]);
    });

    expect(http.writes).toContainEqual({
      method: 'patch',
      url: '/admin/llm/model-config/1',
      body: { is_production: false },
    });
  });

  it('falls back to the fallback role when production is taken', async () => {
    http.respondConfigsWith([
      config({ id: 1, is_production: true }),
      config({ id: 2 }),
    ]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(2));
    const setRole = result.current.rowActions.find((action) => action.key === 'setRole');

    await act(async () => {
      await setRole?.onAction(result.current.table.data[1]);
    });

    expect(http.writes).toContainEqual({
      method: 'patch',
      url: '/admin/llm/model-config/2',
      body: { is_fallback: true, is_production: false },
    });
  });

  it('does nothing when production and fallback are both taken', async () => {
    http.respondConfigsWith([
      config({ id: 1, is_production: true }),
      config({ id: 2, is_fallback: true }),
      config({ id: 3 }),
    ]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(3));
    const setRole = result.current.rowActions.find((action) => action.key === 'setRole');

    await act(async () => {
      await setRole?.onAction(result.current.table.data[2]);
    });

    expect(http.writes.filter((w) => w.method === 'patch')).toEqual([]);
  });

  it('persists an inline temperature edit as a merged hyperparameters patch', async () => {
    http.respondConfigsWith([config()]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.temperature.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '0.6',
      );
    });

    await waitFor(() =>
      expect(http.writes).toContainEqual({
        method: 'patch',
        url: '/admin/llm/model-config/1',
        body: { hyperparameters: { temperature: 0.6, max_tokens: 500, reasoning: 'low' } },
      }),
    );
  });

  it('reports a load error when the config request fails', async () => {
    http.failLoadWith(new Error('offline'));

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Daten.');
  });

  it('uses the service name when a credential has no portal, provider or label', async () => {
    http.respondConfigsWith([config({ credential_id: 5 })]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0].providerDisplay).toBe('local');
  });

  it('renders a dash for missing or unknown credentials', async () => {
    http.respondConfigsWith([
      config({ id: 1, credential_id: null }),
      config({ id: 2, credential_id: 99 }),
    ]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(2));

    expect(result.current.table.data.map((row) => row.providerDisplay)).toEqual(['–', '–']);
  });

  it('renders the circuit breaker chip for a matching provider', async () => {
    http.respondConfigsWith([config({ credential_id: 3 }), config({ id: 2, credential_id: 99 })]);
    http.respondBreakersWith([{ provider_key: 'direct', state: 'open' }]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(2));

    expect(result.current.table.data[0].breakerSort).toBe('open');
    expect(result.current.table.data[0].breakerState).not.toBeNull();
    expect(result.current.table.data[1].breakerState).toBeNull();
  });

  it('keeps only exotic hyperparameters in the advanced JSON cell', async () => {
    http.respondConfigsWith([
      config({ id: 1, hyperparameters: { temperature: 0.2, seed: 7 } }),
      config({ id: 2, hyperparameters: { temperature: 0.3 } }),
    ]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(2));

    expect(result.current.table.data[0].advancedJson).toBe('{"seed":7}');
    expect(result.current.table.data[1].advancedJson).toBe('');
  });

  it('creates a config without a credential and ignores invalid advanced JSON', async () => {
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({
        modelDisplay: '5',
        temperature: '0.4',
        advancedJson: '{invalid',
      });
    });

    expect(http.writes.find((write) => write.method === 'post')?.body).toEqual({
      model_id: 5,
      credential_id: undefined,
      hyperparameters: { temperature: 0.4 },
    });
  });

  it('creates a config with null hyperparameters when nothing is filled in', async () => {
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({ modelDisplay: '5' });
    });

    expect(http.writes.find((write) => write.method === 'post')?.body).toMatchObject({
      hyperparameters: null,
    });
  });

  it('reports a hyperparameter save error and reloads the configs', async () => {
    http.respondConfigsWith([config()]);
    http.failWritesWith(new Error('offline'));
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.temperature.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '0.6',
      );
    });

    await waitFor(() => expect(
      http.writes.filter((write) => write.method === 'patch'),
    ).toHaveLength(1));
  });

  it('ignores an advanced JSON edit for a row that is not loaded', async () => {
    http.respondConfigsWith([config()]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.advancedJson.onInlineEdit?.({}, '{}');
    });

    expect(http.writes).toEqual([]);
  });

  it('strips exotic params and keeps inline-managed standard params when the JSON is cleared', async () => {
    http.respondConfigsWith([config({ hyperparameters: { temperature: 0.2, seed: 7 } })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.advancedJson.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '{}',
      );
    });

    expect(http.writes.find((write) => write.method === 'patch')?.body).toEqual({
      hyperparameters: { temperature: 0.2 },
    });
  });

  it('sends null when clearing the JSON leaves no standard params', async () => {
    http.respondConfigsWith([config({ hyperparameters: { seed: 7 } })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.advancedJson.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '',
      );
    });

    expect(http.writes.find((write) => write.method === 'patch')?.body).toEqual({
      hyperparameters: null,
    });
  });

  it('ignores invalid advanced JSON in an edit', async () => {
    http.respondConfigsWith([config()]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.advancedJson.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '{invalid',
      );
    });

    expect(http.writes).toEqual([]);
  });

  it('merges advanced JSON and preserves inline-managed parameters', async () => {
    http.respondConfigsWith([config({ hyperparameters: { temperature: 0.2, seed: 7 } })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    await act(async () => {
      result.current.columns.advancedJson.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '{"seed":9}',
      );
    });

    expect(http.writes.find((write) => write.method === 'patch')?.body).toEqual({
      hyperparameters: { seed: 9, temperature: 0.2 },
    });
  });

  it('deletes a config and reloads', async () => {
    http.respondConfigsWith([config({ id: 1 })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const remove = result.current.rowActions.find((action) => action.key === 'delete');

    await act(async () => { await remove?.onAction(result.current.table.data[0]); });

    expect(http.writes).toContainEqual({ method: 'delete', url: '/admin/llm/model-config/1' });
  });

  it('exposes the role icons and disables rows that are production or inactive', async () => {
    http.respondConfigsWith([
      config({ id: 1, is_production: true }),
      config({ id: 2, is_fallback: true }),
      config({ id: 3 }),
      config({ id: 4, status: 'inactive' }),
    ]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(4));
    const setRole = result.current.rowActions.find((action) => action.key === 'setRole');
    const remove = result.current.rowActions.find((action) => action.key === 'delete');
    const rows = result.current.table.data;
    const roleIcon = (row: (typeof rows)[number]) =>
      (setRole?.icon as unknown as (candidate: typeof row) => string)(row);

    expect(roleIcon(rows[0])).toBe('star');
    expect(roleIcon(rows[1])).toBe('shield-check');
    expect(roleIcon(rows[2])).toBe('minus');
    expect(setRole?.disabled?.(rows[3])).toBe(true);
    expect(setRole?.filled?.(rows[0])).toBe(true);
    expect(setRole?.filled?.(rows[2])).toBe(false);
    expect(remove?.disabled?.(rows[0])).toBe(true);
    expect(remove?.disabled?.(rows[2])).toBe(false);
  });

  it('unsets the fallback role when a fallback row is cycled', async () => {
    http.respondConfigsWith([config({ id: 1, is_fallback: true })]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const setRole = result.current.rowActions.find((action) => action.key === 'setRole');

    await act(async () => { await setRole?.onAction(result.current.table.data[0]); });

    expect(http.writes).toContainEqual({
      method: 'patch',
      url: '/admin/llm/model-config/1',
      body: { is_fallback: false },
    });
  });

  it('renders a dash for a config without a model display name', async () => {
    http.respondConfigsWith([config({ model_display_name: null })]);

    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0].modelSort).toBe('–');
  });

  it('passes a reasoning override through the ghost create', async () => {
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({ modelDisplay: '5', reasoning: 'high' });
    });

    expect(http.writes.find((write) => write.method === 'post')?.body).toMatchObject({
      hyperparameters: { reasoning: 'high' },
    });
  });

  it('edits the advanced JSON of a config with null hyperparameters among several rows', async () => {
    http.respondConfigsWith([
      config({ id: 1, hyperparameters: null }),
      config({ id: 2, hyperparameters: { temperature: 0.3 } }),
    ]);
    const { result } = renderHook(() => useTaskModelConfigs('merge_description'));
    await waitFor(() => expect(result.current.table.data).toHaveLength(2));

    await act(async () => {
      result.current.columns.advancedJson.onInlineEdit?.(
        result.current.table.data[0] as unknown as Record<string, unknown>,
        '{"seed":1}',
      );
    });

    expect(http.writes.find((write) => write.method === 'patch')?.body).toEqual({
      hyperparameters: { seed: 1 },
    });
  });
});

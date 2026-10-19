/**
 * Tests: useLLMModelsTable – server-side model table hook.
 *
 * Verifies the initial load (list + count), row formatting at its boundaries
 * (missing price/modalities), the reload triggered by an inline filter and the
 * load error path.
 */
import { createElement } from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TableColumnProps } from '@src/components/table';
import { useLLMModelsTable } from '@src/features/llm/hooks/useLLMModelsTable';
import type { LLMModelEntry } from '@src/features/llm/services/modelCatalogService';

const http = vi.hoisted(() => {
  interface RecordedRequest {
    url: string
    params: Record<string, string>
  }

  const requests: RecordedRequest[] = []
  let models: LLMModelEntry[] = []
  let total = 0
  let failure: Error | null = null

  return {
    requests,
    api: {
      get: (url: string, config?: { params?: Record<string, string> }): Promise<{ data: unknown }> => {
        requests.push({ url, params: config?.params ?? {} })
        if (failure) return Promise.reject(failure)
        return Promise.resolve({ data: url.endsWith('/count') ? { total } : models })
      },
    },
    reset(): void {
      requests.length = 0
      models = []
      total = 0
      failure = null
    },
    respondWith(next: LLMModelEntry[], nextTotal: number): void {
      models = next
      total = nextTotal
    },
    failWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));

function model(overrides: Partial<LLMModelEntry> = {}): LLMModelEntry {
  return {
    id: 1,
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
    current_price_input: '30',
    current_price_output: '60',
    first_seen_at: '2025-01-01T00:00:00Z',
    last_seen_at: '2025-06-01T00:00:00Z',
    supported_parameters: ['structured_outputs'],
    architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
    reasoning: { effort: 'low' },
    default_parameters: null,
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
    ...overrides,
  };
}

describe('useLLMModelsTable', () => {
  beforeEach(() => {
    http.reset();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('loads the models and the total count on mount', async () => {
    http.respondWith([model()], 42);

    const { result } = renderHook(() => useLLMModelsTable());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toHaveLength(1);
    expect(result.current.table.total).toBe(42);
    expect(http.requests.some((r) => r.url === '/admin/llm/models')).toBe(true);
    expect(http.requests.some((r) => r.url === '/admin/llm/models/count')).toBe(true);
  });

  it('formats modalities, structured output, reasoning and price', async () => {
    http.respondWith([model()], 1);

    const { result } = renderHook(() => useLLMModelsTable());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      displayName: 'GPT-4',
      inText: '+',
      inImage: '+',
      inAudio: '\u2013',
      outText: '+',
      outImage: '\u2013',
      supportsStructuredOutput: '+',
      reasoning: '+',
      priceInput: '$30.00',
      active: true,
    });
  });

  it('renders an em dash for a missing price and no reasoning', async () => {
    http.respondWith([
      model({ current_price_input: null, reasoning: null, supported_parameters: null, architecture: null }),
    ], 1);

    const { result } = renderHook(() => useLLMModelsTable());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      priceInput: '\u2013',
      reasoning: '\u2013',
      supportsStructuredOutput: '\u2013',
      inText: '\u2013',
    });
  });

  it('reloads with the structured-output filter when selected', async () => {
    http.respondWith([model()], 1);
    const { result } = renderHook(() => useLLMModelsTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const filter = result.current.columns.supportsStructuredOutput.filter as NonNullable<TableColumnProps['filter']>;
    const node = typeof filter === 'function' ? filter({}) : filter;
    render(createElement('div', null, node));
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('option', { name: 'Ja' }));

    await waitFor(() =>
      expect(
        http.requests.some(
          (r) => r.url === '/admin/llm/models' && r.params.supports_structured_output === 'true',
        ),
      ).toBe(true),
    );
  });

  it('reports a load error when the list request fails', async () => {
    http.failWith(new Error('offline'));

    const { result } = renderHook(() => useLLMModelsTable());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Daten.');
    expect(result.current.table.data).toEqual([]);
  });
});

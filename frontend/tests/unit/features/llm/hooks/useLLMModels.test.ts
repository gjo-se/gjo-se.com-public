/**
 * Tests: useLLMModels – beobachtbares Verhalten am Public Interface.
 *
 * Der interne Service (modelCatalogService) läuft echt; gefakt wird nur der
 * I/O-Rand (`@src/lib/api/axios`). Kein `vi.mock` eines internen Moduls (P5).
 */
import type { LLMModelEntry } from '@src/features/llm/services/modelCatalogService'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLLMModels } from '@src/features/llm/hooks/useLLMModels'

const mockModel: LLMModelEntry = {
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
  current_price_input: '30.00',
  current_price_output: '60.00',
  first_seen_at: '2025-01-01T00:00:00Z',
  last_seen_at: '2025-06-01T00:00:00Z',
  supported_parameters: null,
  architecture: null,
  reasoning: null,
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
}

// ── Boundary fake (HTTP-Rand `@src/lib/api/axios`) ────────────────────────
// Ein Fake mit Aufzeichnung (kein `vi.fn`-Mock): der interne Service läuft
// echt, gefakt ist nur der HTTP-Rand. Geprüft werden die aufgezeichneten
// Werte bzw. der beobachtbare Hook-Zustand – nicht eine Mock-Interaktion.
const http = vi.hoisted(() => {
  interface RecordedCall {
    method: 'get' | 'patch'
    url: string
    payload?: unknown
  }

  const calls: RecordedCall[] = []
  let list: unknown[] = []
  let patched: unknown = undefined
  let failure: Error | null = null

  return {
    calls,
    api: {
      get: (url: string, payload?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'get', url, payload })
        return Promise.resolve({ data: list })
      },
      patch: (url: string, payload?: unknown): Promise<{ data: unknown }> => {
        calls.push({ method: 'patch', url, payload })
        return failure ? Promise.reject(failure) : Promise.resolve({ data: patched })
      },
    },
    reset(): void {
      calls.length = 0
      list = []
      patched = undefined
      failure = null
    },
    respondListWith(next: unknown[]): void {
      list = next
    },
    respondPatchWith(next: unknown): void {
      patched = next
    },
    failPatchWith(error: Error): void {
      failure = error
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }))

describe('useLLMModels', () => {
  beforeEach(() => {
    http.reset()
  })

  it('toggles the model active state in the loaded list', async () => {
    http.respondListWith([mockModel])
    http.respondPatchWith({ ...mockModel, active: false })

    const { result } = renderHook(() => useLLMModels())

    await waitFor(() => expect(result.current.models).toEqual([mockModel]))

    await act(async () => {
      await result.current.handleToggleActive(mockModel)
    })

    expect(result.current.models[0].active).toBe(false)
    expect(http.calls).toContainEqual({
      method: 'patch',
      url: '/admin/llm/models/1',
      payload: { active: false },
    })
  })

  it('sets an error message when the toggle request fails', async () => {
    http.respondListWith([mockModel])
    http.failPatchWith(new Error('Patch error'))

    const { result } = renderHook(() => useLLMModels())

    await waitFor(() => expect(result.current.models).toEqual([mockModel]))

    await act(async () => {
      await result.current.handleToggleActive(mockModel)
    })

    expect(result.current.error).toBe('Fehler beim Aktualisieren des Modells.')
  })

  it('clears the sync result when requested', async () => {
    const { result } = renderHook(() => useLLMModels())

    act(() => {
      result.current.clearSyncResult()
    })

    expect(result.current.syncResult).toBeNull()
  })
})

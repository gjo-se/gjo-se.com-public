/**
 * Tests: useProofSubTable
 *
 * Covers the sorted load, create payload (both locales + default priority),
 * inline edits, locale-preserving statement/question saves, reorder and the
 * silent delete.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProofSubTable } from '@src/features/portfolio/hooks/useProofSubTable';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

import type { ReactNode } from 'react';

const BASE = '/api/v1/admin/portfolio/ai/proofs';

const proof = {
  id: 2,
  sort: 2,
  image_src: null,
  priority: 'medium',
  statements: { de: 'DE', en: 'EN' },
  questions: { de: 'Frage DE', en: 'Question EN' },
};

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useProofSubTable', () => {
  it('loads the proofs sorted by sort', async () => {
    stubFetch(() => jsonResponse([{ ...proof, id: 3, sort: 3 }, proof]));

    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.proofs.map((row) => row.id)).toEqual([2, 3]);
  });

  it('creates a proof with both locales and the default priority', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'POST' ? jsonResponse(proof) : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.handleCreate({ statement: 'Sauber gelöst.', image_src: '  ' }),
      ).resolves.toBeNull();
    });

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      image_src: null,
      statements: { de: 'Sauber gelöst.', en: 'Sauber gelöst.' },
      priority: 'medium',
    });
  });

  it('returns the error message when creating fails', async () => {
    stubFetch((_url, init) => (
      init?.method === 'POST' ? errorResponse(422, 'statement required') : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.handleCreate({ statement: 'x' })).resolves.toBe('422: statement required');
  });

  it('saves image_src and priority inline, ignoring unknown fields', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(proof) : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleInlineEdit(2, 'image_src', '  https://img.test/a.webp ');
      await result.current.handleInlineEdit(2, 'priority', 'high');
    });
    const unknown = await result.current.handleInlineEdit(2, 'statement', 'ignored');

    const puts = fetchSpy.mock.calls.filter(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(puts[0][1]?.body))).toEqual({ image_src: 'https://img.test/a.webp' });
    expect(JSON.parse(String(puts[1][1]?.body))).toEqual({ priority: 'high' });
    expect(puts).toHaveLength(2);
    expect(unknown).toBeNull();
  });

  it('keeps the other locale when saving a statement', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(proof) : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleStatementSave(proof as never, 'Neu DE');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      statements: { de: 'Neu DE', en: 'EN' },
    });
  });

  it('keeps the other locale when saving a question', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(proof) : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'en'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleQuestionSave(proof as never, 'New question');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      questions: { de: 'Frage DE', en: 'New question' },
    });
  });

  it('reorders proofs via ordered ids', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PATCH' ? jsonResponse([proof]) : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.handleReorder([3, 2])).resolves.toBeNull();

    const patch = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(String(patch?.[0])).toContain(`${BASE}/reorder`);
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ ordered_ids: [3, 2] });
  });

  it('swallows delete errors instead of rejecting', async () => {
    stubFetch((_url, init) => (
      init?.method === 'DELETE' ? errorResponse(500, 'boom') : jsonResponse([proof])
    ));
    const { result } = renderHook(() => useProofSubTable('ai', 'de'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.handleDelete(2)).resolves.toBeUndefined();
  });
});

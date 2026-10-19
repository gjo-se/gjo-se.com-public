/**
 * Tests: useFocusAreaTable
 *
 * Covers the translation mapping, client-side search, ghost-create validation
 * and payload, sibling-preserving inline edits and delete.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFocusAreaTable } from '@src/features/application-profile/hooks/useFocusAreaTable';

import { jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/application-profile/focus-areas';

const area = {
  id: 4,
  slug: 'ai',
  url: 'https://example.test/ai',
  sort: 1,
  translations: {
    de: { title: 'KI', summary: 'Kurz DE' },
    en: { title: 'AI', summary: 'Short EN' },
  },
};

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

function noContent(): Response {
  return { ok: true, status: 204, statusText: 'No Content', headers: new Headers() } as unknown as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useFocusAreaTable', () => {
  it('maps both locales into flat row fields', async () => {
    stubFetch(() => jsonResponse([area]));

    const { result } = renderHook(() => useFocusAreaTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toEqual([
      {
        id: 4,
        slug: 'ai',
        url: 'https://example.test/ai',
        sort: 1,
        title_de: 'KI',
        title_en: 'AI',
        summary_de: 'Kurz DE',
        summary_en: 'Short EN',
        translations: area.translations,
      },
    ]);
  });

  it('filters by slug and either title', async () => {
    stubFetch(() => jsonResponse([area, { ...area, id: 5, slug: 'arch', translations: { de: { title: 'Architektur' } } }]));
    const { result } = renderHook(() => useFocusAreaTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(2));

    act(() => result.current.setSearch('archi'));

    expect(result.current.rows.map((row) => row.id)).toEqual([5]);
  });

  it('requires slug and German title for a ghost row', async () => {
    stubFetch(() => jsonResponse([]));
    const { result } = renderHook(() => useFocusAreaTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ slug: '', title_de: 'KI' }))
      .rejects.toThrow('Slug ist ein Pflichtfeld.');
    await expect(result.current.onGhostCreate({ slug: 'ai', title_de: ' ' }))
      .rejects.toThrow('Titel (DE) ist ein Pflichtfeld.');
  });

  it('creates a focus area with both locales', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'POST' ? jsonResponse(area) : jsonResponse([])
    ));
    const { result } = renderHook(() => useFocusAreaTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({
        slug: ' ai ',
        title_de: ' KI ',
        title_en: ' AI ',
        summary_de: ' Kurz ',
      });
    });

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      slug: 'ai',
      url: null,
      translations: {
        de: { title: 'KI', summary: 'Kurz' },
        en: { title: 'AI', summary: null },
      },
    });
  });

  it('updates only the edited translation field and keeps siblings', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(area) : jsonResponse([area])
    ));
    const { result } = renderHook(() => useFocusAreaTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    await act(async () => {
      await result.current.onFieldSave(result.current.rows[0], 'summary_en', 'Neuer Text');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      translations: {
        de: { title: 'KI', summary: 'Kurz DE' },
        en: { title: 'AI', summary: 'Neuer Text' },
      },
    });
  });

  it('deletes a focus area by id', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'DELETE' ? noContent() : jsonResponse([area])
    ));
    const { result } = renderHook(() => useFocusAreaTable());
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    await act(async () => {
      await result.current.handleDelete(result.current.rows[0]);
    });

    expect(fetchSpy.mock.calls.some(([url, init]) => init?.method === 'DELETE' && String(url).endsWith(`${BASE}/4`)))
      .toBe(true);
  });
});

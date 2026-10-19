/**
 * Tests: usePortfolioAdminTable
 *
 * Covers the DE→EN title fallback, query params, the search debounce, ghost
 * creation validation, delete/reorder outcomes and the edit navigation.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

import { usePortfolioAdminTable } from '@src/features/portfolio/hooks/usePortfolioAdminTable';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

import type { ReactNode } from 'react';

const project = {
  id: 1,
  slug: 'ai',
  translations: { de: { title: 'KI', sub_title: 'Metapher' }, en: { title: 'AI', sub_title: null } },
  status: 'active',
  status_color_token: 'green',
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
  navigate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePortfolioAdminTable', () => {
  it('maps projects with a DE title and EN fallback', async () => {
    stubFetch(() => jsonResponse([
      project,
      { ...project, id: 2, slug: 'en-only', translations: { en: { title: 'Only EN', sub_title: 'Sub' } } },
      { ...project, id: 3, slug: 'none', translations: null },
    ]));

    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.portfolios.map((row) => row.title)).toEqual(['KI', 'Only EN', '–']);
    expect(result.current.allIds).toEqual(['ai', 'en-only', 'none']);
  });

  it('loads all projects server-side sorted by sort', async () => {
    const fetchSpy = stubFetch(() => jsonResponse([project]));

    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain('limit=5000');
    expect(url).toContain('sort_by=sort');
    expect(url).toContain('sort_order=asc');
  });

  it('debounces the search into the backend q parameter', async () => {
    const fetchSpy = stubFetch(() => jsonResponse([project]));
    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onSearchChange('ki'));

    await waitFor(
      () => {
        const urls = fetchSpy.mock.calls.map(([url]) => String(url));
        expect(urls.some((url) => url.includes('q=ki'))).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  it('rejects a ghost row without a slug', async () => {
    stubFetch(() => jsonResponse([project]));
    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.onGhostCreate({ slug: '  ' })).resolves.toBe('Slug ist erforderlich.');
  });

  it('creates a portfolio skeleton and refetches', async () => {
    let listCalls = 0;
    const fetchSpy = stubFetch((_url, init) => {
      if (init?.method === 'POST') return jsonResponse(project);
      listCalls += 1;
      return jsonResponse([project]);
    });
    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({ slug: 'neu' });
    });

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      slug: 'neu',
      sort: 0,
      translations: { de: { title: '' } },
    });
    expect(listCalls).toBe(2);
  });

  it('returns the error message when deleting fails', async () => {
    stubFetch((_url, init) => (
      init?.method === 'DELETE' ? errorResponse(409, 'in use') : jsonResponse([project])
    ));
    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.handleDelete('ai')).resolves.toBe('409: in use');
  });

  it('returns null after a successful reorder', async () => {
    stubFetch((_url, init) => (
      init?.method === 'PATCH' ? jsonResponse([project]) : jsonResponse([project])
    ));
    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.handleReorder(['ai'])).resolves.toBeNull();
  });

  it('navigates to the detail page with the loaded ids', async () => {
    stubFetch(() => jsonResponse([project]));
    const { result } = renderHook(() => usePortfolioAdminTable(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.handleEdit(result.current.portfolios[0]));

    expect(navigate).toHaveBeenCalledTimes(1);
    const [path, options] = navigate.mock.calls[0];
    expect(String(path)).toContain('ai');
    expect(options.state.allIds).toEqual(['ai']);
  });
});

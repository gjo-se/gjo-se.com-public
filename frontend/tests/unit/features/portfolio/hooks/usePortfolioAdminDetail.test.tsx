/**
 * Tests: usePortfolioAdminDetail
 *
 * Covers the slug-gated load, the structure save (numeric sort, empty→null),
 * the translation save with trimming and the error message.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePortfolioAdminDetail } from '@src/features/portfolio/hooks/usePortfolioAdminDetail';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

import type { ReactNode } from 'react';

const BASE = '/api/v1/admin/portfolio';

const portfolio = { id: 1, slug: 'ai', translations: { de: { title: 'KI' } } };

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

describe('usePortfolioAdminDetail', () => {
  it('loads the portfolio for the given slug', async () => {
    const fetchSpy = stubFetch(() => jsonResponse(portfolio));

    const { result } = renderHook(() => usePortfolioAdminDetail('ai'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.portfolio).toEqual(portfolio);
    expect(String(fetchSpy.mock.calls[0][0])).toContain(`${BASE}/ai`);
  });

  it('does not load without a slug', () => {
    const fetchSpy = stubFetch(() => jsonResponse(portfolio));

    const { result } = renderHook(() => usePortfolioAdminDetail(undefined), { wrapper });

    expect(result.current.portfolio).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('converts the sort field to a number', async () => {
    const fetchSpy = stubFetch((_url, init) => (
      init?.method === 'PUT' ? jsonResponse(portfolio) : jsonResponse(portfolio)
    ));
    const { result } = renderHook(() => usePortfolioAdminDetail('ai'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleStructureSave('sort', '12');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ sort: 12 });
  });

  it('falls back to zero for an invalid sort value', async () => {
    const fetchSpy = stubFetch(() => jsonResponse(portfolio));
    const { result } = renderHook(() => usePortfolioAdminDetail('ai'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleStructureSave('sort', 'abc');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ sort: 0 });
  });

  it('sends null for an emptied text field', async () => {
    const fetchSpy = stubFetch(() => jsonResponse(portfolio));
    const { result } = renderHook(() => usePortfolioAdminDetail('ai'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleStructureSave('link_url', '');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ link_url: null });
  });

  it('saves a trimmed translation for the given locale', async () => {
    const fetchSpy = stubFetch(() => jsonResponse(portfolio));
    const { result } = renderHook(() => usePortfolioAdminDetail('ai'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleTranslationSave('de', 'title', '  Neu  ');
    });

    const put = fetchSpy.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toContain(`${BASE}/ai/translations/de`);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ title: 'Neu' });
  });

  it('exposes the load error message', async () => {
    stubFetch(() => errorResponse(500, 'boom'));

    const { result } = renderHook(() => usePortfolioAdminDetail('ai'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('500: boom'));

    expect(result.current.portfolio).toBeUndefined();
  });
});

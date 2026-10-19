/**
 * Tests: useSiteContentTable
 *
 * Covers the load, the client-side search, the inline-edit save (PUT + reload)
 * and the load error.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useSiteContentTable } from '@src/features/site-content/hooks/useSiteContentTable';

import { httpBoundary } from '../../helpers/httpBoundary';

const BASE = '/admin/content';

const rows = [
  { key: 'home.title', language: 'de', value: 'Startseite', updated_at: '2026-01-02' },
  { key: 'home.hero', language: 'de', value: 'Hallo', updated_at: '2026-01-01' },
];

beforeEach(() => {
  httpBoundary.reset();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('useSiteContentTable', () => {
  it('loads the rows sorted by key (descending default)', async () => {
    httpBoundary.on('get', BASE, () => rows);

    const { result } = renderHook(() => useSiteContentTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((row) => row.key)).toEqual(['home.title', 'home.hero']);
    expect(result.current.allData).toEqual(rows);
    expect(result.current.columns).toHaveProperty('value');
  });

  it('filters by key or value', async () => {
    httpBoundary.on('get', BASE, () => rows);
    const { result } = renderHook(() => useSiteContentTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.table.handleSearchChange('hallo'));

    expect(result.current.table.data.map((row) => row.key)).toEqual(['home.hero']);
  });

  it('saves an inline value edit and reloads the rows', async () => {
    httpBoundary.on('get', BASE, () => rows);
    httpBoundary.on('put', `${BASE}/home.title/de`, () => ({ ...rows[0], value: 'Neu' }));
    const { result } = renderHook(() => useSiteContentTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const target = result.current.table.data.find((row) => row.key === 'home.title');
      await result.current.columns.value.onInlineEdit?.(target as never, 'Neu');
    });

    expect(httpBoundary.calls.find((call) => call.method === 'put')?.payload).toEqual({ value: 'Neu' });
    expect(httpBoundary.calls.filter((call) => call.url === BASE).length).toBe(2);
  });

  it('reports a load error', async () => {
    httpBoundary.on('get', BASE, () => {
      throw new Error('offline');
    });

    const { result } = renderHook(() => useSiteContentTable());
    await waitFor(() => expect(result.current.error).toBe('Fehler beim Laden der Daten.'));
    expect(result.current.table.data).toEqual([]);
  });
});

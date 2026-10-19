/**
 * Tests: useAdminSearchTerms
 *
 * Verifies the one-shot load, client-side status filtering, create/ghost-create
 * behaviour, delete actions and the error state through the public hook
 * interface. Only the HTTP boundary is faked.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminSearchTerms } from '@src/features/fbf/search-term/hooks/useAdminSearchTerms';

import { httpBoundary } from '../../helpers/httpBoundary';

import type { SearchTerm } from '@src/lib/api/searchTerms';
import type { ReactElement } from 'react';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const BASE = '/admin/fbf/search-term';

const activeTerm: SearchTerm = {
  id: 1,
  name: 'React',
  reference_count: 2,
  status: 'active',
  status_color_token: 'green',
};
const pendingTerm: SearchTerm = {
  id: 2,
  name: 'Kotlin',
  reference_count: 0,
  status: 'pending',
  status_color_token: 'amber',
};
let terms: SearchTerm[] = [];

beforeEach(() => {
  httpBoundary.reset();
  terms = [activeTerm, pendingTerm];
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  httpBoundary.on('get', BASE, () => terms);
});

describe('useAdminSearchTerms – loading', () => {
  it('loads all terms once and exposes them as table rows', async () => {
    const { result } = renderHook(() => useAdminSearchTerms());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data.map((term) => term.name)).toEqual(['React', 'Kotlin']);
    expect(result.current.table.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('reports the German error when loading fails', async () => {
    httpBoundary.on('get', BASE, () => { throw new Error('offline'); });

    const { result } = renderHook(() => useAdminSearchTerms());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Suchbegriffe.');
    expect(result.current.table.data).toEqual([]);
  });
});

describe('useAdminSearchTerms – status filter', () => {
  it('filters the client-side rows by status', async () => {
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const renderFilter = result.current.columns.name.filter;
    const filter = (typeof renderFilter === 'function' ? renderFilter({}) : renderFilter) as ReactElement<{
      onSelect: (value: string) => void
    }>;

    act(() => filter.props.onSelect('active'));

    expect(result.current.table.data.map((term) => term.name)).toEqual(['React']);
  });

  it('shows all rows again when the filter is cleared', async () => {
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const renderFilter = result.current.columns.name.filter;
    const filter = (typeof renderFilter === 'function' ? renderFilter({}) : renderFilter) as ReactElement<{
      onSelect: (value: string) => void
    }>;

    act(() => filter.props.onSelect('active'));
    act(() => filter.props.onSelect(''));

    expect(result.current.table.data).toHaveLength(2);
  });
});

describe('useAdminSearchTerms – create', () => {
  it('creates a term, reloads and reports success', async () => {
    httpBoundary.on('post', BASE, (call) => {
      const created = {
        id: 3,
        name: (call.payload as { name: string }).name,
        reference_count: 0,
        status: 'pending',
        status_color_token: 'amber',
      };
      terms = [...terms, created];
      return created;
    });
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const outcome = await act(async () => result.current.handleCreate('GraphQL'));

    expect(outcome).toEqual({});
    expect(httpBoundary.calls.filter((call) => call.method === 'post')[0].payload).toEqual({ name: 'GraphQL' });
    expect(result.current.table.data.map((term) => term.name)).toContain('GraphQL');
  });

  it('returns an error result when creating fails', async () => {
    httpBoundary.on('post', BASE, () => { throw new Error('offline'); });
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.handleCreate('GraphQL')).resolves.toEqual({ error: 'Fehler beim Anlegen.' });
  });

  it('rejects a ghost-row create without a name', async () => {
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: '   ' })).rejects.toThrow('Name ist erforderlich.');
    expect(httpBoundary.calls.filter((call) => call.method === 'post')).toEqual([]);
  });

  it('creates a trimmed ghost-row name and reloads', async () => {
    httpBoundary.on('post', BASE, () => ({ id: 4 }));
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: '  Rust  ' })).resolves.toEqual({ name: 'Rust' });

    expect(httpBoundary.calls.filter((call) => call.method === 'post')[0].payload).toEqual({ name: 'Rust' });
  });
});

describe('useAdminSearchTerms – delete', () => {
  it('disables delete for referenced terms', async () => {
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');

    expect(deleteAction?.disabled?.(activeTerm)).toBe(true);
    expect(deleteAction?.disabled?.(pendingTerm)).toBe(false);
  });

  it('deletes an unreferenced term and reloads', async () => {
    httpBoundary.on('delete', `${BASE}/2`, () => {
      terms = terms.filter((term) => term.id !== 2);
      return undefined;
    });
    const { result } = renderHook(() => useAdminSearchTerms());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');

    await act(async () => { await deleteAction?.onAction(pendingTerm); });

    expect(httpBoundary.calls.some((call) => call.method === 'delete' && call.url === `${BASE}/2`)).toBe(true);
    expect(result.current.table.data.map((term) => term.name)).toEqual(['React']);
  });
});

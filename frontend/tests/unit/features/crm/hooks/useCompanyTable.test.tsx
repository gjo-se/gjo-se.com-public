/**
 * Tests: useCompanyTable
 *
 * Verifies the server-side load (sort/defaults), the ghost-create name rule,
 * the dependents delete guard and the delete action.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

import { useCompanyTable } from '@src/features/crm/hooks/useCompanyTable';

import { jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/crm';

const company = { id: 1, name: 'Acme', primary_city: 'Berlin', has_dependents: false };

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
  navigate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCompanyTable', () => {
  it('loads the first page sorted by name', async () => {
    const fetchSpy = stubFetch((url) => jsonResponse(url.includes('/count') ? 1 : [company]));

    const { result } = renderHook(() => useCompanyTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toEqual([company]);
    expect(result.current.table.total).toBe(1);
    const listUrl = String(fetchSpy.mock.calls.find(([url]) => String(url).includes('/companies?'))?.[0]);
    expect(listUrl).toContain('sort_by=name');
    expect(listUrl).toContain('sort_order=desc');
    expect(listUrl).toContain('limit=20');
  });

  it('requires a company name for a ghost row', async () => {
    stubFetch((url) => jsonResponse(url.includes('/count') ? 0 : []));
    const { result } = renderHook(() => useCompanyTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ name: '   ' })).rejects.toThrow('Name ist erforderlich.');
  });

  it('creates a company with the trimmed name and reloads', async () => {
    let listCalls = 0;
    const fetchSpy = stubFetch((url, init) => {
      if (init?.method === 'POST') return jsonResponse(company);
      if (url.includes('/count')) return jsonResponse(1);
      listCalls += 1;
      return jsonResponse([company]);
    });
    const { result } = renderHook(() => useCompanyTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({ name: '  Acme  ' });
    });

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(String(post?.[0])).toContain(`${BASE}/companies`);
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ name: 'Acme' });
    expect(listCalls).toBe(2);
  });

  it('disables delete for a company with dependents', async () => {
    stubFetch((url) => jsonResponse(url.includes('/count') ? 1 : [{ ...company, has_dependents: true }]));
    const { result } = renderHook(() => useCompanyTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');

    expect(deleteAction?.disabled?.(result.current.table.data[0])).toBe(true);
    expect(deleteAction?.disabledTitle).toBe('Firma hat Abhängigkeiten (Adressen / Personen)');
  });

  it('deletes a company through the delete action', async () => {
    const fetchSpy = stubFetch((url, init) => (
      init?.method === 'DELETE' ? noContent() : jsonResponse(url.includes('/count') ? 1 : [company])
    ));
    const { result } = renderHook(() => useCompanyTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    await act(async () => {
      await deleteAction?.onAction(result.current.table.data[0]);
    });

    expect(fetchSpy.mock.calls.some(([url, init]) => init?.method === 'DELETE' && String(url).endsWith('/companies/1')))
      .toBe(true);
  });
});

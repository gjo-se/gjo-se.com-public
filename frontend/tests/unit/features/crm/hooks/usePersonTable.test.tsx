/**
 * Tests: usePersonTable
 *
 * Verifies the default sort, the name requirement, the trimmed create payload
 * and the dependents delete guard.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('react-router', () => ({ useNavigate: () => navigate }));

import { usePersonTable } from '@src/features/crm/hooks/usePersonTable';

import { jsonResponse } from '../../helpers/fetchResponse';

const BASE = '/api/v1/admin/crm';

const person = { id: 4, first_name: 'Ada', last_name: 'Lovelace', has_dependents: false };

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  navigate.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePersonTable', () => {
  it('loads the first page sorted by last name', async () => {
    const fetchSpy = stubFetch((url) => jsonResponse(url.includes('/count') ? 1 : [person]));

    const { result } = renderHook(() => usePersonTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toEqual([person]);
    const listUrl = String(fetchSpy.mock.calls.find(([url]) => String(url).includes('/persons?'))?.[0]);
    expect(listUrl).toContain('sort_by=last_name');
  });

  it('requires at least a first or last name', async () => {
    stubFetch((url) => jsonResponse(url.includes('/count') ? 0 : []));
    const { result } = renderHook(() => usePersonTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.onGhostCreate({ first_name: ' ', last_name: ' ' }))
      .rejects.toThrow('Vor- oder Nachname ist erforderlich.');
  });

  it('creates a person with trimmed optional email', async () => {
    const fetchSpy = stubFetch((url, init) => {
      if (init?.method === 'POST') return jsonResponse(person);
      return jsonResponse(url.includes('/count') ? 1 : [person]);
    });
    const { result } = renderHook(() => usePersonTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.onGhostCreate({ first_name: ' Ada ', last_name: ' ', email: '  ' });
    });

    const post = fetchSpy.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(String(post?.[0])).toContain(`${BASE}/persons`);
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      first_name: 'Ada',
      last_name: undefined,
      email: undefined,
    });
  });

  it('disables delete for a person with dependencies', async () => {
    stubFetch((url) => jsonResponse(url.includes('/count') ? 1 : [{ ...person, has_dependents: true }]));
    const { result } = renderHook(() => usePersonTable());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');

    expect(deleteAction?.disabled?.(result.current.table.data[0])).toBe(true);
    expect(deleteAction?.disabledTitle).toBe('Person hat Abhängigkeiten (Projekt-Verknüpfungen)');
  });
});

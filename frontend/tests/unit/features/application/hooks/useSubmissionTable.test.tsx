/**
 * Tests: useSubmissionTable
 *
 * Verifies the initial list+count load, the frontend→backend sort mapping, the
 * person-scoped query, the delete action and the 422 scoring hint.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

import { useSubmissionTable } from '@src/features/application/hooks/useSubmissionTable';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';
import { createWrapper } from '../../helpers/wrappers';

import type { ApplicationSubmissionListOut } from '@src/features/application/services/applicationService';

const row = {
  id: 3,
  projectId: 9,
  projectTitle: 'Projekt',
  subject: 'Bewerbung',
  createdAt: '2026-01-01',
} as unknown as ApplicationSubmissionListOut;

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

function tableResponse(url: string): Response {
  return jsonResponse(url.includes('/count') ? 1 : [row]);
}

beforeEach(() => {
  vi.restoreAllMocks();
  toastError.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSubmissionTable', () => {
  it('loads the first page and exposes rows, columns and actions', async () => {
    stubFetch((url) => tableResponse(url));

    const { result } = renderHook(() => useSubmissionTable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data).toEqual([row]);
    expect(result.current.table.total).toBe(1);
    expect(result.current.allIds).toEqual([3]);
    expect(result.current.columns).toHaveProperty('projectTitle');
    expect(result.current.rowActions.map((action) => action.key)).toEqual(['delete', 'edit', 'score']);
  });

  it('maps the frontend sort field to the backend field', async () => {
    const fetchSpy = stubFetch((url) => tableResponse(url));
    const { result } = renderHook(() => useSubmissionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.table.setSort('projectTitle', 'asc');
    });

    await waitFor(() => {
      const listCalls = fetchSpy.mock.calls
        .filter(([url]) => String(url).includes('/application-submissions?'))
        .map(([url]) => String(url));
      expect(listCalls.at(-1)).toContain('sort_by=project_title');
      expect(listCalls.at(-1)).toContain('sort_order=asc');
    });
  });

  it('scopes the query to a CRM person when configured', async () => {
    const fetchSpy = stubFetch((url) => tableResponse(url));

    const { result } = renderHook(
      () => useSubmissionTable({ crmPersonId: 42, tableKey: 'person-submissions' }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(String(fetchSpy.mock.calls[0][0])).toContain('crm_person_id=42');
  });

  it('deletes a row through the delete action', async () => {
    const fetchSpy = stubFetch((url, init) => (
      init?.method === 'DELETE'
        ? ({ ok: true, status: 204, statusText: 'No Content' } as unknown as Response)
        : tableResponse(url)
    ));
    const { result } = renderHook(() => useSubmissionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const deleteAction = result.current.rowActions.find((action) => action.key === 'delete');
    await act(async () => {
      await deleteAction?.onAction(row);
    });

    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
  });

  it('explains a 422 scoring failure', async () => {
    stubFetch((url, init) => (
      init?.method === 'POST' ? errorResponse(422, 'no description') : tableResponse(url)
    ));
    const { result } = renderHook(() => useSubmissionTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const scoreAction = result.current.rowActions.find((action) => action.key === 'score');
    await act(async () => {
      await scoreAction?.onAction(row);
    });

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toContain('description_override');
  });
});

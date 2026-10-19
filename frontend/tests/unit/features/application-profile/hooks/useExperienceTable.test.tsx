/**
 * Tests: useExperienceTable
 *
 * Covers loading, the success toasts plus list refetch after each mutation,
 * and the error toasts when a mutation fails (no refetch).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }));

import { useExperienceTable } from '@src/features/application-profile/hooks/useExperienceTable';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';
import { createWrapper } from '../../helpers/wrappers';

const BASE = '/api/v1/admin/application-profile/experience';

const experience = { id: 1, position: 'Dev', sort: 1 };

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
  toastSuccess.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useExperienceTable', () => {
  it('loads the experience projects', async () => {
    stubFetch(() => jsonResponse([experience]));

    const { result } = renderHook(() => useExperienceTable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.experiences).toEqual([experience]);
    expect(result.current.error).toBeNull();
  });

  it('exposes a load error', async () => {
    stubFetch(() => errorResponse(500, 'boom'));

    const { result } = renderHook(() => useExperienceTable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBe('500: boom'));
    expect(result.current.experiences).toEqual([]);
  });

  it('creates an experience and refreshes the list', async () => {
    let listCalls = 0;
    stubFetch((_url, init) => {
      if (init?.method === 'POST') return jsonResponse(experience);
      listCalls += 1;
      return jsonResponse([experience]);
    });
    const { result } = renderHook(() => useExperienceTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ position: 'Dev' } as never);
    });

    expect(listCalls).toBe(2);
    expect(toastSuccess).toHaveBeenCalledWith('Erfahrung angelegt.');
  });

  it('keeps the list and reports a create error', async () => {
    let listCalls = 0;
    stubFetch((_url, init) => {
      if (init?.method === 'POST') return errorResponse(409, 'duplicate');
      listCalls += 1;
      return jsonResponse([]);
    });
    const { result } = renderHook(() => useExperienceTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ position: 'Dev' } as never);
    });

    expect(listCalls).toBe(1);
    expect(toastError).toHaveBeenCalledWith('409: duplicate', expect.objectContaining({}));
  });

  it('updates, reorders and deletes through their endpoints', async () => {
    const fetchSpy = stubFetch((_url, init) => {
      if (init?.method === 'DELETE') return noContent();
      if (init?.method === 'PUT' || init?.method === 'PATCH') return jsonResponse(experience);
      return jsonResponse([experience]);
    });
    const { result } = renderHook(() => useExperienceTable(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update(1, { position: 'Lead' } as never);
      await result.current.reorder([1]);
      await result.current.remove(1);
    });

    const calls = fetchSpy.mock.calls.map(([url, init]) => `${init?.method} ${url}`);
    expect(calls.some((call) => call === `PUT ${BASE}/1`)).toBe(true);
    expect(calls.some((call) => call === `PATCH ${BASE}/reorder`)).toBe(true);
    expect(calls.some((call) => call === `DELETE ${BASE}/1`)).toBe(true);
    expect(toastSuccess).toHaveBeenCalledWith('Erfahrung gespeichert.');
    expect(toastSuccess).toHaveBeenCalledWith('Erfahrung gelöscht.');
  });
});

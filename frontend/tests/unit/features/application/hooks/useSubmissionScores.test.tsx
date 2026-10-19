/**
 * Tests: useSubmissionScores
 *
 * Verifies loading the append-only history (default newest first), starting a
 * new run (POST + reload) and the 422 hint when no description exists.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

import { useSubmissionScores } from '@src/features/application/hooks/useSubmissionScores';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';
import { createWrapper } from '../../helpers/wrappers';

const olderRun = { id: 1, totalScore: 40, verdict: 'weak', assessed_weight: 10, createdAt: '2026-01-01' };
const newerRun = { id: 2, totalScore: 80, verdict: 'ready', assessed_weight: 10, createdAt: '2026-02-01' };

type FetchHandler = (url: string, init?: RequestInit) => Response

function stubFetch(handler: FetchHandler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    ((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as never,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  toastError.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSubmissionScores', () => {
  it('loads the history newest first', async () => {
    stubFetch(() => jsonResponse([olderRun, newerRun]));

    const { result } = renderHook(() => useSubmissionScores(3), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.map((run) => run.id)).toEqual([2, 1]);
    expect(result.current.scoring).toBe(false);
  });

  it('does not load without a submission id', async () => {
    const fetchSpy = stubFetch(() => jsonResponse([]));

    const { result } = renderHook(() => useSubmissionScores(0), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts a new run and reloads the history', async () => {
    let historyCalls = 0;
    stubFetch((_url, init) => {
      if (init?.method === 'POST') return jsonResponse(newerRun);
      historyCalls += 1;
      return jsonResponse([newerRun]);
    });
    const { result } = renderHook(() => useSubmissionScores(3), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.trigger();
    });

    expect(historyCalls).toBe(2);
    expect(result.current.scoring).toBe(false);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('adds the description-override hint on a 422 error', async () => {
    stubFetch((_url, init) => (
      init?.method === 'POST'
        ? errorResponse(422, 'no description')
        : jsonResponse([olderRun])
    ));
    const { result } = renderHook(() => useSubmissionScores(3), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.trigger();
    });

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toContain('description_override');
  });
});

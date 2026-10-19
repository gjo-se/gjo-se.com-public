/**
 * Tests: useSubmissionDetail
 *
 * Covers loading, the status transition, communication create/delete (with
 * refetch) and the delete outcome contract (true/false + error toast).
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

import { useSubmissionDetail } from '@src/features/application/hooks/useSubmissionDetail';

import { errorResponse, jsonResponse } from '../../helpers/fetchResponse';

import type { ApplicationSubmissionDetailOut } from '@src/features/application/services/applicationService';

const submission = {
  id: 3,
  projectId: 9,
  subject: 'Bewerbung',
  communications: [],
} as unknown as ApplicationSubmissionDetailOut;

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

describe('useSubmissionDetail', () => {
  it('loads the submission on mount', async () => {
    stubFetch(() => jsonResponse(submission));

    const { result } = renderHook(() => useSubmissionDetail(3));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.submission).toEqual(submission);
    expect(result.current.error).toBeNull();
  });

  it('reports a load error instead of data', async () => {
    stubFetch(() => errorResponse(500, 'boom'));

    const { result } = renderHook(() => useSubmissionDetail(3));

    await waitFor(() => expect(result.current.error).toBe('500: boom'));

    expect(result.current.submission).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('applies the status returned by the API', async () => {
    const updated = { ...submission, status: { slug: 'sent' } } as ApplicationSubmissionDetailOut;
    stubFetch((url, init) => jsonResponse(url.endsWith('/status') && init?.method === 'PATCH' ? updated : submission));
    const { result } = renderHook(() => useSubmissionDetail(3));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    await act(async () => {
      await result.current.updateStatus('sent');
    });

    expect(result.current.submission?.status).toEqual({ slug: 'sent' });
  });

  it('creates a communication entry and refetches the submission', async () => {
    let gets = 0;
    stubFetch((url, init) => {
      if (init?.method === 'POST' && url.endsWith('/communications')) {
        return jsonResponse({ id: 1 });
      }
      gets += 1;
      return jsonResponse(submission);
    });
    const { result } = renderHook(() => useSubmissionDetail(3));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    await act(async () => {
      await result.current.createCommunication({ type: 'mail', subject: 'Hallo' });
    });

    expect(gets).toBe(2);
  });

  it('returns true after a successful delete', async () => {
    stubFetch((_url, init) => (
      init?.method === 'DELETE'
        ? ({ ok: true, status: 204, statusText: 'No Content' } as unknown as Response)
        : jsonResponse(submission)
    ));
    const { result } = renderHook(() => useSubmissionDetail(3));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    let removed = false;
    await act(async () => {
      removed = await result.current.removeSubmission();
    });

    expect(removed).toBe(true);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('returns false and shows a toast when the delete fails', async () => {
    stubFetch((_url, init) => (
      init?.method === 'DELETE' ? errorResponse(409, 'already sent') : jsonResponse(submission)
    ));
    const { result } = renderHook(() => useSubmissionDetail(3));
    await waitFor(() => expect(result.current.submission).not.toBeNull());

    let removed = true;
    await act(async () => {
      removed = await result.current.removeSubmission();
    });

    expect(removed).toBe(false);
    expect(toastError).toHaveBeenCalledWith(
      'Löschen fehlgeschlagen: 409: already sent',
      expect.objectContaining({ duration: Infinity }),
    );
  });
});

/**
 * Tests: useJobRolePendingCount
 *
 * Verifies the badge count loads on mount, refreshes on focus and on the
 * curation event, keeps the last value on failure, and stops listening on
 * unmount. The axios boundary is faked.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  JOB_ROLES_CHANGED_EVENT,
  useJobRolePendingCount,
} from '@src/features/fbf/job-role/hooks/useJobRolePendingCount';

import { httpBoundary } from '../../helpers/httpBoundary';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const COUNT_URL = '/admin/fbf/job-role/count';
let answer: number | Error = 0;

beforeEach(() => {
  httpBoundary.reset();
  answer = 0;
  httpBoundary.on('get', COUNT_URL, () => {
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

describe('useJobRolePendingCount', () => {
  it('loads the pending count on mount', async () => {
    answer = 7;

    const { result } = renderHook(() => useJobRolePendingCount());

    await waitFor(() => expect(result.current.pendingCount).toBe(7));
    expect(httpBoundary.calls[0].params).toEqual({ status: 'pending' });
  });

  it('refreshes on window focus', async () => {
    const { result } = renderHook(() => useJobRolePendingCount());
    await waitFor(() => expect(httpBoundary.calls).toHaveLength(1));

    answer = 4;
    act(() => window.dispatchEvent(new Event('focus')));

    await waitFor(() => expect(result.current.pendingCount).toBe(4));
  });

  it('refreshes when the curation event fires', async () => {
    const { result } = renderHook(() => useJobRolePendingCount());
    await waitFor(() => expect(httpBoundary.calls).toHaveLength(1));

    answer = 2;
    act(() => window.dispatchEvent(new Event(JOB_ROLES_CHANGED_EVENT)));

    await waitFor(() => expect(result.current.pendingCount).toBe(2));
  });

  it('keeps the last known count when the request fails', async () => {
    answer = 6;
    const { result } = renderHook(() => useJobRolePendingCount());
    await waitFor(() => expect(result.current.pendingCount).toBe(6));

    answer = new Error('offline');
    act(() => window.dispatchEvent(new Event('focus')));

    await waitFor(() => expect(httpBoundary.calls).toHaveLength(2));
    expect(result.current.pendingCount).toBe(6);
  });

  it('removes the listeners on unmount', async () => {
    const { unmount } = renderHook(() => useJobRolePendingCount());
    await waitFor(() => expect(httpBoundary.calls).toHaveLength(1));
    const callsBefore = httpBoundary.calls.length;

    unmount();
    act(() => window.dispatchEvent(new Event('focus')));
    act(() => window.dispatchEvent(new Event(JOB_ROLES_CHANGED_EVENT)));

    expect(httpBoundary.calls).toHaveLength(callsBefore);
  });
});

/**
 * Tests: useSkillPendingCount
 *
 * Verifies the badge count loads on mount, refreshes on focus and on the
 * skills-changed event, keeps the last value on failure, and detaches its
 * listeners on unmount.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SKILLS_CHANGED_EVENT,
  useSkillPendingCount,
} from '@src/features/fbf/skill/hooks/useSkillPendingCount';

import { httpBoundary } from '../../helpers/httpBoundary';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const COUNT_URL = '/admin/fbf/skill/count';
let answer: number | Error = 0;

beforeEach(() => {
  httpBoundary.reset();
  answer = 0;
  httpBoundary.on('get', COUNT_URL, () => {
    if (answer instanceof Error) throw answer;
    return answer;
  });
});

describe('useSkillPendingCount', () => {
  it('loads the pending count on mount', async () => {
    answer = 9;

    const { result } = renderHook(() => useSkillPendingCount());

    await waitFor(() => expect(result.current.pendingCount).toBe(9));
    expect(httpBoundary.calls[0].params).toEqual({ status: 'pending' });
  });

  it('refreshes on window focus', async () => {
    const { result } = renderHook(() => useSkillPendingCount());
    await waitFor(() => expect(httpBoundary.calls).toHaveLength(1));

    answer = 3;
    act(() => window.dispatchEvent(new Event('focus')));

    await waitFor(() => expect(result.current.pendingCount).toBe(3));
  });

  it('refreshes when the curation event fires', async () => {
    const { result } = renderHook(() => useSkillPendingCount());
    await waitFor(() => expect(httpBoundary.calls).toHaveLength(1));

    answer = 1;
    act(() => window.dispatchEvent(new Event(SKILLS_CHANGED_EVENT)));

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
  });

  it('keeps the last known count when the request fails', async () => {
    answer = 5;
    const { result } = renderHook(() => useSkillPendingCount());
    await waitFor(() => expect(result.current.pendingCount).toBe(5));

    answer = new Error('offline');
    act(() => window.dispatchEvent(new Event('focus')));

    await waitFor(() => expect(httpBoundary.calls).toHaveLength(2));
    expect(result.current.pendingCount).toBe(5);
  });

  it('removes the listeners on unmount', async () => {
    const { unmount } = renderHook(() => useSkillPendingCount());
    await waitFor(() => expect(httpBoundary.calls).toHaveLength(1));
    const callsBefore = httpBoundary.calls.length;

    unmount();
    act(() => window.dispatchEvent(new Event('focus')));
    act(() => window.dispatchEvent(new Event(SKILLS_CHANGED_EVENT)));

    expect(httpBoundary.calls).toHaveLength(callsBefore);
  });
});

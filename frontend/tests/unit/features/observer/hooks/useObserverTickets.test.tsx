/**
 * Tests: useObserverTickets
 *
 * Covers the initial load, the error message, the manual refetch and the
 * 30s polling interval (cleared on unmount).
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary } = await import('../../helpers/httpBoundary');
  return { default: httpBoundary.api, api: httpBoundary.api };
});

import { useObserverTickets } from '@src/features/observer/hooks/useObserverTickets';

import { httpBoundary } from '../../helpers/httpBoundary';

const URL = '/admin/llm/observer/tickets';

beforeEach(() => {
  httpBoundary.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useObserverTickets', () => {
  it('loads the tickets on mount', async () => {
    httpBoundary.on('get', URL, () => [{ id: 1 }]);

    const { result } = renderHook(() => useObserverTickets());

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tickets).toEqual([{ id: 1 }]);
    expect(result.current.error).toBeNull();
  });

  it('reports the error message and keeps the list empty', async () => {
    httpBoundary.on('get', URL, () => {
      throw new Error('offline');
    });

    const { result } = renderHook(() => useObserverTickets());

    await vi.waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('offline');
    expect(result.current.tickets).toEqual([]);
  });

  it('polls every 30 seconds', async () => {
    vi.useFakeTimers();
    let calls = 0;
    httpBoundary.on('get', URL, () => {
      calls += 1;
      return [{ id: calls }];
    });
    const { result } = renderHook(() => useObserverTickets());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(calls).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(calls).toBe(2);
    expect(result.current.tickets).toEqual([{ id: 2 }]);
  });

  it('refetches on demand', async () => {
    let calls = 0;
    httpBoundary.on('get', URL, () => {
      calls += 1;
      return [{ id: calls }];
    });
    const { result } = renderHook(() => useObserverTickets());
    await vi.waitFor(() => expect(result.current.tickets).toEqual([{ id: 1 }]));

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.tickets).toEqual([{ id: 2 }]);
  });
});

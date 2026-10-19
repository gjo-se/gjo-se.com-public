/**
 * Tests: useAutoRefresh
 *
 * Verifies the initial query, the 30s refetch while the tab is visible and the
 * pause while `document.hidden` is true.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoRefresh } from '@src/features/observer/hooks/useAutoRefresh';

import { createWrapper } from '../../helpers/wrappers';

import type { Mock } from 'vitest';

type Fetcher = () => Promise<{ ok: boolean }>;

let fetcher: Mock<Fetcher>;

beforeEach(() => {
  fetcher = vi.fn<Fetcher>().mockResolvedValue({ ok: true });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('useAutoRefresh', () => {
  it('loads the data on mount', async () => {
    const { result } = renderHook(() => useAutoRefresh(['k'], fetcher, 30_000), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after the interval while visible', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAutoRefresh(['k'], fetcher, 30_000), {
      wrapper: createWrapper(),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.current.data).toEqual({ ok: true });
  });

  it('does not refetch while the tab is hidden', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    renderHook(() => useAutoRefresh(['k'], fetcher, 30_000), { wrapper: createWrapper() });

    await vi.advanceTimersByTimeAsync(90_000);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

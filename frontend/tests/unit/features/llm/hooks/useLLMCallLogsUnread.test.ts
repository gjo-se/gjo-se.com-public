/**
 * Tests: useLLMCallLogsUnread – derives the unread-error badge count.
 *
 * Counts only errors newer than the persisted marker (strict boundary), keeps
 * zero when everything was seen, and degrades to zero on a failed fetch.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CallLogOut } from '@src/lib/api/callLog';
import { useLLMCallLogsUnread } from '@src/features/llm/hooks/useLLMCallLogsUnread';

const api = vi.hoisted(() => {
  let items: CallLogOut[] = []
  let failure: Error | null = null
  let attempts = 0

  return {
    fetchCallLogs: (): Promise<{ items: CallLogOut[]; total: number }> => {
      attempts += 1
      if (failure) return Promise.reject(failure)
      return Promise.resolve({ items, total: items.length })
    },
    reset(): void {
      items = []
      failure = null
      attempts = 0
    },
    respondWith(next: CallLogOut[]): void {
      items = next
    },
    failWith(error: Error): void {
      failure = error
    },
    attempts(): number {
      return attempts
    },
  }
})

vi.mock('@src/lib/api/callLog', () => ({
  fetchCallLogs: api.fetchCallLogs,
}));

function errorAt(id: number, createdAt: string): CallLogOut {
  return { id, task: 'merge_description', created_at: createdAt } as CallLogOut;
}

describe('useLLMCallLogsUnread', () => {
  beforeEach(() => {
    api.reset();
    localStorage.clear();
  });

  it('counts only errors newer than the seen marker', async () => {
    localStorage.setItem('llm-call-logs-seen-at', String(Date.parse('2025-01-02T00:00:00Z')));
    api.respondWith([
      errorAt(3, '2025-01-03T00:00:00Z'),
      errorAt(2, '2025-01-02T00:00:00Z'),
      errorAt(1, '2025-01-01T00:00:00Z'),
    ]);

    const { result } = renderHook(() => useLLMCallLogsUnread());

    await waitFor(() => expect(result.current.unreadCount).toBe(1));
  });

  it('returns zero when no marker exists but no errors were loaded', async () => {
    api.respondWith([]);

    const { result } = renderHook(() => useLLMCallLogsUnread());

    await waitFor(() => expect(api.attempts()).toBe(1));
    expect(result.current.unreadCount).toBe(0);
  });

  it('degrades to zero when the request fails', async () => {
    api.failWith(new Error('offline'));

    const { result } = renderHook(() => useLLMCallLogsUnread());

    await waitFor(() => expect(api.attempts()).toBe(1));
    expect(result.current.unreadCount).toBe(0);
  });
});

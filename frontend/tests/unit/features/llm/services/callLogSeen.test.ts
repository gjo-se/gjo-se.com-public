/**
 * Tests: callLogSeen – persists and reads the "last seen" badge marker.
 *
 * Covers the unset state, a written marker and deferred timestamp, plus the
 * corrupt-value and storage-failure error paths.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markCallLogsSeen, readCallLogsSeenAt } from '@src/features/llm/services/callLogSeen';

const STORAGE_KEY = 'llm-call-logs-seen-at';

describe('callLogSeen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('returns zero when no marker was written yet', () => {
    expect(readCallLogsSeenAt()).toBe(0);
  });

  it('persists the current time when marking the logs as seen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    markCallLogsSeen();

    expect(localStorage.getItem(STORAGE_KEY)).toBe(String(Date.parse('2025-01-01T00:00:00Z')));
    expect(readCallLogsSeenAt()).toBe(Date.parse('2025-01-01T00:00:00Z'));
  });

  it('returns zero for a corrupt stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-number');

    expect(readCallLogsSeenAt()).toBe(0);
  });

  it('returns zero when reading storage throws', () => {
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    expect(readCallLogsSeenAt()).toBe(0);

    getItem.mockRestore();
  });

  it('does not throw when writing storage fails', () => {
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => { markCallLogsSeen(); }).not.toThrow();

    setItem.mockRestore();
  });
});

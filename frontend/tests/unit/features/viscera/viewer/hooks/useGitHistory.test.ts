/**
 * Tests: useGitHistory
 *
 * Verifies the history request lifecycle at the public interface: no object id
 * means no history, a successful response exposes the commits, and a failed
 * request surfaces the message with an empty list.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGitHistory } from '@src/features/viscera/viewer/hooks/useGitHistory';

import type { CommitInfo } from '@src/features/viscera/viewer/hooks/useGitHistory';

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@src/lib/api/axios', () => ({ api: { get: apiMock.get } }));

const COMMITS: CommitInfo[] = [
  {
    hash: 'abc123',
    date: '2026-01-02',
    author: 'Greg',
    message: 'Add backend node',
    changed_fields: ['description'],
  },
];

beforeEach(() => {
  apiMock.get.mockReset();
});

describe('useGitHistory', () => {
  it('stays empty without an object id', () => {
    const { result } = renderHook(() => useGitHistory(null, 'workspace.yml'));

    expect(result.current.commits).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes the commits returned by the api', async () => {
    apiMock.get.mockResolvedValue({ data: { commits: COMMITS } });

    const { result } = renderHook(() => useGitHistory('backend', 'workspace.yml'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.commits).toEqual(COMMITS);
    expect(result.current.error).toBeNull();
  });

  it('reports the error message and clears the commits on failure', async () => {
    apiMock.get.mockRejectedValue(new Error('history unavailable'));

    const { result } = renderHook(() => useGitHistory('backend', 'workspace.yml'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.commits).toEqual([]);
    expect(result.current.error).toBe('history unavailable');
  });

  it('reloads when the object id changes', async () => {
    apiMock.get
      .mockResolvedValueOnce({ data: { commits: COMMITS } })
      .mockResolvedValueOnce({ data: { commits: [] } });

    const { result, rerender } = renderHook(
      ({ objectId }: { objectId: string }) => useGitHistory(objectId, 'workspace.yml'),
      { initialProps: { objectId: 'backend' } },
    );
    await waitFor(() => expect(result.current.commits).toEqual(COMMITS));

    rerender({ objectId: 'backend.api' });

    await waitFor(() => expect(result.current.commits).toEqual([]));
    expect(result.current.error).toBeNull();
  });
});

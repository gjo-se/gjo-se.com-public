/**
 * Tests: useScanCode
 *
 * Verifies the scan workflow lifecycle: running state with per-activity
 * indicators, elapsed counter, completion result, failure handling, and cancel.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScanCode } from '@src/features/viscera/viewer/hooks/useScanCode';

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock('@src/lib/api/axios', () => ({ api: { get: apiMock.get, post: apiMock.post } }));

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useScanCode', () => {
  it('starts idle with all activities pending', () => {
    const { result } = renderHook(() => useScanCode());

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.activities.map((activity) => activity.status)).toEqual([
      'pending',
      'pending',
      'pending',
    ]);
    expect(result.current.state.elapsed).toBe(0);
  });

  it('switches to running and marks the first activity immediately', async () => {
    apiMock.post.mockResolvedValue({ data: { workflow_id: 'wf-1', status: 'running' } });
    const { result } = renderHook(() => useScanCode());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.state.status).toBe('running');
    expect(result.current.state.activities[0]?.status).toBe('running');
    expect(result.current.state.activities[1]?.status).toBe('pending');
  });

  it('completes all activities and exposes the scan result', async () => {
    apiMock.post.mockResolvedValue({ data: { workflow_id: 'wf-1', status: 'running' } });
    apiMock.get.mockResolvedValue({
      data: {
        status: 'completed',
        current_activity: null,
        result: { objects_updated: 3, objects_new: 1, objects_missing: 2 },
        error: null,
      },
    });
    let completed = 0;
    const { result } = renderHook(() => useScanCode());

    await act(async () => {
      await result.current.startScan(() => { completed += 1; });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.activities.every((activity) => activity.status === 'done')).toBe(true);
    expect(result.current.state.result).toEqual({
      objects_updated: 3,
      objects_new: 1,
      objects_missing: 2,
    });
    expect(completed).toBe(1);
  });

  it('marks the failing activity and the error on a failed workflow', async () => {
    apiMock.post.mockResolvedValue({ data: { workflow_id: 'wf-1', status: 'running' } });
    apiMock.get.mockResolvedValue({
      data: {
        status: 'failed',
        current_activity: 'llm_enrichment',
        result: null,
        error: 'LLM unavailable',
      },
    });
    const { result } = renderHook(() => useScanCode());

    await act(async () => {
      await result.current.startScan();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.state.status).toBe('failed');
    expect(result.current.state.error).toBe('LLM unavailable');
    expect(result.current.state.activities[2]).toMatchObject({
      name: 'llm_enrichment',
      status: 'failed',
      error: 'LLM unavailable',
    });
  });

  it('reports a failed start when the trigger request fails', async () => {
    apiMock.post.mockRejectedValue(new Error('trigger failed'));
    const { result } = renderHook(() => useScanCode());

    await act(async () => {
      await result.current.startScan();
    });

    expect(result.current.state.status).toBe('failed');
    expect(result.current.state.error).toBe('trigger failed');
    expect(result.current.state.activities[0]).toMatchObject({
      status: 'failed',
      error: 'trigger failed',
    });
  });

  it('cancels a run back to idle', async () => {
    apiMock.post.mockResolvedValue({ data: { workflow_id: 'wf-1', status: 'running' } });
    const { result } = renderHook(() => useScanCode());
    await act(async () => {
      await result.current.startScan();
    });

    act(() => result.current.cancel());

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.activities.every((activity) => activity.status === 'pending')).toBe(true);
  });

  it('increments the elapsed seconds while running', async () => {
    apiMock.post.mockResolvedValue({ data: { workflow_id: 'wf-1', status: 'running' } });
    const { result } = renderHook(() => useScanCode());
    await act(async () => {
      await result.current.startScan();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.state.elapsed).toBe(1);
  });
});

/**
 * Tests: useSyncService
 *
 * Verifies the queue drain: successful mutations leave the queue and clear the
 * transient flag, failed server mutations stay marked as failed, the active
 * diagram world is passed as write source, and field values are normalized.
 */

import { AxiosError } from 'axios';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useSyncService } from '@src/features/viscera/viewer/hooks/useSyncService';

import { resetVisceraStore } from '../../helpers';

const apiMock = vi.hoisted(() => ({
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@src/lib/api/axios', () => ({ api: apiMock }));

function queueFieldUpdate(overrides: { field?: string; value?: unknown } = {}): string {
  const entry = {
    mutationId: `m-${Math.random().toString(36).slice(2, 8)}`,
    nodeId: 'backend',
    action: 'field_update' as const,
    payload: { field: overrides.field ?? 'name', value: overrides.value ?? 'Renamed' },
    retryCount: 0,
    status: 'pending' as const,
  };
  useVisceraStore.getState().queueSync(entry);
  return entry.mutationId;
}

function serverError(detail: string): AxiosError {
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: {} as never,
    data: { detail },
  });
}

beforeEach(() => {
  resetVisceraStore();
  apiMock.put.mockReset();
  apiMock.post.mockReset();
  apiMock.delete.mockReset();
});

describe('useSyncService', () => {
  it('drains a successful mutation and clears the transient node flag', async () => {
    apiMock.put.mockResolvedValue({ data: {} });
    useVisceraStore.setState({
      nodes: [
        {
          id: 'backend',
          type: 'systemCard',
          position: { x: 0, y: 0 },
          data: { name: 'Backend', kind: 'system', cardWidth: 200, cardHeight: 100 },
          isTransient: true,
        },
      ],
    });
    renderHook(() => useSyncService());

    queueFieldUpdate();

    await waitFor(() => expect(useVisceraStore.getState().syncQueue).toEqual([]));
    expect(useVisceraStore.getState().nodes[0]?.isTransient).toBe(false);
  });

  it('normalizes the store type to the backend data_store value', async () => {
    apiMock.put.mockResolvedValue({ data: {} });
    renderHook(() => useSyncService());

    queueFieldUpdate({ field: 'type', value: 'store' });

    await waitFor(() => expect(useVisceraStore.getState().syncQueue).toEqual([]));
    expect(apiMock.put.mock.calls[0]?.[1]).toEqual({ field: 'type', value: 'data_store' });
  });

  it('passes the active diagram world as write source', async () => {
    apiMock.put.mockResolvedValue({ data: {} });
    useVisceraStore.getState().setSource('golden');
    renderHook(() => useSyncService());

    queueFieldUpdate();

    await waitFor(() => expect(useVisceraStore.getState().syncQueue).toEqual([]));
    expect(apiMock.put.mock.calls[0]?.[2]).toEqual({ params: { source: 'golden' } });
  });

  it('marks a server error as failed and keeps the entry', async () => {
    apiMock.put.mockRejectedValue(serverError('invalid payload'));
    renderHook(() => useSyncService());

    const mutationId = queueFieldUpdate();

    await waitFor(() => {
      const entry = useVisceraStore.getState().syncQueue.find((item) => item.mutationId === mutationId);
      expect(entry?.status).toBe('failed');
    });
    const entry = useVisceraStore.getState().syncQueue.find((item) => item.mutationId === mutationId);
    expect(entry?.error).toBe('invalid payload');
  });

  it('processes queued mutations sequentially', async () => {
    apiMock.put.mockResolvedValue({ data: {} });
    renderHook(() => useSyncService());

    queueFieldUpdate({ field: 'name', value: 'First' });
    queueFieldUpdate({ field: 'name', value: 'Second' });

    await waitFor(() => expect(useVisceraStore.getState().syncQueue).toEqual([]));
    expect(apiMock.put.mock.calls.map((call) => (call[1] as { value: string }).value)).toEqual([
      'First',
      'Second',
    ]);
  });
});

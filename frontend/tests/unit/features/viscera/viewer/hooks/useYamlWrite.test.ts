/**
 * Tests: useYamlWrite
 *
 * Verifies the debounced field write: a valid value updates the workspace and
 * store and enqueues a field sync, invalid values fail without side effects,
 * whole-workspace violations block the write, and the last write wins.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useYamlWrite } from '@src/features/viscera/viewer/hooks/useYamlWrite';

import {
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
  resetVisceraStore,
} from '../../helpers';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

function seedNode(): void {
  useVisceraStore.setState({
    nodes: [
      {
        id: 'backend',
        type: 'systemCard',
        position: { x: 0, y: 0 },
        data: { name: 'Backend', kind: 'system', cardWidth: 200, cardHeight: 100 },
        isTransient: false,
      },
    ],
  });
}

let updates: Workspace[] = [];
const workspace = makeWorkspace({
  objects: [makeObject({ id: 'backend', name: 'Backend', type: 'system' })],
});

beforeEach(() => {
  resetVisceraStore();
  seedNode();
  updates = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderWriteHook(initialWorkspace: Workspace = workspace) {
  const wrapper = makeWorkspaceWrapper(initialWorkspace, (next) => updates.push(next));
  return renderHook(() => useYamlWrite(), { wrapper });
}

describe('useYamlWrite', () => {
  it('writes a valid field after the debounce and updates the workspace', async () => {
    const { result } = renderWriteHook();

    const pending = result.current.writeField('backend', 'name', 'Renamed');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(await pending).toEqual({ success: true });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.objects?.[0]?.name).toBe('Renamed');
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      nodeId: 'backend',
      action: 'field_update',
      payload: { field: 'name', value: 'Renamed' },
    });
  });

  it('rejects an empty name without touching workspace or queue', async () => {
    const { result } = renderWriteHook();

    const pending = result.current.writeField('backend', 'name', '');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(await pending).toEqual({ success: false, error: 'Name must not be empty' });
    expect(updates).toEqual([]);
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('rejects an unknown object type via the field validator', async () => {
    const { result } = renderWriteHook();

    const pending = result.current.writeField('backend', 'type', 'service');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const outcome = await pending;
    expect(outcome.success).toBe(false);
    expect(outcome.error).toEqual(expect.any(String));
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('blocks the write when the whole workspace becomes invalid', async () => {
    const broken = makeWorkspace({
      objects: [makeObject({ id: 'backend', name: 'Backend' })],
    });
    delete (broken.objects?.[0] as { name?: string }).name;
    const { result } = renderWriteHook(broken);

    const pending = result.current.writeField('backend', 'description', 'still invalid');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const outcome = await pending;
    expect(outcome.success).toBe(false);
    expect(updates).toEqual([]);
  });

  it('lets the last value win within the debounce window', async () => {
    const { result } = renderWriteHook();

    void result.current.writeField('backend', 'name', 'First');
    const pending = result.current.writeField('backend', 'name', 'Second');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(await pending).toEqual({ success: true });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.objects?.[0]?.name).toBe('Second');
    expect(useVisceraStore.getState().syncQueue).toHaveLength(1);
  });
});

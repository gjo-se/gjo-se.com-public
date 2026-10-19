/**
 * Tests: useGroupDetail
 *
 * Verifies group resolution with resolved member names, the Escape/close
 * lifecycle, and the optimistic rename/description/remove-member handlers with
 * their queued sync mutations.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useGroupDetail } from '@src/features/viscera/viewer/hooks/useGroupDetail';

import {
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
  resetVisceraStore,
} from '../../helpers';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';
import type { DiagramNode } from '@src/features/viscera/store/diagramSlice';

const workspace = makeWorkspace({
  objects: [
    makeObject({ id: 'backend', name: 'Backend', type: 'system' }),
    makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend' }),
  ],
  people: [makeObject({ id: 'greg', name: 'Greg', type: 'person' })],
  groups: [{ id: 'g1', name: 'Group One', description: 'Old', members: ['backend', 'greg', 'ghost'] }],
});

let updates: Workspace[] = [];
const wrapper = makeWorkspaceWrapper(workspace, (next) => updates.push(next));

beforeEach(() => {
  resetVisceraStore();
  updates = [];
});

describe('useGroupDetail', () => {
  it('starts closed without members', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });

    expect(result.current.groupId).toBeNull();
    expect(result.current.group).toBeNull();
    expect(result.current.members).toEqual([]);
  });

  it('resolves the selected group and its member names', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });

    act(() => result.current.selectGroup('g1'));

    expect(result.current.group?.name).toBe('Group One');
    expect(result.current.members).toEqual([
      { id: 'backend', name: 'Backend' },
      { id: 'greg', name: 'Greg' },
      { id: 'ghost', name: 'ghost' },
    ]);
  });

  it('closes the panel on close and on escape', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });
    act(() => result.current.selectGroup('g1'));

    act(() => result.current.close());
    expect(result.current.groupId).toBeNull();

    act(() => result.current.selectGroup('g1'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.groupId).toBeNull();
  });

  it('renames the group optimistically and queues an update', () => {
    useVisceraStore.setState({
      nodes: [
        {
          id: 'g1',
          type: 'group',
          position: { x: 0, y: 0 },
          data: { name: 'Group One', width: 100, height: 100 },
          isTransient: false,
        } as DiagramNode,
      ],
    });
    const { result } = renderHook(() => useGroupDetail(), { wrapper });
    act(() => result.current.selectGroup('g1'));

    act(() => result.current.renameGroup('  Renamed  '));

    expect(updates[0]?.groups?.[0]?.name).toBe('Renamed');
    expect(useVisceraStore.getState().nodes[0]?.data.name).toBe('Renamed');
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      nodeId: 'g1',
      action: 'update_group',
      payload: { name: 'Renamed' },
    });
  });

  it('ignores a blank rename', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });
    act(() => result.current.selectGroup('g1'));

    act(() => result.current.renameGroup('   '));

    expect(updates).toEqual([]);
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('updates the description optimistically and queues an update', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });
    act(() => result.current.selectGroup('g1'));

    act(() => result.current.updateDescription('New description'));

    expect(updates[0]?.groups?.[0]?.description).toBe('New description');
    expect(useVisceraStore.getState().syncQueue[0]?.payload).toEqual({
      description: 'New description',
    });
  });

  it('removes a member optimistically and queues the member sync', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });
    act(() => result.current.selectGroup('g1'));

    act(() => result.current.removeMember('greg'));

    expect(updates[0]?.groups?.[0]?.members).toEqual(['backend', 'ghost']);
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      nodeId: 'greg',
      action: 'group_members',
      payload: { groupId: 'g1', remove: ['greg'] },
    });
  });

  it('ignores removing a member that is not part of the group', () => {
    const { result } = renderHook(() => useGroupDetail(), { wrapper });
    act(() => result.current.selectGroup('g1'));

    act(() => result.current.removeMember('not-a-member'));

    expect(updates).toEqual([]);
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });
});

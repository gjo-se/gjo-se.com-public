/**
 * Tests: unassignFromGroup DnD command
 *
 * Behaviour: the guard requires a free-canvas drop plus a real origin
 * membership; executing removes the card from its group optimistically and
 * queues a `group_members` remove mutation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { unassignFromGroup } from '@src/features/viscera/viewer/services/unassignFromGroup';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeWorkspace, resetVisceraStore } from '../../helpers';

import type { VisceraDndCommandContext } from '@src/features/viscera/viewer/utils/dndTypes';

function context(patch: Partial<VisceraDndCommandContext> = {}): VisceraDndCommandContext {
  return {
    nodeId: 'api',
    originGroupId: 'grp-origin',
    targetGroupId: null,
    workspace: makeWorkspace({
      groups: [{ id: 'grp-origin', name: 'Origin', description: '', members: ['api', 'db'] }],
    }),
    updateWorkspace: vi.fn(),
    ...patch,
  };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('unassignFromGroup.canExecute', () => {
  it('blocks when a target group is present', () => {
    expect(unassignFromGroup.canExecute(context({ targetGroupId: 'grp-other' }))).toBe(false);
  });

  it('blocks without an origin group', () => {
    expect(unassignFromGroup.canExecute(context({ originGroupId: null }))).toBe(false);
  });

  it('blocks without a workspace', () => {
    expect(unassignFromGroup.canExecute(context({ workspace: null }))).toBe(false);
  });

  it('blocks when the origin group no longer contains the node', () => {
    const ctx = context({
      workspace: makeWorkspace({
        groups: [{ id: 'grp-origin', name: 'Origin', description: '', members: [] }],
      }),
    });

    expect(unassignFromGroup.canExecute(ctx)).toBe(false);
  });

  it('allows a member dropped on free canvas', () => {
    expect(unassignFromGroup.canExecute(context())).toBe(true);
  });
});

describe('unassignFromGroup.execute', () => {
  it('removes the card from the origin group optimistically', () => {
    const ctx = context();

    unassignFromGroup.execute(ctx);

    const groups = (ctx.updateWorkspace as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].groups;
    expect(groups).toEqual([
      { id: 'grp-origin', name: 'Origin', description: '', members: ['db'] },
    ]);
  });

  it('queues a remove mutation for the origin group', () => {
    unassignFromGroup.execute(context());

    const queue = useVisceraStore.getState().syncQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      nodeId: 'api',
      action: 'group_members',
      payload: { groupId: 'grp-origin', remove: ['api'] },
    });
  });

  it('does nothing without an origin group', () => {
    const ctx = context({ originGroupId: null });

    unassignFromGroup.execute(ctx);

    expect(ctx.updateWorkspace).not.toHaveBeenCalled();
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });
});

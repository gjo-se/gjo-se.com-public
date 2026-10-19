/**
 * Tests: assignToGroup DnD command
 *
 * Behaviour: the guard blocks missing context, already-assigned cards and
 * missing workspaces; executing moves the card optimistically into the target
 * group and queues the matching `group_members` mutations (remove on switch).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assignToGroup } from '@src/features/viscera/viewer/services/assignToGroup';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeWorkspace, resetVisceraStore } from '../../helpers';

import type { VisceraDndCommandContext } from '@src/features/viscera/viewer/utils/dndTypes';

function context(patch: Partial<VisceraDndCommandContext> = {}): VisceraDndCommandContext {
  return {
    nodeId: 'api',
    originGroupId: null,
    targetGroupId: 'grp-target',
    workspace: makeWorkspace({
      groups: [
        { id: 'grp-target', name: 'Target', description: '', members: [] },
        { id: 'grp-origin', name: 'Origin', description: '', members: ['api'] },
      ],
    }),
    updateWorkspace: vi.fn(),
    ...patch,
  };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('assignToGroup.canExecute', () => {
  it('blocks without a target group', () => {
    expect(assignToGroup.canExecute(context({ targetGroupId: null }))).toBe(false);
  });

  it('blocks without a workspace', () => {
    expect(assignToGroup.canExecute(context({ workspace: null }))).toBe(false);
  });

  it('blocks when the card is already a member of the target group', () => {
    const ctx = context({
      workspace: makeWorkspace({
        groups: [{ id: 'grp-target', name: 'T', description: '', members: ['api'] }],
      }),
    });

    expect(assignToGroup.canExecute(ctx)).toBe(false);
  });

  it('allows a card that is not yet a member', () => {
    expect(assignToGroup.canExecute(context())).toBe(true);
  });
});

describe('assignToGroup.execute', () => {
  it('adds the card to the target group optimistically', () => {
    const ctx = context({ originGroupId: null });

    assignToGroup.execute(ctx);

    const updateWorkspace = ctx.updateWorkspace as ReturnType<typeof vi.fn>;
    expect(updateWorkspace).toHaveBeenCalledOnce();
    expect(updateWorkspace.mock.calls[0]?.[0].groups).toEqual([
      { id: 'grp-target', name: 'Target', description: '', members: ['api'] },
      { id: 'grp-origin', name: 'Origin', description: '', members: ['api'] },
    ]);
  });

  it('queues a single add mutation when the card had no origin group', () => {
    const ctx = context({ originGroupId: null });

    assignToGroup.execute(ctx);

    const queue = useVisceraStore.getState().syncQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      action: 'group_members',
      payload: { groupId: 'grp-target', add: ['api'] },
    });
  });

  it('removes from the origin and adds to the target on a group switch', () => {
    const ctx = context({ originGroupId: 'grp-origin' });

    assignToGroup.execute(ctx);

    const groups = (ctx.updateWorkspace as ReturnType<typeof vi.fn>).mock.calls[0]?.[0].groups;
    expect(groups).toEqual([
      { id: 'grp-target', name: 'Target', description: '', members: ['api'] },
      { id: 'grp-origin', name: 'Origin', description: '', members: [] },
    ]);

    const queue = useVisceraStore.getState().syncQueue;
    expect(queue).toHaveLength(2);
    expect(queue[0]?.payload).toEqual({ groupId: 'grp-origin', remove: ['api'] });
    expect(queue[1]?.payload).toEqual({ groupId: 'grp-target', add: ['api'] });
  });

  it('does nothing when called without a target group', () => {
    const ctx = context({ targetGroupId: null });

    assignToGroup.execute(ctx);

    expect(ctx.updateWorkspace).not.toHaveBeenCalled();
    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('does nothing without a workspace', () => {
    const ctx = context({ workspace: null });

    assignToGroup.execute(ctx);

    expect(ctx.updateWorkspace).not.toHaveBeenCalled();
  });
});

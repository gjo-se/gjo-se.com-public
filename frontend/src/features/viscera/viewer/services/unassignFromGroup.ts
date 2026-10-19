/**
 * unassignFromGroup – Member card dropped on free canvas (no group over) (#2295).
 *
 * Guard: no target group, node had an origin group at drag start and is
 * still a member of it.
 * Action: optimistic workspace.groups update + ``group_members`` sync with
 * ``remove``.
 */

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { updateGroupMembers } from '../utils/dndTypes';

import type { VisceraDndCommand } from '../utils/dndTypes';

export const unassignFromGroup: VisceraDndCommand = {
  id: 'unassignFromGroup',
  canExecute: (ctx) => {
    if (ctx.targetGroupId || !ctx.originGroupId || !ctx.workspace) return false;
    const group = ctx.workspace.groups?.find((g) => g.id === ctx.originGroupId);
    // No-op: node is no longer a member of its origin group
    if (!group || !(group.members ?? []).includes(ctx.nodeId)) return false;
    return true;
  },
  execute: (ctx) => {
    const { nodeId, originGroupId, workspace, updateWorkspace } = ctx;
    if (!originGroupId || !workspace) return;

    // Optimistic: member leaves the group — parentId/extent re-derive on rebuild
    updateWorkspace({
      ...workspace,
      groups: updateGroupMembers(workspace.groups, originGroupId, nodeId, 'remove'),
    });

    useVisceraStore.getState().queueSync({
      mutationId: crypto.randomUUID(),
      nodeId,
      action: 'group_members',
      payload: { groupId: originGroupId, remove: [nodeId] },
      retryCount: 0,
      status: 'pending',
    });
  },
};

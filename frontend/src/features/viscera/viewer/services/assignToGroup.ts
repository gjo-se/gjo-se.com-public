/**
 * assignToGroup – Card dropped on a group drop zone (#2295).
 *
 * Guard: target group present, card not already a member of it (no-op).
 * Action: optimistic workspace.groups update + ``group_members`` sync with
 * ``add``. On group switch (origin ≠ target) the old group gets a ``remove``.
 */

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { updateGroupMembers } from '../utils/dndTypes';

import type { VisceraDndCommand } from '../utils/dndTypes';

export const assignToGroup: VisceraDndCommand = {
  id: 'assignToGroup',
  canExecute: (ctx) => {
    if (!ctx.targetGroupId || !ctx.workspace) return false;
    const group = ctx.workspace.groups?.find((g) => g.id === ctx.targetGroupId);
    // No-op: card is already a member of the target group
    if (group && (group.members ?? []).includes(ctx.nodeId)) return false;
    return true;
  },
  execute: (ctx) => {
    const { nodeId, originGroupId, targetGroupId, workspace, updateWorkspace } = ctx;
    if (!targetGroupId || !workspace) return;

    // Optimistic: add to target, remove from origin group on switch
    let nextGroups = updateGroupMembers(workspace.groups, targetGroupId, nodeId, 'add');
    if (originGroupId && originGroupId !== targetGroupId) {
      nextGroups = updateGroupMembers(nextGroups, originGroupId, nodeId, 'remove');
    }
    updateWorkspace({ ...workspace, groups: nextGroups });

    const queueSync = useVisceraStore.getState().queueSync;

    // Group switch: remove from the old group first
    if (originGroupId && originGroupId !== targetGroupId) {
      queueSync({
        mutationId: crypto.randomUUID(),
        nodeId,
        action: 'group_members',
        payload: { groupId: originGroupId, remove: [nodeId] },
        retryCount: 0,
        status: 'pending',
      });
    }

    queueSync({
      mutationId: crypto.randomUUID(),
      nodeId,
      action: 'group_members',
      payload: { groupId: targetGroupId, add: [nodeId] },
      retryCount: 0,
      status: 'pending',
    });
  },
};

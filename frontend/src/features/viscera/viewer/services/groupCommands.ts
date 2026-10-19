import { useVisceraStore } from '../../store/visceraStore';
import { autoGenerateId } from '../utils/autoGenerateId';

import { waitForSyncOutcome } from './diagramCommands';

import type { Group, Workspace } from '../../core/workspaceSchema';
import type { XYPosition } from '@xyflow/react';

export interface GroupCommandDependencies {
  workspace: Workspace | null;
  updateWorkspace: (workspace: Workspace) => void;
}

export type GroupCreateOutcome =
  | { ok: true; id: string; name: string }
  | { ok: false; error: string };

/** Creates group CRUD handlers with explicit workspace dependencies. */
export function createGroupCommands(deps: GroupCommandDependencies) {
  const { workspace, updateWorkspace } = deps;

  /**
   * Creates a new architecture group from the ＋-Popover (#2276).
   *
   * Optimistic: adds a group DiagramNode at the given canvas-center position,
   * extends workspace.groups, and enqueues `create_group` for the sync
   * service. Awaits the sync outcome to surface inline errors (e.g. 409 ID
   * collision) and rolls back the optimistic updates on failure.
   */
  const handleCreateGroup = async (
    name: string,
    position: XYPosition,
  ): Promise<GroupCreateOutcome> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { ok: false, error: 'Bitte einen Namen eingeben' };
    }
    if (!workspace) {
      return { ok: false, error: 'Workspace nicht geladen' };
    }

    const store = useVisceraStore.getState();
    const groupId = generateGroupId(trimmedName, workspace);

    // Optimistic: group node on the canvas (GROUP_MIN dimensions via useDiagramNodes)
    store.addNode({
      id: groupId,
      type: 'group',
      data: { name: trimmedName, members: [] },
      position,
      isTransient: true,
    });

    // Optimistic: extend workspace.groups (visible after reload via 2274 path)
    const newGroup: Group = { id: groupId, name: trimmedName, description: '', members: [] };
    updateWorkspace({ ...workspace, groups: [...(workspace.groups ?? []), newGroup] });

    // Enqueue API sync (fire-and-forget, processed by useSyncService)
    const mutationId = crypto.randomUUID();
    store.queueSync({
      mutationId,
      nodeId: groupId,
      action: 'create_group',
      payload: { id: groupId, name: trimmedName },
      retryCount: 0,
      status: 'pending',
    });

    const outcome = await waitForSyncOutcome(mutationId);
    if (!outcome.success) {
      // Rollback: remove optimistic node and workspace entry
      store.deleteNode(groupId);
      updateWorkspace({
        ...workspace,
        groups: (workspace.groups ?? []).filter((g) => g.id !== groupId),
      });
      return { ok: false, error: outcome.error ?? 'Group konnte nicht erstellt werden' };
    }

    return { ok: true, id: groupId, name: trimmedName };
  };

  /**
   * Renames a group via the GroupNode context menu (#2278).
   *
   * Optimistic: updates the group name in `workspace.groups` and on the
   * group DiagramNode label, then enqueues `update_group` for the sync
   * service (`PUT /groups/{id}` with `{name}`).
   */
  const handleRenameGroup = (groupId: string, name: string) => {
    if (!workspace) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const store = useVisceraStore.getState();

    // Optimistic: update the group DiagramNode label on the canvas
    const groupNode = store.nodes.find((n) => n.id === groupId);
    if (groupNode) {
      store.updateNode(groupId, { ...groupNode.data, name: trimmedName });
    }

    // Optimistic: extend workspace.groups (visible after reload via 2274 path)
    const updatedGroups = (workspace.groups ?? []).map((g) =>
      g.id === groupId ? { ...g, name: trimmedName } : g,
    );
    updateWorkspace({ ...workspace, groups: updatedGroups });

    // Enqueue API sync (fire-and-forget, processed by useSyncService)
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: groupId,
      action: 'update_group',
      payload: { name: trimmedName },
      retryCount: 0,
      status: 'pending',
    });
  };

  /**
   * Deletes a group via the GroupNode context menu (#2278).
   *
   * Optimistic: removes the group from `workspace.groups` (members lose
   * their `parentId`/`extent` binding and stay untouched on the canvas)
   * and removes the group DiagramNode, then enqueues `delete_group` for
   * the sync service (`DELETE /groups/{id}`).
   */
  const handleDeleteGroup = (groupId: string) => {
    if (!workspace) return;

    // Optimistic: remove group from workspace.groups — this clears the
    // membership, so member nodes render without parentId/extent.
    const updatedGroups = (workspace.groups ?? []).filter((g) => g.id !== groupId);
    updateWorkspace({ ...workspace, groups: updatedGroups });

    // Optimistic: remove the group DiagramNode from the canvas.
    // Member nodes are intentionally left untouched (no DELETE /nodes).
    const store = useVisceraStore.getState();
    store.deleteNode(groupId);

    // Enqueue API sync (fire-and-forget, processed by useSyncService)
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: groupId,
      action: 'delete_group',
      payload: {},
      retryCount: 0,
      status: 'pending',
    });
  };

  return {
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
  };
}

/**
 * Generates a collision-free group ID: slugified name, extended with a
 * "-2", "-3", … suffix when the base ID is already taken by a group or object.
 */
function generateGroupId(name: string, workspace: Workspace): string {
  const base = autoGenerateId(name);
  const taken = new Set<string>([
    ...(workspace.groups ?? []).map((g) => g.id),
    ...(workspace.objects ?? []).map((o) => o.id),
  ]);
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

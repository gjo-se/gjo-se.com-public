import { useCallback, useEffect, useMemo, useState } from 'react';

import { useWorkspace } from '../../core/useWorkspace';
import { useVisceraStore } from '../../store/visceraStore';

import type { Group, Workspace } from '../../core/workspaceSchema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface GroupMemberEntry {
  /** Member node ID — references a flat workspace object or person ID. */
  id: string;
  /** Resolved display name from the workspace. */
  name: string;
}

export interface UseGroupDetailResult {
  /** Currently selected group ID (null while the panel is closed). */
  groupId: string | null;
  /** Resolved group from ``workspace.groups`` (null while loading or if deleted). */
  group: Group | null;
  /** Members of the selected group with resolved node names. */
  members: GroupMemberEntry[];
  /** Opens the panel for the given group. */
  selectGroup: (id: string) => void;
  /** Closes the panel. */
  close: () => void;
  /** Renames the selected group (optimistic + ``update_group`` sync). */
  renameGroup: (name: string) => void;
  /** Updates the selected group's description (optimistic + ``update_group`` sync). */
  updateDescription: (description: string) => void;
  /** Removes a member from the selected group (optimistic + ``group_members`` sync). */
  removeMember: (memberId: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves a member node ID to its display name.
 *
 * Group members reference flat workspace object IDs (Finding 1/2):
 * systems, containers and components are all delivered top-level in
 * ``workspace.objects``; people live in ``workspace.people``.
 * Falls back to the raw ID when unknown.
 */
function resolveMemberName(workspace: Workspace, memberId: string): string {
  const object = workspace.objects?.find((obj) => obj.id === memberId);
  if (object) return object.name;

  const person = workspace.people?.find((p) => p.id === memberId);
  if (person) return person.name;

  return memberId;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Business-logic hook for the GroupDetailsPanel (#2279).
 *
 * Owns the selected-group state (parallel to the viewer's ``objectId``),
 * resolves the group plus member names from ``workspace.groups``, and
 * exposes optimistic mutation handlers backed by the sync service:
 * ``renameGroup``/``updateDescription`` → ``update_group`` (PUT /groups/{id}),
 * ``removeMember`` → ``group_members`` with ``remove`` (PUT /groups/{id}/members).
 */
export function useGroupDetail(): UseGroupDetailResult {
  const [groupId, setGroupId] = useState<string | null>(null);
  const { workspace, updateWorkspace } = useWorkspace();

  const group = useMemo(() => {
    if (!groupId || !workspace) return null;
    return workspace.groups?.find((g) => g.id === groupId) ?? null;
  }, [groupId, workspace]);

  const members = useMemo(() => {
    if (!group || !workspace) return [];
    return (group.members ?? []).map((memberId) => ({
      id: memberId,
      name: resolveMemberName(workspace, memberId),
    }));
  }, [group, workspace]);

  const selectGroup = useCallback((id: string) => {
    setGroupId(id);
  }, []);

  const close = useCallback(() => {
    setGroupId(null);
  }, []);

  // Escape key closes the panel (analog useDetailPanel)
  useEffect(() => {
    if (!groupId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGroupId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [groupId]);

  const queueUpdateGroup = useCallback(
    (payload: { name?: string; description?: string }) => {
      if (!groupId) return;
      useVisceraStore.getState().queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: groupId,
        action: 'update_group',
        payload,
        retryCount: 0,
        status: 'pending',
      });
    },
    [groupId],
  );

  const renameGroup = useCallback(
    (name: string) => {
      if (!groupId || !workspace) return;
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const store = useVisceraStore.getState();

      // Optimistic: update the group DiagramNode label on the canvas
      const groupNode = store.nodes.find((n) => n.id === groupId);
      if (groupNode) {
        store.updateNode(groupId, { ...groupNode.data, name: trimmedName });
      }

      // Optimistic: update workspace.groups (visible after reload via #2274 path)
      const updatedGroups = (workspace.groups ?? []).map((g) =>
        g.id === groupId ? { ...g, name: trimmedName } : g,
      );
      updateWorkspace({ ...workspace, groups: updatedGroups });

      queueUpdateGroup({ name: trimmedName });
    },
    [groupId, workspace, updateWorkspace, queueUpdateGroup],
  );

  const updateDescription = useCallback(
    (description: string) => {
      if (!groupId || !workspace) return;

      // Optimistic: update workspace.groups (visible after reload via #2274 path)
      const updatedGroups = (workspace.groups ?? []).map((g) =>
        g.id === groupId ? { ...g, description } : g,
      );
      updateWorkspace({ ...workspace, groups: updatedGroups });

      queueUpdateGroup({ description });
    },
    [groupId, workspace, updateWorkspace, queueUpdateGroup],
  );

  const removeMember = useCallback(
    (memberId: string) => {
      if (!groupId || !workspace) return;
      const groupEntry = workspace.groups?.find((g) => g.id === groupId);
      if (!groupEntry || !(groupEntry.members ?? []).includes(memberId)) return;

      // Optimistic: member leaves the boundary — the viewer re-derives
      // parentId/extent from workspace.groups on the next node build.
      const updatedGroups = (workspace.groups ?? []).map((g) =>
        g.id === groupId
          ? { ...g, members: (g.members ?? []).filter((m) => m !== memberId) }
          : g,
      );
      updateWorkspace({ ...workspace, groups: updatedGroups });

      // Enqueue API sync (PUT /groups/{id}/members with remove)
      useVisceraStore.getState().queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: memberId,
        action: 'group_members',
        payload: { groupId, remove: [memberId] },
        retryCount: 0,
        status: 'pending',
      });
    },
    [groupId, workspace, updateWorkspace],
  );

  return {
    groupId,
    group,
    members,
    selectGroup,
    close,
    renameGroup,
    updateDescription,
    removeMember,
  };
}

/**
 * dnd/types.ts – Shared types for the Viscera DnD command system (#2295).
 *
 * Commands are plain objects with a canExecute guard and a synchronous
 * execute function (command pattern, analog to fbf/dedup dnd commands).
 * The context is pre-computed by VisceraDndContext on drag end.
 */

import type { Group, Workspace } from '../../core/workspaceSchema';

/** Draggable payloads — the discriminator separates card and group drags. */
export interface CardDragData {
  dndType: 'card';
}

export interface GroupDragData {
  dndType: 'group';
  /** Group bounds in flow units — persisted with the move (#2293). */
  width: number;
  height: number;
}

/** Data attached to group droppables — discriminates from other droppables. */
export interface GroupDropData {
  kind: 'group';
  groupId: string;
}

/** A single DnD operation with a guard and an execute function. */
export interface VisceraDndCommand {
  id: string;
  canExecute: (ctx: VisceraDndCommandContext) => boolean;
  execute: (ctx: VisceraDndCommandContext) => void;
}

/**
 * Context passed to every Viscera DnD command.
 *
 * Commands are executed synchronously inside the dnd-kit drag-end handler —
 * no async API calls. Persistence runs through the sync queue.
 */
export interface VisceraDndCommandContext {
  /** ID of the dragged card node. */
  nodeId: string;
  /** Group the node belonged to at drag start (from ``workspace.groups`` members). */
  originGroupId: string | null;
  /** Group the card was dropped on (``GroupDropData.groupId``), null on free canvas. */
  targetGroupId: string | null;
  /** Current workspace snapshot at drag end — source of truth for membership. */
  workspace: Workspace | null;
  /** Optimistically replaces the workspace (provider state). */
  updateWorkspace: (workspace: Workspace) => void;
}

export type VisceraDragData = CardDragData | GroupDragData;

/** Adds or removes ``nodeId`` in the members list of ``groupId`` — returns a new groups array. */
export function updateGroupMembers(
  groups: Group[],
  groupId: string,
  nodeId: string,
  mode: 'add' | 'remove',
): Group[] {
  return groups.map((group) => {
    if (group.id !== groupId) return group;
    const members = new Set(group.members ?? []);
    if (mode === 'add') {
      members.add(nodeId);
    } else {
      members.delete(nodeId);
    }
    return { ...group, members: [...members] };
  });
}

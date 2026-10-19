/**
 * assignToMaster – Drop on SP2 master row (no zone, masterId present).
 *
 * Guard: masterId defined, not self-drop (single only).
 * Action: doBulkAction('assign', ids, masterId).
 * SP3→SP2 re-assign: preserves the original pinned master so the user
 * can continue working with the remaining slaves.
 */

import { useDedupStore } from '../store/dedupStore';

import type { DnDCommand } from '../utils/dndTypes';

export const assignToMaster: DnDCommand = {
  id: 'assignToMaster',
  canExecute: (ctx) => {
    const masterId = ctx.over.masterId;
    if (masterId === undefined) return false;
    // No-op: dropping slave back on its own master (single only)
    if (!ctx.isBulk && ctx.active.currentMasterId === masterId) return false;
    return true;
  },
  execute: async (ctx) => {
    const masterId = ctx.over.masterId!;
    // SP3→SP2 re-assign: doBulkAction pins the target master, but we
    // want to keep the original pinned master so the user can continue
    // re-assigning other slaves from the same group.
    const isReassign = ctx.active.currentMasterId != null;
    const prevPinned = useDedupStore.getState().pinnedItem;
    await ctx.store.doBulkAction('assign', ctx.ids, masterId);
    if (isReassign && prevPinned) {
      useDedupStore.setState({ pinnedItem: prevPinned });
    }
  },
};

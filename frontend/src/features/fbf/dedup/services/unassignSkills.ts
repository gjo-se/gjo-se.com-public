/**
 * unassignSkills – Drop on unassign zone.
 *
 * Guard: zone === 'unassign'. Single no-op if no current master.
 * Action: doBulkAction('unassign', ids).
 */

import type { DnDCommand } from '../utils/dndTypes';

export const unassignSkills: DnDCommand = {
  id: 'unassignSkills',
  canExecute: (ctx) => {
    if (ctx.over.zone !== 'unassign') return false;
    // No-op: single card without master
    if (!ctx.isBulk && ctx.active.currentMasterId === null) return false;
    return true;
  },
  execute: async (ctx) => {
    await ctx.store.doBulkAction('unassign', ctx.ids);
  },
};

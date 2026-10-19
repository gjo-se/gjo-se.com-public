/**
 * assignToSuggestion – Drop on suggestion row (zone = suggestion, masterId present).
 *
 * Guard: zone === 'suggestion', masterId defined. No-op if self-assign (single).
 * Action: bulk → doBulkAction('assign', ids, masterId), single → doAssignSlave(id, masterId).
 */

import type { DnDCommand } from '../utils/dndTypes';

export const assignToSuggestion: DnDCommand = {
  id: 'assignToSuggestion',
  canExecute: (ctx) => {
    if (ctx.over.zone !== 'suggestion') return false;
    if (ctx.over.masterId === undefined) return false;
    if (!ctx.isBulk && ctx.active.currentMasterId === ctx.over.masterId) return false;
    return true;
  },
  execute: async (ctx) => {
    const masterId = ctx.over.masterId!;
    if (ctx.isBulk) {
      await ctx.store.doBulkAction('assign', ctx.ids, masterId);
    } else {
      await ctx.store.doAssignSlave(ctx.active.slaveId, masterId);
    }
  },
};

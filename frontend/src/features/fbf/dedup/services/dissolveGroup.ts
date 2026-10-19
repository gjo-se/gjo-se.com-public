/**
 * dissolveGroup – Drop on SP1 column area (zone = dissolve-group).
 *
 * Guard: zone === 'dissolve-group', aliasCount > 0.
 * Single: doDissolveGroup(masterId).
 * Bulk: doBulkDissolveGroups(ids) when multiple masters are selected.
 */

import type { DnDCommand } from '../utils/dndTypes';

export const dissolveGroup: DnDCommand = {
  id: 'dissolveGroup',
  canExecute: (ctx) =>
    ctx.over.zone === 'dissolve-group' && (ctx.isBulk || (ctx.active.aliasCount ?? 0) > 0),
  execute: async (ctx) => {
    if (ctx.isBulk) {
      await ctx.store.doBulkDissolveGroups(ctx.ids);
    } else {
      await ctx.store.doDissolveGroup(ctx.active.slaveId);
    }
  },
};

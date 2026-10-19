/**
 * activateAsMaster – Drop on new-master zone.
 *
 * Guard: zone === 'new-master'.
 * Action: bulk → doBulkAction('activate', ids), single → doActivateMaster(id, []).
 */

import type { DnDCommand } from '../utils/dndTypes';

export const activateAsMaster: DnDCommand = {
  id: 'activateAsMaster',
  canExecute: (ctx) => ctx.over.zone === 'new-master',
  execute: async (ctx) => {
    if (ctx.isBulk) {
      await ctx.store.doBulkAction('activate', ctx.ids);
    } else {
      await ctx.store.doActivateMaster(ctx.active.slaveId, []);
    }
  },
};

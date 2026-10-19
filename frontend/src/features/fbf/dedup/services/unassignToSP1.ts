/**
 * unassignToSP1 – Drop SP3 slave card on SP1 column area.
 *
 * Guard: zone === 'dissolve-group' AND source is a slave (currentMasterId != null).
 * Action: doUnassignSkills → canonical_id = NULL, status = pending.
 */

import type { DnDCommand } from '../utils/dndTypes';

export const unassignToSP1: DnDCommand = {
  id: 'unassignToSP1',
  canExecute: (ctx) =>
    ctx.over.zone === 'dissolve-group' && ctx.active.currentMasterId != null,
  execute: async (ctx) => {
    await ctx.store.doUnassignSkills(ctx.ids);
  },
};

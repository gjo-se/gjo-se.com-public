/**
 * changeStatus – Drop on status zones (deprecated / pending / active / rejected).
 *
 * Guard: zone is one of deprecated, pending, active, rejected.
 * Action: aliasCount > 0 → doGroupStatus, else doBulkAction(zone, ids).
 */

import type { DnDCommand } from '../utils/dndTypes';

const STATUS_ZONES = ['deprecated', 'pending', 'active', 'rejected'] as const;

export const changeStatus: DnDCommand = {
  id: 'changeStatus',
  canExecute: (ctx) => STATUS_ZONES.includes(ctx.over.zone as typeof STATUS_ZONES[number]),
  execute: async (ctx) => {
    const zone = ctx.over.zone as 'deprecated' | 'pending' | 'active' | 'rejected';
    if (ctx.active.aliasCount && ctx.active.aliasCount > 0) {
      await ctx.store.doGroupStatus(ctx.active.slaveId, zone);
    } else {
      await ctx.store.doBulkAction(zone, ctx.ids);
    }
  },
};

/**
 * Tests: dndTypes – contract
 *
 * Declaration-only module: asserts the command/context contract and the
 * draggable/droppable discriminators at the type level, plus runtime samples.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  DnDCommand,
  DnDCommandContext,
  DraggableData,
  DroppableData,
} from '@src/features/fbf/dedup/utils/dndTypes';

const context: DnDCommandContext = {
  active: { slaveId: 1, currentMasterId: null, name: 'Skill' },
  over: { zone: 'unassign' },
  isBulk: false,
  ids: [1],
  store: {
    doBulkAction: async () => undefined,
    doAssignSlave: async () => undefined,
    doActivateMaster: async () => undefined,
    doUnassignSkills: async () => undefined,
    doGroupStatus: async () => undefined,
    doDissolveGroup: async () => undefined,
    doBulkDissolveGroups: async () => undefined,
    fetchPinnedMasterSlaves: async () => undefined,
  },
  setAutoAdvance: () => undefined,
};

describe('dndTypes – contract', () => {
  it('beschränkt Drop-Zonen auf die bekannten Board-Ziele', () => {
    expectTypeOf<DroppableData['zone']>().toEqualTypeOf<
      | 'deprecated'
      | 'pending'
      | 'active'
      | 'unassign'
      | 'suggestion'
      | 'new-master'
      | 'dissolve-group'
      | 'rejected'
      | undefined
    >();
  });

  it('macht masterId und aliasCount optional', () => {
    const slave: DraggableData = { slaveId: 1, currentMasterId: null, name: 'Slave' };
    const master: DraggableData = {
      slaveId: 2,
      currentMasterId: null,
      name: 'Master',
      aliasCount: 3,
    };

    expect(slave.aliasCount).toBeUndefined();
    expect(master.aliasCount).toBe(3);
  });

  it('verlangt ein Promise aus execute und ein Boolean aus canExecute', () => {
    expectTypeOf<DnDCommand['canExecute']>().toEqualTypeOf<
      (ctx: DnDCommandContext) => boolean
    >();
    expectTypeOf<DnDCommand['execute']>().toEqualTypeOf<
      (ctx: DnDCommandContext) => Promise<void>
    >();
  });

  it('liefert den vorbereiteten Kontext mit IDs und Store', () => {
    expect(context.ids).toEqual([1]);
    expect(context.over.zone).toBe('unassign');
    expect(context.isBulk).toBe(false);
  });
});

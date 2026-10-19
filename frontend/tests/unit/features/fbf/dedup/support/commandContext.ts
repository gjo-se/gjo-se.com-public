/**
 * Test support for the dedup DnD commands.
 *
 * Provides a recording store double at the command/store boundary plus a
 * context builder, so every command test can assert the observable effect
 * on the store instead of coupling to internal structure.
 */
import type {
  DnDCommandContext,
  DraggableData,
  DroppableData,
} from '@src/features/fbf/dedup/utils/dndTypes';

/** One recorded store invocation made by a command under test. */
interface RecordedCommand {
  name: keyof DnDCommandContext['store']
  args: unknown[]
}

/** Fixture handed to a command test: context, its store and the recorded calls. */
export interface CommandFixture {
  ctx: DnDCommandContext
  store: DnDCommandContext['store']
  calls: RecordedCommand[]
}

/**
 * Builds a command context with a recording store.
 *
 * @param over Droppable target data for the context.
 * @param active Overrides for the dragged card data.
 * @param isBulk Whether the interaction is a bulk drop.
 * @returns The context plus the recorded store calls.
 */
export function makeCommandFixture(
  over: DroppableData,
  active: Partial<DraggableData> = {},
  isBulk = false,
): CommandFixture {
  const calls: RecordedCommand[] = [];
  const record = (name: RecordedCommand['name'], args: unknown[]): void => {
    calls.push({ name, args });
  };

  const store: DnDCommandContext['store'] = {
    doBulkAction: async (action, skillIds, masterId) => record('doBulkAction', [action, skillIds, masterId]),
    doAssignSlave: async (skillId, masterId) => record('doAssignSlave', [skillId, masterId]),
    doActivateMaster: async (masterId, slaveIds) => record('doActivateMaster', [masterId, slaveIds]),
    doUnassignSkills: async (skillIds) => record('doUnassignSkills', [skillIds]),
    doGroupStatus: async (masterId, status) => record('doGroupStatus', [masterId, status]),
    doDissolveGroup: async (masterId) => record('doDissolveGroup', [masterId]),
    doBulkDissolveGroups: async (masterIds) => record('doBulkDissolveGroups', [masterIds]),
    fetchPinnedMasterSlaves: async () => record('fetchPinnedMasterSlaves', []),
  };

  return {
    ctx: {
      active: { slaveId: 7, currentMasterId: null, name: 'Slave A', ...active },
      over,
      isBulk,
      ids: [7, 8],
      store,
      setAutoAdvance: () => undefined,
    },
    store,
    calls,
  };
}

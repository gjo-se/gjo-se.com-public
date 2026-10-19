/**
 * dnd/types.ts – Shared types for the DnD command system.
 *
 * Self-contained — no imports from store or api (avoids module graph issues
 * with tsc resolution in freshly created directories).
 */

/** Bulk action type (mirrors api/endpoints/dedup BulkAction). */
type BulkAction = 'assign' | 'activate' | 'deprecated' | 'unassign' | 'pending' | 'active' | 'rejected';

/** A single DnD operation with a guard and an async execute function. */
export interface DnDCommand {
  id: string
  canExecute: (ctx: DnDCommandContext) => boolean
  execute: (ctx: DnDCommandContext) => Promise<void>
}

/**
 * Context passed to every DnD command.
 *
 * Pre-computed by the dispatcher so individual commands don't
 * repeat isBulk / ids derivation.
 */
export interface DnDCommandContext {
  active: DraggableData
  over: DroppableData
  isBulk: boolean
  ids: number[]
    store: DnDCommandStore
    setAutoAdvance: () => void
}

/**
 * Minimal store interface for DnD commands.
 *
 * Structurally compatible with DedupState so no store import is needed.
 */
interface DnDCommandStore {
  doBulkAction: (action: BulkAction, skillIds: number[], masterId?: number) => Promise<void>
  doAssignSlave: (skillId: number, masterId: number) => Promise<void>
  doActivateMaster: (masterId: number, slaveIds: number[]) => Promise<void>
  doUnassignSkills: (skillIds: number[]) => Promise<void>
  doGroupStatus: (masterId: number, status: BulkAction) => Promise<void>
  doDissolveGroup: (masterId: number) => Promise<void>
  doBulkDissolveGroups: (masterIds: number[]) => Promise<void>
  fetchPinnedMasterSlaves: () => Promise<void>
}

/** Data attached to every draggable item. */
export interface DraggableData {
  slaveId: number
  currentMasterId: number | null
  name: string
  /** > 0 when the dragged card is a master with slaves (group-operation trigger). */
  aliasCount?: number
}

/** Data attached to every droppable target. */
export interface DroppableData {
  masterId?: number
  zone?: 'deprecated' | 'pending' | 'active' | 'unassign' | 'suggestion' | 'new-master' | 'dissolve-group' | 'rejected'
}

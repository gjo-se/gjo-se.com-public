/**
 * types.ts – Shared types for the dedup store.
 */

import type { BoardColumn, BoardItem, BoardPage, BulkAction, SimilarMasterItem, SimilarSkillOut } from '../services/dedup';

export interface DedupFilters {
  q: string
  status: string
  size: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface DedupState {
  masters: BoardPage | null
  slaves: BoardPage | null
  pinnedItem: BoardItem | null
  pinnedMasterSlaves: BoardPage | null
  suggestions: SimilarSkillOut[] | null
  suggestionsLoading: boolean
  filters: DedupFilters
  loading: boolean
  error: string | null

  // Per-column selection (board-spec §2.2 — jede Spalte eigene Selection)
  sp1SelectedIds: Set<number>
  sp1SelectedItems: BoardItem[]
  sp1Anchor: BoardItem | null
  sp2SelectedIds: Set<number>
  sp2SelectedItems: BoardItem[]
  sp2Anchor: BoardItem | null
  sp3SelectedIds: Set<number>
  sp3SelectedItems: BoardItem[]
  sp3Anchor: BoardItem | null

  dragActive: boolean
  similarMasters: SimilarMasterItem[] | null
  similarSlaves: SimilarMasterItem[] | null
  similarLoading: boolean
  skippedSlaveIds: number[]
  autoAdvance: boolean
  slaveStatus: string
  slaveQ: string
  pinnedSlavesStatus: string
  pinnedSlavesQ: string

  fetchMasters: () => Promise<void>
  fetchSlaves: () => Promise<void>
  loadMoreMasters: () => Promise<void>
  loadMoreSlaves: () => Promise<void>
  fetchPinnedMasterSlaves: () => Promise<void>
  fetchSuggestions: (slaveId: number) => Promise<void>
  loadMorePinnedMasterSlaves: () => Promise<void>
  setFilter: (patch: Partial<DedupFilters>) => void
  setSlaveStatus: (status: string) => void
  setSlaveQ: (q: string) => void
  setPinnedSlavesStatus: (status: string) => void
  setPinnedSlavesQ: (q: string) => void
  pinItem: (item: BoardItem) => void
  unpinItem: () => void
  selectCard: (column: BoardColumn, item: BoardItem, mods: SelectModifiers, visibleItems?: BoardItem[]) => void
  refreshSimilarMasters: (refreshNeighbors?: boolean) => void
  clearSelection: (column?: BoardColumn) => void
  skipCurrentSlave: () => void
  nextUnassignedSlave: (skipped?: number[]) => BoardItem | null
  tryAutoAdvance: () => void
  doAssignSlave: (skillId: number, masterId: number) => Promise<void>
  doActivateMaster: (masterId: number, slaveIds: number[]) => Promise<void>
  doArchiveSkills: (skillIds: number[]) => Promise<void>
  doUnassignSkills: (skillIds: number[]) => Promise<void>
  doBulkAction: (action: BulkAction, skillIds: number[], masterId?: number) => Promise<void>
  doRenameSkill: (skillId: number, name: string) => Promise<void>
  doGroupStatus: (masterId: number, status: BulkAction) => Promise<void>
  doDissolveGroup: (masterId: number) => Promise<void>
  doBulkDissolveGroups: (masterIds: number[]) => Promise<void>
}

export interface SelectModifiers {
  meta: boolean
  shift: boolean
}

export const DEFAULT_FILTERS: DedupFilters = {
  q: '',
  status: 'pending',
  size: 20,
};

export const AUTO_ADVANCE_DELAY_MS = 500;
export const SIMILAR_REFRESH_DEBOUNCE_MS = 300;

/**
 *
 */
export function appendPage(current: BoardPage | null, next: BoardPage): BoardPage {
  const existing = current?.items ?? [];
  const seen = new Set(existing.map((i) => i.id));
  return { ...next, items: [...existing, ...next.items.filter((i) => !seen.has(i.id))] };
}

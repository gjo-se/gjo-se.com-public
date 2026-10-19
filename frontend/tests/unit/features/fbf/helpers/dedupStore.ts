/**
 * Dedup-store fixtures and reset helper.
 *
 * Resets the data part of the public Zustand state between tests while the
 * slice actions stay in place.
 */

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { DEFAULT_FILTERS } from '@src/features/fbf/dedup/store/types';

import type { BoardItem, BoardPage } from '@src/features/fbf/dedup/services/dedup';

/** Restores the initial data state of the combined dedup store. */
export function resetDedupStore(): void {
  useDedupStore.setState({
    masters: null,
    slaves: null,
    pinnedItem: null,
    pinnedMasterSlaves: null,
    suggestions: null,
    suggestionsLoading: false,
    filters: { ...DEFAULT_FILTERS },
    loading: false,
    error: null,
    sp1SelectedIds: new Set<number>(),
    sp1SelectedItems: [],
    sp1Anchor: null,
    sp2SelectedIds: new Set<number>(),
    sp2SelectedItems: [],
    sp2Anchor: null,
    sp3SelectedIds: new Set<number>(),
    sp3SelectedItems: [],
    sp3Anchor: null,
    dragActive: false,
    similarMasters: null,
    similarSlaves: null,
    similarLoading: false,
    skippedSlaveIds: [],
    autoAdvance: false,
    slaveStatus: 'pending',
    slaveQ: '',
    pinnedSlavesStatus: 'pending',
    pinnedSlavesQ: '',
  });
}

/**
 * Builds a deterministic board item.
 *
 * @param overrides Field overrides for the concrete test case.
 * @returns A board item with synthetic values.
 */
export function boardItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: 1,
    name: 'Skill',
    description: null,
    status: 'pending',
    canonical_id: null,
    master_name: null,
    alias_count: 0,
    importance: null,
    level: null,
    level_public: null,
    ...overrides,
  };
}

/**
 * Builds a board page from items.
 *
 * @param items Page items.
 * @param total Total number of rows on the server.
 * @param page Zero-based page index.
 * @param size Page size.
 * @returns A board page.
 */
export function boardPage(
  items: BoardItem[],
  total = items.length,
  page = 0,
  size = 20,
): BoardPage {
  return { items, total, page, size, checked_masters: 0, total_masters: 0 };
}

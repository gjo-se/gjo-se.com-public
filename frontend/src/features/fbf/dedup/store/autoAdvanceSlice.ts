/**
 * autoAdvanceSlice.ts – Auto-advance and skip logic.
 */

import { AUTO_ADVANCE_DELAY_MS } from './types';

import type { DedupState } from './types';
import type { BoardItem } from '../services/dedup';
import type { StateCreator } from 'zustand';


export interface AutoAdvanceSlice {
  skippedSlaveIds: number[]
  autoAdvance: boolean
  skipCurrentSlave: () => void
  nextUnassignedSlave: (skipped?: number[]) => BoardItem | null
  tryAutoAdvance: () => void
}

export const createAutoAdvanceSlice: StateCreator<DedupState, [], [], AutoAdvanceSlice> = (set, get) => ({
  skippedSlaveIds: [],
  autoAdvance: false,

  skipCurrentSlave: () => {
    const { pinnedItem, skippedSlaveIds } = get();
    if (!pinnedItem) return;
    const updatedSkipped = [...skippedSlaveIds, pinnedItem.id];
    set({ skippedSlaveIds: updatedSkipped });
    const next = get().nextUnassignedSlave(updatedSkipped);
    if (next) {
      get().pinItem(next);
    } else {
      set({ pinnedItem: null, suggestions: null, suggestionsLoading: false });
    }
  },

  nextUnassignedSlave: (skipped?: number[]) => {
    const { slaves, skippedSlaveIds } = get();
    const skippedIds = skipped ?? skippedSlaveIds;
    if (!slaves) return null;
    return slaves.items.find(
      (item) => item.canonical_id === null && !skippedIds.includes(item.id),
    ) ?? null;
  },

  tryAutoAdvance: () => {
    const { autoAdvance } = get();
    if (!autoAdvance) return;
    set({ autoAdvance: false });
    setTimeout(() => {
      const next = get().nextUnassignedSlave();
      if (next) {
        get().pinItem(next);
      } else {
        set({ pinnedItem: null, suggestions: null, suggestionsLoading: false });
      }
    }, AUTO_ADVANCE_DELAY_MS);
  },
});

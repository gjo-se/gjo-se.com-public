/**
 * pinningSlice.ts – Pinned item state — pure, no side effects.
 *
 * fetchPinnedMasterSlaves / fetchSuggestions are called reactively
 * by the column components via useEffect, not from here.
 */

import type { DedupState } from './types';
import type { BoardItem } from '../services/dedup';
import type { StateCreator } from 'zustand';

export interface PinningSlice {
  pinnedItem: BoardItem | null
  pinItem: (item: BoardItem) => void
  unpinItem: () => void
}

export const createPinningSlice: StateCreator<DedupState, [], [], PinningSlice> = (set, _get) => ({
  pinnedItem: null,

  pinItem: (item) => {
    set({ pinnedItem: item });
  },

  unpinItem: () => {
    set({ pinnedItem: null, pinnedMasterSlaves: null, suggestions: null, suggestionsLoading: false });
  },
});

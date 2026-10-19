/**
 * filtersSlice.ts – Filter state for all three columns.
 */

import { DEFAULT_FILTERS } from './types';

import type { DedupState, DedupFilters } from './types';
import type { StateCreator } from 'zustand';

export interface FiltersSlice {
  filters: DedupFilters
  slaveStatus: string
  slaveQ: string
  pinnedSlavesStatus: string
  pinnedSlavesQ: string
  setFilter: (patch: Partial<DedupFilters>) => void
  setSlaveStatus: (status: string) => void
  setSlaveQ: (q: string) => void
  setPinnedSlavesStatus: (status: string) => void
  setPinnedSlavesQ: (q: string) => void
}

export const createFiltersSlice: StateCreator<DedupState, [], [], FiltersSlice> = (set, get) => ({
  filters: { ...DEFAULT_FILTERS },
  slaveStatus: 'pending',
  slaveQ: '',
  pinnedSlavesStatus: 'pending',
  pinnedSlavesQ: '',

  setFilter: (patch) => {
    set((state) => ({
      filters: { ...state.filters, ...patch },
    }));
    get().refreshSimilarMasters();
  },

  setSlaveStatus: (status) => {
    set({ slaveStatus: status });
    void get().fetchSlaves();
    get().refreshSimilarMasters(true);
  },

  setSlaveQ: (q) => {
    set({ slaveQ: q });
    get().refreshSimilarMasters(true);
  },

  setPinnedSlavesStatus: (status) => {
    set({ pinnedSlavesStatus: status });
    void get().fetchPinnedMasterSlaves();
  },

  setPinnedSlavesQ: (q) => {
    set({ pinnedSlavesQ: q });
    void get().fetchPinnedMasterSlaves();
  },
});

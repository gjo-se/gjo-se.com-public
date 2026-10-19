/**
 * columnsSlice.ts – Board column data and fetch logic.
 */

import { fetchBoard, fetchSuggestions as apiFetchSuggestions, type BoardPage, type SimilarSkillOut } from '../services/dedup';

import { appendPage } from './types';

import type { DedupState } from './types';
import type { StateCreator } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ColumnsSlice {
  masters: BoardPage | null
  slaves: BoardPage | null
  pinnedMasterSlaves: BoardPage | null
  suggestions: SimilarSkillOut[] | null
  suggestionsLoading: boolean
  loading: boolean
  error: string | null
  fetchMasters: () => Promise<void>
  fetchSlaves: () => Promise<void>
  loadMoreMasters: () => Promise<void>
  loadMoreSlaves: () => Promise<void>
  fetchPinnedMasterSlaves: () => Promise<void>
  loadMorePinnedMasterSlaves: () => Promise<void>
  fetchSuggestions: (slaveId: number) => Promise<void>
}
type GetFn = Parameters<StateCreator<DedupState, [], [], unknown>>[1];

type SetFn = Parameters<StateCreator<DedupState, [], [], unknown>>[0];

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generic load-more for any board column.
 *
 * Reads the current page from `pageKey`, checks if there's more to load,
 * builds the next-page fetch params, and appends the result.
 */
async function loadMoreBoardPage(
  get: GetFn,
  set: SetFn,
  pageKey: 'masters' | 'slaves' | 'pinnedMasterSlaves',
  pageSize: number,
  buildParams: (nextPage: number) => Parameters<typeof fetchBoard>[0],
  errorMsg: string,
): Promise<void> {
  const state = get();
  if (state.loading) return;
  const current = state[pageKey] as BoardPage | null;
  if (!current || current.items.length >= current.total) return;
  const nextPage = Math.floor(current.items.length / pageSize);
  set({ loading: true, error: null });
  try {
    const page = await fetchBoard(buildParams(nextPage));
    set((s) => ({ [pageKey]: appendPage(s[pageKey] as BoardPage | null, page), loading: false }));
  } catch {
    set({ error: errorMsg, loading: false });
  }
}

// ── Slice ──────────────────────────────────────────────────────────────────

export const createColumnsSlice: StateCreator<DedupState, [], [], ColumnsSlice> = (set, get) => ({
  masters: null,
  slaves: null,
  pinnedMasterSlaves: null,
  suggestions: null,
  suggestionsLoading: false,
  loading: false,
  error: null,

  fetchMasters: async () => {
    const { filters } = get();
    set({ loading: true, error: null });
    try {
      const page = await fetchBoard({ column: 'masters', ...filters, has_slaves: true, page: 0 });
      set({ masters: page, loading: false });
    } catch {
      set({ error: 'Fehler beim Laden der Masters.', loading: false });
    }
  },

  fetchSlaves: async () => {
    const { filters, slaveStatus, slaveQ } = get();
    set({ loading: true, error: null });
    try {
      const page = await fetchBoard({
        column: 'masters', ...filters, q: slaveQ, status: slaveStatus, has_slaves: false, page: 0,
      });
      set({ slaves: page, loading: false });
    } catch {
      set({ error: 'Fehler beim Laden der Masters ohne Slaves.', loading: false });
    }
  },

  loadMoreMasters: () =>
    loadMoreBoardPage(get, set, 'masters', get().filters.size,
      (nextPage) => ({ column: 'masters', ...get().filters, has_slaves: true, page: nextPage }),
      'Fehler beim Nachladen der Masters.'),

  loadMoreSlaves: () =>
    loadMoreBoardPage(get, set, 'slaves', get().filters.size,
      (nextPage) => ({ column: 'masters', ...get().filters, q: get().slaveQ, status: get().slaveStatus, has_slaves: false, page: nextPage }),
      'Fehler beim Nachladen der Masters ohne Slaves.'),

  fetchPinnedMasterSlaves: async () => {
    const { pinnedItem, pinnedSlavesQ, pinnedSlavesStatus } = get();
    if (!pinnedItem || pinnedItem.canonical_id !== null) {
      set({ pinnedMasterSlaves: null });
      return;
    }
    try {
      const page = await fetchBoard({
        column: 'slaves', master_id: pinnedItem.id,
        q: pinnedSlavesQ, status: pinnedSlavesStatus,
        size: 20, sort_by: 'name', sort_order: 'asc', page: 0,
      });
      set({ pinnedMasterSlaves: page });
    } catch {
      set({ error: 'Fehler beim Laden der Aliase.', loading: false });
    }
  },

  loadMorePinnedMasterSlaves: () =>
    loadMoreBoardPage(get, set, 'pinnedMasterSlaves', 20,
      (nextPage) => {
        const s = get();
        return {
          column: 'slaves', master_id: s.pinnedItem!.id,
          q: s.pinnedSlavesQ, status: s.pinnedSlavesStatus,
          size: 20, sort_by: 'name', sort_order: 'asc', page: nextPage,
        };
      },
      'Fehler beim Nachladen der Aliase.'),

  fetchSuggestions: async (slaveId) => {
    set({ suggestionsLoading: true, suggestions: null });
    try {
      const items = await apiFetchSuggestions(slaveId);
      set({ suggestions: items, suggestionsLoading: false });
    } catch {
      set({ suggestions: [], suggestionsLoading: false });
    }
  },
});

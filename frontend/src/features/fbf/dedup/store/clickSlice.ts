/**
 * clickSlice.ts – Per-column card click logic (board-spec §2.2).
 *
 * Each column manages its own selection independently:
 *   SP1 → sp1SelectedIds / sp1Anchor
 *   SP2 → sp2SelectedIds / sp2Anchor
 *   SP3 → sp3SelectedIds / sp3Anchor
 *
 * No lead-column, no peek-guard, no homeColumnOf.
 * Double-click = plain click (no takeover concept).
 */

import type { DedupState, SelectModifiers } from './types';
import type { BoardColumn, BoardItem, SimilarMasterItem } from '../services/dedup';
import type { StateCreator } from 'zustand';

export interface ClickSlice {
  sp1SelectedIds: Set<number>
  sp1SelectedItems: BoardItem[]
  sp1Anchor: BoardItem | null
  sp2SelectedIds: Set<number>
  sp2SelectedItems: BoardItem[]
  sp2Anchor: BoardItem | null
  sp3SelectedIds: Set<number>
  sp3SelectedItems: BoardItem[]
  sp3Anchor: BoardItem | null
  selectCard: (column: BoardColumn, item: BoardItem, mods: SelectModifiers, visibleItems?: BoardItem[]) => void
  clearSelection: (column?: BoardColumn) => void
}

/** Shared logic: apply a modifier click to a per-column selection state. */
function applyClick(
  selIds: Set<number>,
  selItems: BoardItem[],
  item: BoardItem,
  mods: SelectModifiers,
  visibleItems?: BoardItem[],
  prevAnchor?: BoardItem | null,
): { selIds: Set<number>; selItems: BoardItem[]; anchor: BoardItem | null } {
  // Shift-click: select range from anchor to clicked item (board-spec 3.1.7).
  if (mods.shift && visibleItems && visibleItems.length > 0 && prevAnchor) {
    const anchorIdx = visibleItems.findIndex((i) => i.id === prevAnchor.id);
    const clickedIdx = visibleItems.findIndex((i) => i.id === item.id);
    if (anchorIdx !== -1 && clickedIdx !== -1) {
      const start = Math.min(anchorIdx, clickedIdx);
      const end = Math.max(anchorIdx, clickedIdx);
      const rangeItems = visibleItems.slice(start, end + 1);
      return { selIds: new Set(rangeItems.map((i) => i.id)), selItems: rangeItems, anchor: prevAnchor };
    }
    // Anchor or item not in visible list → fall through to plain-click fallback.
  }

  // Cmd/Ctrl-click: toggle single card in multi-selection.
  if (mods.meta) {
    const next = new Set(selIds);
    let nextItems: BoardItem[];
    if (next.has(item.id)) {
      next.delete(item.id);
      nextItems = selItems.filter((i) => i.id !== item.id);
    } else {
      next.add(item.id);
      nextItems = [...selItems, item];
    }
    const newAnchor = next.size > 0 ? item : null;
    return { selIds: next, selItems: nextItems, anchor: newAnchor };
  }

  // Plain click: single selection.
  return { selIds: new Set([item.id]), selItems: [item], anchor: item };
}

export const createClickSlice: StateCreator<DedupState, [], [], ClickSlice> = (set, get) => ({
  sp1SelectedIds: new Set(),
  sp1SelectedItems: [],
  sp1Anchor: null,
  sp2SelectedIds: new Set(),
  sp2SelectedItems: [],
  sp2Anchor: null,
  sp3SelectedIds: new Set(),
  sp3SelectedItems: [],
  sp3Anchor: null,

  selectCard: (column, item, mods, visibleItems) => {
    const {
      sp1SelectedIds, sp1SelectedItems, sp1Anchor: prevSp1Anchor,
      sp2SelectedIds, sp2SelectedItems, sp2Anchor: prevSp2Anchor,
      sp3SelectedIds, sp3SelectedItems, sp3Anchor: prevSp3Anchor,
    } = get();

    if (column === 'masters') {
      const { selIds, selItems, anchor: newAnchor } = applyClick(
        sp2SelectedIds, sp2SelectedItems, item, mods, visibleItems, prevSp2Anchor,
      );
      // Cmd/Shift-click: freeze anchor to preserve similarity sort order (board-spec 3.1.5/3.1.8).
      const freeze = (mods.meta || mods.shift) && prevSp2Anchor && selIds.size > 0;
      const anchor = freeze ? prevSp2Anchor : newAnchor;
      set({ sp2SelectedIds: selIds, sp2SelectedItems: selItems, sp2Anchor: anchor });
    } else if (column === 'pinned') {
      const { selIds, selItems, anchor: newAnchor } = applyClick(
        sp3SelectedIds, sp3SelectedItems, item, mods, visibleItems, prevSp3Anchor,
      );
      // Cmd/Shift-click: freeze anchor (board-spec 3.1.6/3.1.9).
      const freeze = (mods.meta || mods.shift) && prevSp3Anchor && selIds.size > 0;
      const anchor = freeze ? prevSp3Anchor : newAnchor;
      set({ sp3SelectedIds: selIds, sp3SelectedItems: selItems, sp3Anchor: anchor });
    } else {
      const { selIds, selItems, anchor: newAnchor } = applyClick(
        sp1SelectedIds, sp1SelectedItems, item, mods, visibleItems, prevSp1Anchor,
      );
      // Cmd/Shift-click: freeze anchor to preserve similarity sort order (board-spec 3.1.4/3.1.7).
      const freeze = (mods.meta || mods.shift) && prevSp1Anchor && selIds.size > 0;
      const anchor = freeze ? prevSp1Anchor : newAnchor;
      set({ sp1SelectedIds: selIds, sp1SelectedItems: selItems, sp1Anchor: anchor });
    }
  },

  clearSelection: (column) => {
    if (column === 'masters') {
      set({ sp2SelectedIds: new Set(), sp2SelectedItems: [], sp2Anchor: null });
    } else if (column === 'slaves') {
      set({ sp1SelectedIds: new Set(), sp1SelectedItems: [], sp1Anchor: null });
    } else if (column === 'pinned') {
      set({ sp3SelectedIds: new Set(), sp3SelectedItems: [], sp3Anchor: null });
    } else {
      set({
        sp1SelectedIds: new Set(), sp1SelectedItems: [], sp1Anchor: null,
        sp2SelectedIds: new Set(), sp2SelectedItems: [], sp2Anchor: null,
        sp3SelectedIds: new Set(), sp3SelectedItems: [], sp3Anchor: null,
        similarMasters: null,
        similarSlaves: null,
        similarLoading: false,
      });
    }
  },
});

/** SP2 display list: selected items on top, ranked list below (dedup). */
export function buildMastersDisplay(
  selectedItems: BoardItem[],
  similarMasters: SimilarMasterItem[] | null,
): BoardItem[] {
  if (similarMasters === null) return [];
  const selectedIds = new Set(selectedItems.map((i) => i.id));
  return [...selectedItems, ...similarMasters.filter((i) => !selectedIds.has(i.id))];
}

/** SP1 display list: selected items on top, neighbors below. */
export function buildSlavesDisplay(
  selectedItems: BoardItem[],
  similarSlaves: SimilarMasterItem[] | null,
): BoardItem[] {
  if (similarSlaves === null) return [];
  const selectedIds = new Set(selectedItems.map((i) => i.id));
  return [...selectedItems, ...similarSlaves.filter((i) => !selectedIds.has(i.id))];
}

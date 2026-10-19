/**
 * similaritySlice.ts – Vector similarity ranking.
 *
 * Called reactively by column components (useEffect on selection changes).
 * Freeze: when a SP2 master is pinned, SP2 stays frozen (only SP1 neighbors
 * are fetched). Without a pinned master, both columns are sorted.
 */

import { fetchSimilarMasters, type SimilarMasterItem } from '../services/dedup';

import { SIMILAR_REFRESH_DEBOUNCE_MS } from './types';

import type { DedupState } from './types';
import type { StateCreator } from 'zustand';

export interface SimilaritySlice {
  similarMasters: SimilarMasterItem[] | null
  similarSlaves: SimilarMasterItem[] | null
  similarLoading: boolean
  refreshSimilarMasters: (refreshNeighbors?: boolean) => void
}

let similarRefreshTimer: ReturnType<typeof setTimeout> | undefined;

export const createSimilaritySlice: StateCreator<DedupState, [], [], SimilaritySlice> = (set, get) => ({
  similarMasters: null,
  similarSlaves: null,
  similarLoading: false,

  refreshSimilarMasters: (refreshNeighbors = false) => {
    if (similarRefreshTimer) clearTimeout(similarRefreshTimer);

    const { sp1SelectedIds, sp1Anchor, sp2SelectedIds, pinnedItem } = get();
    const hasSp1Selection = sp1SelectedIds.size > 0 && sp1Anchor !== null;
    const hasSp2Selection = sp2SelectedIds.size > 0;
    const isFrozen = pinnedItem !== null;

    if (!hasSp1Selection && !hasSp2Selection) {
      set({ similarMasters: null, similarSlaves: null, similarLoading: false });
      return;
    }

    set({ similarLoading: true });
    similarRefreshTimer = setTimeout(() => {
      const s = get();
      const needNeighbors = s.similarSlaves === null || refreshNeighbors;

      // UC2-Freeze: SP2-Master gepinnt → SP2 frozen, nur SP1-Nachbarn.
      if (isFrozen && s.sp1Anchor) {
        const promise = needNeighbors
          ? fetchSimilarMasters([s.sp1Anchor.id], s.slaveQ, s.slaveStatus, false)
          : Promise.resolve(null);
        promise
          .then((neighbors) => {
            set({
              similarLoading: false,
              ...(neighbors !== null ? { similarSlaves: neighbors } : {}),
            });
          })
          .catch(() => {
            set({ similarSlaves: [], similarLoading: false });
          });
        return;
      }

      // Normal mode: both columns sort by anchor similarity.
      const refAnchor = s.sp1Anchor ?? s.sp2Anchor;
      if (!refAnchor) {
        set({ similarMasters: null, similarSlaves: null, similarLoading: false });
        return;
      }
      const refId = [refAnchor.id];

      Promise.all([
        fetchSimilarMasters(refId, s.filters.q, s.filters.status),
        needNeighbors
          ? fetchSimilarMasters(refId, s.slaveQ, s.slaveStatus, false)
          : Promise.resolve(null),
      ])
        .then(([mixed, neighbors]) => {
          set({
            similarMasters: mixed,
            similarLoading: false,
            ...(neighbors !== null ? { similarSlaves: neighbors } : {}),
          });
        })
        .catch(() => {
          set({
            similarMasters: [],
            similarSlaves: [],
            similarLoading: false,
            error: 'Fehler beim Laden der ähnlichen Skills.',
          });
        });
    }, SIMILAR_REFRESH_DEBOUNCE_MS);
  },
});

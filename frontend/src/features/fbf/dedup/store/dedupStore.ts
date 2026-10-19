/**
 * index.ts – Dedup store combining all Zustand slices.
 *
 * Replaces the monolithic useDedupStore.ts.  Every slice is a
 * StateCreator that contributes a partial DedupState.  The combined
 * store exposes exactly the same selector API so no consumer changes
 * are needed.
 */

import { create } from 'zustand';

import { createAutoAdvanceSlice } from './autoAdvanceSlice';
import { createClickSlice } from './clickSlice';
import { createColumnsSlice } from './columnsSlice';
import { createDndSlice } from './dndSlice';
import { createFiltersSlice } from './filtersSlice';
import { createMutationsSlice } from './mutationsSlice';
import { createPinningSlice } from './pinningSlice';
import { createSimilaritySlice } from './similaritySlice';

import type { DedupState } from './types';

export type { DedupState, SelectModifiers } from './types';
export { buildMastersDisplay, buildSlavesDisplay } from './clickSlice';

export const useDedupStore = create<DedupState>()((...a) => ({
  ...createColumnsSlice(...a),
  ...createClickSlice(...a),
  ...createDndSlice(...a),
  ...createFiltersSlice(...a),
  ...createSimilaritySlice(...a),
  ...createPinningSlice(...a),
  ...createMutationsSlice(...a),
  ...createAutoAdvanceSlice(...a),
}));

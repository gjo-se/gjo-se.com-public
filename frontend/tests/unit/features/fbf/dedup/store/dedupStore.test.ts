/**
 * Tests: dedupStore
 *
 * Verifies the composed store contract: every slice contributes its state and
 * actions, the initial data state is deterministic, and the re-exported display
 * builders stay reachable from the store module.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildMastersDisplay,
  buildSlavesDisplay,
  useDedupStore,
} from '@src/features/fbf/dedup/store/dedupStore';
import { DEFAULT_FILTERS } from '@src/features/fbf/dedup/store/types';

import { boardItem, resetDedupStore } from '../../helpers/dedupStore';

const store = () => useDedupStore.getState();

beforeEach(() => {
  resetDedupStore();
});

describe('dedupStore – composition', () => {
  it('exposes the initial state of every slice', () => {
    expect(store().masters).toBeNull();
    expect(store().filters).toEqual(DEFAULT_FILTERS);
    expect(store().dragActive).toBe(false);
    expect(store().autoAdvance).toBe(false);
    expect(store().pinnedItem).toBeNull();
    expect(store().similarMasters).toBeNull();
    expect(store().sp1SelectedIds.size).toBe(0);
  });

  it('exposes the actions of every slice', () => {
    expect(typeof store().fetchMasters).toBe('function');
    expect(typeof store().selectCard).toBe('function');
    expect(typeof store().setFilter).toBe('function');
    expect(typeof store().refreshSimilarMasters).toBe('function');
    expect(typeof store().pinItem).toBe('function');
    expect(typeof store().doAssignSlave).toBe('function');
    expect(typeof store().tryAutoAdvance).toBe('function');
  });

  it('keeps independent slices intact when one slice mutates', () => {
    store().pinItem(boardItem({ id: 3, name: 'Pinned' }));

    expect(store().pinnedItem?.name).toBe('Pinned');
    expect(store().dragActive).toBe(false);
    expect(store().filters).toEqual(DEFAULT_FILTERS);
  });

  it('re-exports the display builders', () => {
    const selected = boardItem({ id: 1 });
    const ranked = { ...boardItem({ id: 2 }), similarity: 0.4, best_member_name: null, best_member_similarity: null };

    expect(buildMastersDisplay([selected], [ranked]).map((item) => item.id)).toEqual([1, 2]);
    expect(buildSlavesDisplay([selected], [ranked]).map((item) => item.id)).toEqual([1, 2]);
  });
});

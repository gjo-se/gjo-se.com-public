/**
 * Tests: dndSlice
 *
 * The drag flag is data-only state; the store contract is that it starts
 * inactive and is not clobbered by unrelated slice actions.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { boardItem, resetDedupStore } from '../../helpers/dedupStore';

const store = () => useDedupStore.getState();

beforeEach(() => {
  resetDedupStore();
});

describe('dndSlice', () => {
  it('exposes an inactive drag flag on the initial store state', () => {
    expect(store().dragActive).toBe(false);
  });

  it('stays inactive while other slices mutate', () => {
    store().pinItem(boardItem({ id: 1 }));
    store().selectCard('slaves', boardItem({ id: 2 }), { meta: false, shift: false });

    expect(store().dragActive).toBe(false);
  });
});

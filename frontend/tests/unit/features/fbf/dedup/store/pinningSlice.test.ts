/**
 * Tests: pinningSlice
 *
 * Verifies pinning and unpinning through the public store, including the
 * dependent alias/suggestion state that unpinning must clear.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { boardItem, boardPage, resetDedupStore } from '../../helpers/dedupStore';

const store = () => useDedupStore.getState();

beforeEach(() => {
  resetDedupStore();
});

describe('pinningSlice', () => {
  it('pins the given item', () => {
    const item = boardItem({ id: 7, name: 'Pinned' });

    store().pinItem(item);

    expect(store().pinnedItem).toEqual(item);
  });

  it('replaces an existing pin', () => {
    store().pinItem(boardItem({ id: 1 }));
    store().pinItem(boardItem({ id: 2, name: 'Second' }));

    expect(store().pinnedItem?.id).toBe(2);
    expect(store().pinnedItem?.name).toBe('Second');
  });

  it('clears the pin, aliases and suggestions on unpin', () => {
    useDedupStore.setState({
      pinnedItem: boardItem({ id: 1 }),
      pinnedMasterSlaves: boardPage([boardItem({ id: 2 })]),
      suggestions: [{ id: 3, name: 'Suggestion', status: 'active', similarity: 0.7 }],
      suggestionsLoading: true,
    });

    store().unpinItem();

    expect(store().pinnedItem).toBeNull();
    expect(store().pinnedMasterSlaves).toBeNull();
    expect(store().suggestions).toBeNull();
    expect(store().suggestionsLoading).toBe(false);
  });

  it('keeps unpin idempotent', () => {
    store().unpinItem();
    store().unpinItem();

    expect(store().pinnedItem).toBeNull();
  });
});

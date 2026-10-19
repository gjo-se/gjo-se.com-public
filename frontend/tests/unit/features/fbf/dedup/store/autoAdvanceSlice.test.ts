/**
 * Tests: autoAdvanceSlice
 *
 * Verifies the next-unassigned selection, skip-with-fallback, and the
 * delayed auto-advance — all through the public store actions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { AUTO_ADVANCE_DELAY_MS } from '@src/features/fbf/dedup/store/types';

import { boardItem, boardPage, resetDedupStore } from '../../helpers/dedupStore';

const store = () => useDedupStore.getState();

beforeEach(() => {
  resetDedupStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('autoAdvanceSlice – nextUnassignedSlave', () => {
  it('returns the first unassigned, non-skipped slave', () => {
    useDedupStore.setState({
      slaves: boardPage([
        boardItem({ id: 1, canonical_id: 10 }),
        boardItem({ id: 2, canonical_id: null }),
        boardItem({ id: 3, canonical_id: null }),
      ]),
    });

    expect(store().nextUnassignedSlave([3])?.id).toBe(2);
  });

  it('returns null when no slave page is loaded', () => {
    expect(store().nextUnassignedSlave()).toBeNull();
  });

  it('returns null when every slave is assigned or skipped', () => {
    useDedupStore.setState({
      slaves: boardPage([
        boardItem({ id: 1, canonical_id: 1 }),
        boardItem({ id: 2, canonical_id: null }),
      ]),
    });

    expect(store().nextUnassignedSlave([2])).toBeNull();
  });
});

describe('autoAdvanceSlice – skipCurrentSlave', () => {
  it('records the pinned slave as skipped and pins the next candidate', () => {
    useDedupStore.setState({
      pinnedItem: boardItem({ id: 1, canonical_id: null }),
      slaves: boardPage([
        boardItem({ id: 1, canonical_id: null }),
        boardItem({ id: 2, canonical_id: 5 }),
        boardItem({ id: 3, canonical_id: null, name: 'Next' }),
      ]),
    });

    store().skipCurrentSlave();

    expect(store().skippedSlaveIds).toEqual([1]);
    expect(store().pinnedItem?.id).toBe(3);
  });

  it('clears the pin when no candidate remains', () => {
    useDedupStore.setState({
      pinnedItem: boardItem({ id: 1, canonical_id: null }),
      suggestions: [{ id: 9, name: 'Suggestion', status: 'active', similarity: 0.9 }],
      suggestionsLoading: true,
      slaves: boardPage([boardItem({ id: 1, canonical_id: null })]),
    });

    store().skipCurrentSlave();

    expect(store().pinnedItem).toBeNull();
    expect(store().suggestions).toBeNull();
    expect(store().suggestionsLoading).toBe(false);
  });

  it('does nothing when no slave is pinned', () => {
    useDedupStore.setState({ skippedSlaveIds: [] });

    store().skipCurrentSlave();

    expect(store().skippedSlaveIds).toEqual([]);
  });
});

describe('autoAdvanceSlice – tryAutoAdvance', () => {
  it('does nothing while auto-advance is disabled', () => {
    useDedupStore.setState({
      autoAdvance: false,
      slaves: boardPage([boardItem({ id: 7, canonical_id: null })]),
    });

    store().tryAutoAdvance();
    vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);

    expect(store().pinnedItem).toBeNull();
  });

  it('pins the next unassigned slave after the delay and resets the flag', () => {
    useDedupStore.setState({
      autoAdvance: true,
      slaves: boardPage([
        boardItem({ id: 4, canonical_id: null, name: 'Next' }),
        boardItem({ id: 5, canonical_id: null }),
      ]),
    });

    store().tryAutoAdvance();
    expect(store().autoAdvance).toBe(false);
    expect(store().pinnedItem).toBeNull();

    vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);

    expect(store().pinnedItem?.id).toBe(4);
  });

  it('clears the pin when auto-advance finds no candidate', () => {
    useDedupStore.setState({
      autoAdvance: true,
      pinnedItem: boardItem({ id: 1 }),
      suggestions: [{ id: 2, name: 'Old', status: 'active', similarity: 0.5 }],
      slaves: boardPage([boardItem({ id: 1, canonical_id: 3 })]),
    });

    store().tryAutoAdvance();
    vi.advanceTimersByTime(AUTO_ADVANCE_DELAY_MS);

    expect(store().pinnedItem).toBeNull();
    expect(store().suggestions).toBeNull();
  });
});

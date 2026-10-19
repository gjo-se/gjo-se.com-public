/**
 * Tests: clickSlice
 *
 * Verifies per-column selection (plain, meta toggle, shift range), anchor
 * freezing, selective clearing, and the display builders — all at the public
 * store/utility interface.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildMastersDisplay,
  buildSlavesDisplay,
  useDedupStore,
} from '@src/features/fbf/dedup/store/dedupStore';
import type { SelectModifiers } from '@src/features/fbf/dedup/store/types';

import { boardItem, resetDedupStore } from '../../helpers/dedupStore';

const store = () => useDedupStore.getState();
const plain: SelectModifiers = { meta: false, shift: false };
const meta: SelectModifiers = { meta: true, shift: false };
const shift: SelectModifiers = { meta: false, shift: true };

beforeEach(() => {
  resetDedupStore();
});

describe('clickSlice – plain click', () => {
  it('replaces the slave-column selection', () => {
    store().selectCard('slaves', boardItem({ id: 1 }), plain);
    store().selectCard('slaves', boardItem({ id: 2 }), plain);

    expect([...store().sp1SelectedIds]).toEqual([2]);
    expect(store().sp1Anchor?.id).toBe(2);
  });

  it('routes master clicks to the master column', () => {
    store().selectCard('masters', boardItem({ id: 8 }), plain);

    expect([...store().sp2SelectedIds]).toEqual([8]);
    expect(store().sp1SelectedIds.size).toBe(0);
  });

  it('routes pinned clicks to the pinned column', () => {
    store().selectCard('pinned', boardItem({ id: 9 }), plain);

    expect([...store().sp3SelectedIds]).toEqual([9]);
    expect(store().sp2SelectedIds.size).toBe(0);
  });
});

describe('clickSlice – meta click', () => {
  it('adds and removes a card from the multi-selection', () => {
    store().selectCard('slaves', boardItem({ id: 1 }), plain);
    store().selectCard('slaves', boardItem({ id: 2 }), meta);

    expect([...store().sp1SelectedIds].sort()).toEqual([1, 2]);
    expect(store().sp1SelectedItems.map((item) => item.id)).toEqual([1, 2]);
    expect(store().sp1Anchor?.id).toBe(1);

    store().selectCard('slaves', boardItem({ id: 2 }), meta);

    expect([...store().sp1SelectedIds]).toEqual([1]);
    expect(store().sp1Anchor?.id).toBe(1);
  });

  it('freezes the anchor while a master multi-selection is active', () => {
    store().selectCard('masters', boardItem({ id: 1 }), plain);
    store().selectCard('masters', boardItem({ id: 2 }), meta);

    expect(store().sp2Anchor?.id).toBe(1);
  });
});

describe('clickSlice – shift click', () => {
  const visible = [boardItem({ id: 1 }), boardItem({ id: 2 }), boardItem({ id: 3 }), boardItem({ id: 4 })];

  it('selects the inclusive range from the anchor', () => {
    store().selectCard('slaves', visible[1], plain);
    store().selectCard('slaves', visible[3], shift, visible);

    expect([...store().sp1SelectedIds].sort()).toEqual([2, 3, 4]);
    expect(store().sp1Anchor?.id).toBe(2);
  });

  it('falls back to a plain click when no anchor is set', () => {
    store().selectCard('slaves', visible[2], shift, visible);

    expect([...store().sp1SelectedIds]).toEqual([3]);
  });

  it('falls back to a plain click when the anchor is not visible', () => {
    store().selectCard('slaves', boardItem({ id: 99 }), plain);
    store().selectCard('slaves', visible[1], shift, visible);

    expect([...store().sp1SelectedIds]).toEqual([2]);
  });
});

describe('clickSlice – clearSelection', () => {
  it('clears only the requested column', () => {
    store().selectCard('slaves', boardItem({ id: 1 }), plain);
    store().selectCard('masters', boardItem({ id: 2 }), plain);

    store().clearSelection('masters');

    expect(store().sp1SelectedIds.size).toBe(1);
    expect(store().sp2SelectedIds.size).toBe(0);
  });

  it('clears all columns and similarity data without a column', () => {
    store().selectCard('slaves', boardItem({ id: 1 }), plain);
    store().selectCard('pinned', boardItem({ id: 3 }), plain);
    useDedupStore.setState({
      similarMasters: [{ ...boardItem({ id: 1 }), similarity: 0.9, best_member_name: null, best_member_similarity: null }],
      similarLoading: true,
    });

    store().clearSelection();

    expect(store().sp1SelectedIds.size).toBe(0);
    expect(store().sp3SelectedIds.size).toBe(0);
    expect(store().similarMasters).toBeNull();
    expect(store().similarLoading).toBe(false);
  });
});

describe('clickSlice – display builders', () => {
  it('returns an empty list until similarity data exists', () => {
    expect(buildMastersDisplay([], null)).toEqual([]);
    expect(buildSlavesDisplay([], null)).toEqual([]);
  });

  it('keeps selected items first and removes duplicates from the ranked list', () => {
    const selected = boardItem({ id: 1, name: 'Selected' });
    const other = { ...boardItem({ id: 2, name: 'Other' }), similarity: 0.5, best_member_name: null, best_member_similarity: null };
    const duplicate = { ...boardItem({ id: 1, name: 'Selected' }), similarity: 0.9, best_member_name: null, best_member_similarity: null };

    expect(buildMastersDisplay([selected], [duplicate, other]).map((item) => item.id)).toEqual([1, 2]);
    expect(buildSlavesDisplay([selected], [duplicate, other]).map((item) => item.id)).toEqual([1, 2]);
  });
});

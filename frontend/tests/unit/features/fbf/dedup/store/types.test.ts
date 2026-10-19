/**
 * Tests: dedup store types/helpers
 *
 * Verifies the shared defaults and the append helper used by load-more:
 * existing items stay, new pages append, duplicate ids are dropped, and the
 * page metadata comes from the incoming page.
 */

import { describe, expect, it } from 'vitest';

import {
  appendPage,
  AUTO_ADVANCE_DELAY_MS,
  DEFAULT_FILTERS,
  SIMILAR_REFRESH_DEBOUNCE_MS,
} from '@src/features/fbf/dedup/store/types';

import { boardItem, boardPage } from '../../helpers/dedupStore';

describe('dedup store defaults', () => {
  it('uses pending, empty query and page size 20 as default filters', () => {
    expect(DEFAULT_FILTERS).toEqual({ q: '', status: 'pending', size: 20 });
  });

  it('keeps the documented timing constants', () => {
    expect(AUTO_ADVANCE_DELAY_MS).toBe(500);
    expect(SIMILAR_REFRESH_DEBOUNCE_MS).toBe(300);
  });
});

describe('appendPage', () => {
  it('appends a page to an empty state', () => {
    const next = boardPage([boardItem({ id: 1 }), boardItem({ id: 2 })], 2);

    expect(appendPage(null, next)).toEqual(next);
  });

  it('keeps existing items and appends new ones', () => {
    const current = boardPage([boardItem({ id: 1 }), boardItem({ id: 2 })], 4);

    const merged = appendPage(current, boardPage([boardItem({ id: 3 }), boardItem({ id: 4 })], 4, 1));

    expect(merged.items.map((item) => item.id)).toEqual([1, 2, 3, 4]);
  });

  it('drops duplicate ids from the incoming page', () => {
    const current = boardPage([boardItem({ id: 1 }), boardItem({ id: 2 })], 3);

    const merged = appendPage(current, boardPage([boardItem({ id: 2 }), boardItem({ id: 3 })], 3, 1));

    expect(merged.items.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('takes the page metadata from the incoming page', () => {
    const merged = appendPage(boardPage([boardItem({ id: 1 })], 10, 0), boardPage([boardItem({ id: 2 })], 10, 1, 20));

    expect(merged.total).toBe(10);
    expect(merged.page).toBe(1);
    expect(merged.size).toBe(20);
  });
});

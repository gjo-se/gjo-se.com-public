/**
 * Tests: similaritySlice
 *
 * Verifies the debounced similarity refresh through the public store action:
 * no ranking without a selection, mixed + neighbor fetches, the pinned-master
 * freeze, anchor fallback, and the error fallback.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { SIMILAR_REFRESH_DEBOUNCE_MS } from '@src/features/fbf/dedup/store/types';

import { boardItem, resetDedupStore } from '../../helpers/dedupStore';
import { httpBoundary } from '../../helpers/httpBoundary';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const store = () => useDedupStore.getState();
const SIMILAR_URL = '/admin/fbf/dedup/similar-masters';

/**
 * Selects a slave card so the similarity ranking has an anchor.
 *
 * @param id Skill id.
 */
function selectSlave(id: number): void {
  store().selectCard('slaves', boardItem({ id }), { meta: false, shift: false });
}

beforeEach(() => {
  httpBoundary.reset();
  resetDedupStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('similaritySlice', () => {
  it('clears the ranking when nothing is selected', () => {
    store().refreshSimilarMasters();

    expect(store().similarMasters).toBeNull();
    expect(store().similarSlaves).toBeNull();
    expect(store().similarLoading).toBe(false);
    expect(httpBoundary.calls).toEqual([]);
  });

  it('loads mixed masters and slave neighbors for a slave selection', async () => {
    httpBoundary.on('post', SIMILAR_URL, (call) => ({
      items: call.payload && (call.payload as { has_slaves?: boolean }).has_slaves === false
        ? [{ ...boardItem({ id: 2 }), similarity: 0.8, best_member_name: null, best_member_similarity: null }]
        : [{ ...boardItem({ id: 3 }), similarity: 0.9, best_member_name: null, best_member_similarity: null }],
    }));
    selectSlave(1);

    store().refreshSimilarMasters();
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(store().similarMasters?.map((item) => item.id)).toEqual([3]);
    expect(store().similarSlaves?.map((item) => item.id)).toEqual([2]);
    expect(store().similarLoading).toBe(false);
    expect(httpBoundary.calls).toHaveLength(2);
  });

  it('freezes the master ranking while a master is pinned', async () => {
    useDedupStore.setState({
      pinnedItem: boardItem({ id: 5, canonical_id: null }),
      similarMasters: [{ ...boardItem({ id: 9 }), similarity: 0.4, best_member_name: null, best_member_similarity: null }],
    });
    httpBoundary.on('post', SIMILAR_URL, () => ({
      items: [{ ...boardItem({ id: 2 }), similarity: 0.7, best_member_name: null, best_member_similarity: null }],
    }));
    selectSlave(1);

    store().refreshSimilarMasters();
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(httpBoundary.calls).toHaveLength(1);
    expect(httpBoundary.calls[0].payload).toMatchObject({ skill_ids: [1], has_slaves: false });
    expect(store().similarMasters?.map((item) => item.id)).toEqual([9]);
    expect(store().similarSlaves?.map((item) => item.id)).toEqual([2]);
  });

  it('falls back to the master anchor when no slave is selected', async () => {
    httpBoundary.on('post', SIMILAR_URL, () => ({ items: [] }));
    store().selectCard('masters', boardItem({ id: 7 }), { meta: false, shift: false });

    store().refreshSimilarMasters();
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(httpBoundary.calls[0].payload).toMatchObject({ skill_ids: [7] });
  });

  it('clears the ranking when a selection has no anchor', async () => {
    useDedupStore.setState({ sp2SelectedIds: new Set([7]), sp2Anchor: null });

    store().refreshSimilarMasters();
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(store().similarMasters).toBeNull();
    expect(store().similarSlaves).toBeNull();
    expect(httpBoundary.calls).toEqual([]);
  });

  it('reuses existing neighbors unless a neighbor refresh is requested', async () => {
    useDedupStore.setState({
      similarSlaves: [{ ...boardItem({ id: 8 }), similarity: 0.6, best_member_name: null, best_member_similarity: null }],
    });
    httpBoundary.on('post', SIMILAR_URL, () => ({ items: [] }));
    selectSlave(1);

    store().refreshSimilarMasters();
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(httpBoundary.calls).toHaveLength(1);

    store().refreshSimilarMasters(true);
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(httpBoundary.calls).toHaveLength(3);
    expect(store().similarSlaves).toEqual([]);
  });

  it('falls back to empty lists and an error message when fetching fails', async () => {
    httpBoundary.on('post', SIMILAR_URL, () => { throw new Error('offline'); });
    selectSlave(1);

    store().refreshSimilarMasters();
    await vi.advanceTimersByTimeAsync(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(store().similarMasters).toEqual([]);
    expect(store().similarSlaves).toEqual([]);
    expect(store().error).toBe('Fehler beim Laden der ähnlichen Skills.');
    expect(store().similarLoading).toBe(false);
  });
});

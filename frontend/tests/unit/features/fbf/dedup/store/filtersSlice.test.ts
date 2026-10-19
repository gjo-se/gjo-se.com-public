/**
 * Tests: filtersSlice
 *
 * Verifies filter merging, the slave/pinned filter setters, and their
 * observable side effects (board refetch, similarity refresh) through the
 * public store actions.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { SIMILAR_REFRESH_DEBOUNCE_MS } from '@src/features/fbf/dedup/store/types';

import { boardItem, boardPage, resetDedupStore } from '../../helpers/dedupStore';
import { httpBoundary } from '../../helpers/httpBoundary';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const store = () => useDedupStore.getState();
const BOARD_URL = '/admin/fbf/dedup/board';
const SIMILAR_URL = '/admin/fbf/dedup/similar-masters';

beforeEach(() => {
  httpBoundary.reset();
  resetDedupStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('filtersSlice – setFilter', () => {
  it('merges a partial patch and keeps the other filters', () => {
    store().setFilter({ q: 'react' });

    expect(store().filters).toEqual({ q: 'react', status: 'pending', size: 20 });
  });

  it('refreshes the similarity ranking with the new query', () => {
    httpBoundary.on('post', SIMILAR_URL, () => ({ items: [] }));
    store().selectCard('slaves', boardItem({ id: 1 }), { meta: false, shift: false });

    store().setFilter({ q: 'react' });
    vi.advanceTimersByTime(SIMILAR_REFRESH_DEBOUNCE_MS);

    expect(httpBoundary.calls[0]).toMatchObject({
      method: 'post',
      url: SIMILAR_URL,
      payload: { skill_ids: [1], q: 'react', status: 'pending' },
    });
  });
});

describe('filtersSlice – slave filters', () => {
  it('stores the slave status and refetches the slave column with it', async () => {
    httpBoundary.on('get', BOARD_URL, () => boardPage([], 0));

    store().setSlaveStatus('active');
    await vi.runAllTimersAsync();

    expect(store().slaveStatus).toBe('active');
    expect(httpBoundary.calls[0].params).toMatchObject({ status: 'active', has_slaves: false });
  });

  it('stores the slave query without fetching while there is no selection', () => {
    store().setSlaveQ('java');

    expect(store().slaveQ).toBe('java');
    expect(httpBoundary.calls).toEqual([]);
  });
});

describe('filtersSlice – pinned-slave filters', () => {
  it('stores the pinned status and refetches the aliases', async () => {
    useDedupStore.setState({ pinnedItem: boardItem({ id: 4, canonical_id: null }) });
    httpBoundary.on('get', BOARD_URL, () => boardPage([], 0));

    store().setPinnedSlavesStatus('active');
    await vi.runAllTimersAsync();

    expect(store().pinnedSlavesStatus).toBe('active');
    expect(httpBoundary.calls[0].params).toMatchObject({
      column: 'slaves',
      master_id: 4,
      status: 'active',
    });
  });

  it('stores the pinned query and refetches the aliases', async () => {
    useDedupStore.setState({ pinnedItem: boardItem({ id: 4, canonical_id: null }) });
    httpBoundary.on('get', BOARD_URL, () => boardPage([], 0));

    store().setPinnedSlavesQ('sql');
    await vi.runAllTimersAsync();

    expect(store().pinnedSlavesQ).toBe('sql');
    expect(httpBoundary.calls[0].params).toMatchObject({ q: 'sql' });
  });
});

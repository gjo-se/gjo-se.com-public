/**
 * Tests: columnsSlice
 *
 * Verifies board loading, load-more pagination, pinned-master aliases and
 * suggestions through the public store actions. The HTTP boundary is faked;
 * the real dedup service runs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';

import { boardItem, boardPage, resetDedupStore } from '../../helpers/dedupStore';
import { httpBoundary } from '../../helpers/httpBoundary';

vi.mock('@src/lib/api/axios', async () => {
  const { httpBoundary: boundary } = await import('../../helpers/httpBoundary');
  return { default: boundary.api, api: boundary.api };
});

const store = () => useDedupStore.getState();
const BOARD_URL = '/admin/fbf/dedup/board';
const SUGGESTIONS_URL = '/admin/fbf/dedup/suggestions';

beforeEach(() => {
  httpBoundary.reset();
  resetDedupStore();
});

describe('columnsSlice – initial loads', () => {
  it('loads the masters column', async () => {
    httpBoundary.on('get', BOARD_URL, () => boardPage([boardItem({ id: 1, name: 'Master' })], 1));

    await store().fetchMasters();

    expect(store().masters?.items.map((item) => item.id)).toEqual([1]);
    expect(store().loading).toBe(false);
    expect(store().error).toBeNull();
  });

  it('reports the German error when the masters request fails', async () => {
    httpBoundary.on('get', BOARD_URL, () => { throw new Error('offline'); });

    await store().fetchMasters();

    expect(store().masters).toBeNull();
    expect(store().error).toBe('Fehler beim Laden der Masters.');
    expect(store().loading).toBe(false);
  });

  it('loads solo masters as the slave column with the slave filters', async () => {
    useDedupStore.setState({ slaveQ: 'react', slaveStatus: 'active' });
    httpBoundary.on('get', BOARD_URL, () => boardPage([boardItem({ id: 2 })], 1));

    await store().fetchSlaves();

    expect(store().slaves?.items.map((item) => item.id)).toEqual([2]);
    expect(httpBoundary.calls[0].params).toMatchObject({
      column: 'masters',
      q: 'react',
      status: 'active',
      has_slaves: false,
      page: 0,
    });
  });
});

describe('columnsSlice – load more', () => {
  it('does nothing while another request is running', async () => {
    useDedupStore.setState({ masters: boardPage([boardItem({ id: 1 })], 40), loading: true });

    await store().loadMoreMasters();

    expect(httpBoundary.calls).toEqual([]);
  });

  it('does nothing when the last page is already loaded', async () => {
    useDedupStore.setState({ masters: boardPage([boardItem({ id: 1 })], 1), loading: false });

    await store().loadMoreMasters();

    expect(httpBoundary.calls).toEqual([]);
  });

  it('appends the next page and drops duplicate ids', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => boardItem({ id: index + 1 }));
    useDedupStore.setState({ masters: boardPage(firstPage, 40) });
    httpBoundary.on('get', BOARD_URL, () => boardPage(
      [boardItem({ id: 20 }), boardItem({ id: 21 })],
      40,
      1,
    ));

    await store().loadMoreMasters();

    expect(store().masters?.items).toHaveLength(21);
    expect(store().masters?.items.at(-1)?.id).toBe(21);
    expect(httpBoundary.calls[0].params).toMatchObject({ page: 1, has_slaves: true });
  });
});

describe('columnsSlice – pinned-master aliases', () => {
  it('clears the alias list when nothing is pinned', async () => {
    useDedupStore.setState({ pinnedMasterSlaves: boardPage([boardItem({ id: 1 })]) });

    await store().fetchPinnedMasterSlaves();

    expect(store().pinnedMasterSlaves).toBeNull();
    expect(httpBoundary.calls).toEqual([]);
  });

  it('does not fetch aliases for a slave pin', async () => {
    useDedupStore.setState({ pinnedItem: boardItem({ id: 4, canonical_id: 9 }) });

    await store().fetchPinnedMasterSlaves();

    expect(store().pinnedMasterSlaves).toBeNull();
    expect(httpBoundary.calls).toEqual([]);
  });

  it('loads the aliases of the pinned master', async () => {
    useDedupStore.setState({ pinnedItem: boardItem({ id: 4, canonical_id: null }) });
    httpBoundary.on('get', BOARD_URL, () => boardPage([boardItem({ id: 5 })], 1));

    await store().fetchPinnedMasterSlaves();

    expect(store().pinnedMasterSlaves?.items.map((item) => item.id)).toEqual([5]);
    expect(httpBoundary.calls[0].params).toMatchObject({ column: 'slaves', master_id: 4 });
  });

  it('reports the alias error when loading fails', async () => {
    useDedupStore.setState({ pinnedItem: boardItem({ id: 4, canonical_id: null }) });
    httpBoundary.on('get', BOARD_URL, () => { throw new Error('offline'); });

    await store().fetchPinnedMasterSlaves();

    expect(store().error).toBe('Fehler beim Laden der Aliase.');
  });
});

describe('columnsSlice – suggestions', () => {
  it('loads suggestions for a slave', async () => {
    httpBoundary.on('get', SUGGESTIONS_URL, () => [
      { id: 11, name: 'Suggested', status: 'active', similarity: 0.88 },
    ]);

    await store().fetchSuggestions(5);

    expect(store().suggestions).toEqual([
      { id: 11, name: 'Suggested', status: 'active', similarity: 0.88 },
    ]);
    expect(store().suggestionsLoading).toBe(false);
    expect(httpBoundary.calls[0].params).toEqual({ slave_id: 5 });
  });

  it('falls back to an empty suggestion list on error', async () => {
    httpBoundary.on('get', SUGGESTIONS_URL, () => { throw new Error('offline'); });

    await store().fetchSuggestions(5);

    expect(store().suggestions).toEqual([]);
    expect(store().suggestionsLoading).toBe(false);
  });
});

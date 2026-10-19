/**
 * Tests: mutationsSlice
 *
 * Verifies the API mutations and their observable effects (refetch, pinning,
 * selection handling, error messages) through the public store actions.
 * Only the HTTP boundary is faked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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

/**
 * Registers a board handler that answers masters and slaves pages.
 *
 * @param masters Master items.
 * @param slaves Slave items.
 */
function serveBoard(masters = [boardItem({ id: 5, name: 'Master' })], slaves = [boardItem({ id: 1 })]): void {
  httpBoundary.on('get', BOARD_URL, (call) => (
    call.params?.column === 'slaves' ? boardPage(slaves, slaves.length) : boardPage(masters, masters.length)
  ));
}

beforeEach(() => {
  httpBoundary.reset();
  resetDedupStore();
});

describe('mutationsSlice – doArchiveSkills', () => {
  it('archives, refetches the two board columns and clears the selection', async () => {
    serveBoard();
    store().selectCard('slaves', boardItem({ id: 1 }), { meta: false, shift: false });
    httpBoundary.on('post', '/admin/fbf/dedup/archive', () => ({ updated: 1 }));

    await store().doArchiveSkills([1]);

    expect(httpBoundary.calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'post /admin/fbf/dedup/archive',
      `get ${BOARD_URL}`,
      `get ${BOARD_URL}`,
    ]);
    expect(store().sp1SelectedIds.size).toBe(0);
    expect(store().loading).toBe(false);
  });

  it('keeps the selection and reports an error when archiving fails', async () => {
    httpBoundary.on('post', '/admin/fbf/dedup/archive', () => { throw new Error('offline'); });
    store().selectCard('slaves', boardItem({ id: 1 }), { meta: false, shift: false });

    await store().doArchiveSkills([1]);

    expect(store().error).toBe('Fehler beim Archivieren.');
    expect(store().sp1SelectedIds.size).toBe(1);
    expect(store().loading).toBe(false);
  });
});

describe('mutationsSlice – doAssignSlave', () => {
  it('assigns, refetches, pins the master and clears the selection', async () => {
    serveBoard([boardItem({ id: 5, name: 'Master' })]);
    store().selectCard('slaves', boardItem({ id: 1 }), { meta: false, shift: false });
    httpBoundary.on('post', '/admin/fbf/dedup/assign', () => ({ updated: 1 }));

    await store().doAssignSlave(1, 5);

    expect(httpBoundary.calls[0]).toMatchObject({
      method: 'post',
      payload: { skill_id: 1, master_id: 5 },
    });
    expect(store().pinnedItem?.id).toBe(5);
    expect(store().sp1SelectedIds.size).toBe(0);
  });

  it('reports the German error when assignment fails', async () => {
    httpBoundary.on('post', '/admin/fbf/dedup/assign', () => { throw new Error('offline'); });

    await store().doAssignSlave(1, 5);

    expect(store().error).toBe('Fehler beim Zuordnen des Slaves.');
    expect(store().loading).toBe(false);
  });
});

describe('mutationsSlice – doRenameSkill', () => {
  it('updates the name optimistically and sends the full write body', async () => {
    useDedupStore.setState({ masters: boardPage([boardItem({ id: 1, name: 'Old', status: 'active' })]) });
    httpBoundary.on('put', '/admin/fbf/skill/1', () => boardItem({ id: 1, name: 'New' }));

    await store().doRenameSkill(1, 'New');

    expect(store().masters?.items[0].name).toBe('New');
    expect(httpBoundary.calls[0].payload).toMatchObject({
      name: 'New',
      status: 'active',
      canonical_id: null,
    });
  });

  it('does nothing when the name did not change', async () => {
    useDedupStore.setState({ masters: boardPage([boardItem({ id: 1, name: 'Same' })]) });

    await store().doRenameSkill(1, 'Same');

    expect(httpBoundary.calls).toEqual([]);
  });

  it('does nothing for an unknown skill', async () => {
    await store().doRenameSkill(99, 'New');

    expect(httpBoundary.calls).toEqual([]);
  });

  it('restores server state after a failed rename', async () => {
    serveBoard([boardItem({ id: 1, name: 'ServerName' })]);
    useDedupStore.setState({ masters: boardPage([boardItem({ id: 1, name: 'Old' })]) });
    httpBoundary.on('put', '/admin/fbf/skill/1', () => { throw new Error('offline'); });

    await store().doRenameSkill(1, 'New');

    expect(store().masters?.items[0].name).toBe('ServerName');
    expect(httpBoundary.calls.filter((call) => call.method === 'get')).toHaveLength(2);
  });
});

describe('mutationsSlice – doBulkAction', () => {
  it('keeps the master selection but clears the slave selection on assign', async () => {
    serveBoard([boardItem({ id: 5 }), boardItem({ id: 9 })]);
    useDedupStore.setState({
      sp1SelectedIds: new Set([1]),
      sp1SelectedItems: [boardItem({ id: 1 })],
      sp1Anchor: boardItem({ id: 1 }),
      sp2SelectedIds: new Set([5, 9]),
      sp2SelectedItems: [boardItem({ id: 5 }), boardItem({ id: 9 })],
    });
    httpBoundary.on('post', '/admin/fbf/dedup/bulk', () => ({ updated: 2 }));

    vi.useFakeTimers();
    try {
      await store().doBulkAction('assign', [1], 5);
      vi.advanceTimersByTime(SIMILAR_REFRESH_DEBOUNCE_MS);
    } finally {
      vi.useRealTimers();
    }

    expect(store().pinnedItem?.id).toBe(5);
    expect(store().sp1SelectedIds.size).toBe(0);
    expect([...store().sp2SelectedIds]).toEqual([5, 9]);
    expect(store().sp2SelectedItems.map((item) => item.id)).toEqual([5, 9]);
  });

  it('clears the whole selection for non-assign bulk actions', async () => {
    serveBoard();
    store().selectCard('slaves', boardItem({ id: 1 }), { meta: false, shift: false });
    httpBoundary.on('post', '/admin/fbf/dedup/bulk', () => ({ updated: 1 }));

    await store().doBulkAction('deprecated', [1]);

    expect(store().sp1SelectedIds.size).toBe(0);
    expect(httpBoundary.calls[0].payload).toMatchObject({ action: 'deprecated', skill_ids: [1] });
  });

  it('reports the bulk error', async () => {
    httpBoundary.on('post', '/admin/fbf/dedup/bulk', () => { throw new Error('offline'); });

    await store().doBulkAction('activate', [1]);

    expect(store().error).toBe('Fehler bei der Bulk-Aktion.');
  });
});

describe('mutationsSlice – group status', () => {
  it('applies the status to the master and all of its slaves', async () => {
    serveBoard([], [boardItem({ id: 11 }), boardItem({ id: 12 })]);
    httpBoundary.on('post', '/admin/fbf/dedup/bulk', () => ({ updated: 3 }));

    await store().doGroupStatus(5, 'deprecated');

    expect(httpBoundary.calls[0].params).toMatchObject({
      column: 'slaves',
      master_id: 5,
      size: 100,
    });
    expect(httpBoundary.calls[1].payload).toEqual({
      action: 'deprecated',
      skill_ids: [5, 11, 12],
    });
  });
});

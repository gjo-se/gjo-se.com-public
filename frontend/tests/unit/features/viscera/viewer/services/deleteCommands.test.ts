/**
 * Tests: deleteCommands
 *
 * Behaviour: the selection guard, confirmation dialog lifecycle, optimistic
 * removal of nodes/edges with matching delete mutations, and the detail-panel
 * reset after a confirmed delete.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDeleteCommands,
} from '@src/features/viscera/viewer/services/deleteCommands';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

import type { DeleteDialogState } from '@src/features/viscera/viewer/services/deleteCommands';
import type { Dispatch, SetStateAction } from 'react';

const store = () => useVisceraStore.getState();

const EMPTY_DIALOG: DeleteDialogState = { open: false, nodes: [], edges: [], deleting: false };

/** Stateful stand-in for a `useState` setter. */
function makeSetter(initial: DeleteDialogState) {
  let current = initial;
  const setter: Dispatch<SetStateAction<DeleteDialogState>> = (next) => {
    current = typeof next === 'function' ? next(current) : next;
  };
  return { get: () => current, set: setter };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('createDeleteCommands – selection guard', () => {
  it('does not open the dialog without a selection', () => {
    const dialog = makeSetter(EMPTY_DIALOG);
    const commands = createDeleteCommands({
      deleteDialog: dialog.get(),
      setDeleteDialog: dialog.set,
      setObjectId: vi.fn(),
    });

    commands.handleDeleteSelectedElements();

    expect(dialog.get().open).toBe(false);
  });

  it('opens the dialog with the selected nodes and edges', () => {
    store().setSelectedNodes([{ id: 'api', name: 'API' }]);
    store().setSelectedEdges([{ id: 'api__db' }]);
    const dialog = makeSetter(EMPTY_DIALOG);
    const commands = createDeleteCommands({
      deleteDialog: dialog.get(),
      setDeleteDialog: dialog.set,
      setObjectId: vi.fn(),
    });

    commands.handleDeleteSelectedElements();

    expect(dialog.get()).toEqual({
      open: true,
      nodes: [{ id: 'api', name: 'API' }],
      edges: [{ id: 'api__db' }],
      deleting: false,
    });
  });
});

describe('createDeleteCommands – confirm', () => {
  const DIALOG: DeleteDialogState = {
    open: true,
    nodes: [{ id: 'api', name: 'API' }],
    edges: [{ id: 'api__db' }],
    deleting: false,
  };

  it('removes nodes and edges optimistically and queues both deletions', async () => {
    store().setNodes([
      { id: 'api', type: 'containerCard', data: {}, position: { x: 0, y: 0 }, isTransient: false },
    ]);
    store().setEdges([{ id: 'api__db', source: 'api', target: 'db' }]);
    const dialog = makeSetter(DIALOG);
    const setObjectId = vi.fn();
    const commands = createDeleteCommands({
      deleteDialog: dialog.get(),
      setDeleteDialog: dialog.set,
      setObjectId,
    });

    await commands.handleDeleteConfirm();

    expect(store().nodes).toEqual([]);
    expect(store().edges).toEqual([]);
    expect(store().syncQueue.map((e) => e.action)).toEqual(['delete', 'delete_edge']);
    expect(dialog.get()).toEqual(EMPTY_DIALOG);
    expect(setObjectId).toHaveBeenCalledWith(null);
  });

  it('resets only the dialog when the list is empty', async () => {
    const dialog = makeSetter({ ...EMPTY_DIALOG, open: true });
    const commands = createDeleteCommands({
      deleteDialog: dialog.get(),
      setDeleteDialog: dialog.set,
      setObjectId: vi.fn(),
    });

    await commands.handleDeleteConfirm();

    expect(store().syncQueue).toEqual([]);
    expect(dialog.get()).toEqual(EMPTY_DIALOG);
  });
});

describe('createDeleteCommands – cancel', () => {
  it('closes the dialog without deleting anything', () => {
    const dialog = makeSetter({ ...EMPTY_DIALOG, open: true, nodes: [{ id: 'api', name: 'API' }] });
    const commands = createDeleteCommands({
      deleteDialog: dialog.get(),
      setDeleteDialog: dialog.set,
      setObjectId: vi.fn(),
    });

    commands.handleDeleteCancel();

    expect(dialog.get()).toEqual(EMPTY_DIALOG);
    expect(store().syncQueue).toEqual([]);
  });
});

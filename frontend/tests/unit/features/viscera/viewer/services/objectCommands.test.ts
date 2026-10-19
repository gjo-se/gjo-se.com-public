/**
 * Tests: objectCommands
 *
 * Behaviour: create-dialog prefill variants, optimistic object creation with
 * the correct card kind, placeholder confirmation (id generation, optimistic
 * node, optional edge) and placeholder cleanup.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createObjectCommands,
  getChildType,
} from '@src/features/viscera/viewer/services/objectCommands';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

import type {
  CreateObjectDialogState,
  CreateObjectFormData,
} from '@src/features/viscera/viewer/services/objectCommands';
import type { CardKind } from '@src/features/viscera/viewer/utils/cardShape';
import type { Dispatch, SetStateAction } from 'react';

const store = () => useVisceraStore.getState();

const CLOSED: CreateObjectDialogState = {
  open: false,
  prefill: undefined,
  isSubmitting: false,
  error: null,
};

function makeSetter(initial: CreateObjectDialogState) {
  let current = initial;
  const setter: Dispatch<SetStateAction<CreateObjectDialogState>> = (next) => {
    current = typeof next === 'function' ? next(current) : next;
  };
  return { get: () => current, set: setter };
}

function makeCommands() {
  const dialog = makeSetter(CLOSED);
  const setObjectId = vi.fn();
  const commands = createObjectCommands({ setCreateObjectDialog: dialog.set, setObjectId });
  return { commands, dialog, setObjectId };
}

function formData(patch: Partial<CreateObjectFormData> = {}): CreateObjectFormData {
  return {
    id: 'payment',
    name: 'Payment',
    type: 'component',
    description: 'Handles payments',
    parent: 'sys',
    ...patch,
  };
}

beforeEach(() => {
  resetVisceraStore();
});

describe('createObjectCommands – dialog open', () => {
  it('opens an empty create dialog', () => {
    const { commands, dialog } = makeCommands();

    commands.handleCreateObject();

    expect(dialog.get()).toEqual({
      open: true,
      prefill: undefined,
      isSubmitting: false,
      error: null,
    });
  });

  it('prefills a container under a system', () => {
    const { commands, dialog } = makeCommands();

    commands.handleCreateContainer('sys');

    expect(dialog.get()).toMatchObject({
      open: true,
      prefill: { parent: 'sys', type: 'Container' },
    });
  });

  it('prefills a component under a container', () => {
    const { commands, dialog } = makeCommands();

    commands.handleCreateComponent('ctr');

    expect(dialog.get()).toMatchObject({
      open: true,
      prefill: { parent: 'ctr', type: 'Component' },
    });
  });

  it('closes and clears the error', () => {
    const { commands, dialog } = makeCommands();
    dialog.set({ open: true, prefill: undefined, isSubmitting: false, error: 'x' });

    commands.handleCreateObjectClose(false);

    expect(dialog.get()).toEqual({ ...CLOSED });
  });

  it('ignores a close(true) request', () => {
    const { commands, dialog } = makeCommands();

    commands.handleCreateObjectClose(true);

    expect(dialog.get().open).toBe(false);
  });
});

describe('createObjectCommands – submit', () => {
  it('adds an optimistic node and queues a create mutation', async () => {
    const { commands, dialog, setObjectId } = makeCommands();

    await commands.handleCreateObjectSubmit(formData());

    expect(store().nodes[0]).toMatchObject({
      id: 'payment',
      data: { name: 'Payment', description: 'Handles payments', kind: 'component' },
      isTransient: true,
    });
    expect(store().syncQueue[0]).toMatchObject({
      nodeId: 'payment',
      action: 'create',
      payload: {
        id: 'payment',
        name: 'Payment',
        type: 'component',
        description: 'Handles payments',
        parent: 'sys',
      },
    });
    expect(dialog.get()).toEqual(CLOSED);
    expect(setObjectId).toHaveBeenCalledWith(null);
  });

  it('defaults a missing type to system', async () => {
    const { commands } = makeCommands();

    await commands.handleCreateObjectSubmit(formData({ type: null }));

    expect(store().nodes[0]?.data.kind).toBe('system');
  });

  it('normalizes the type case-insensitively', async () => {
    const { commands } = makeCommands();

    await commands.handleCreateObjectSubmit(formData({ type: 'Container' }));

    expect(store().nodes[0]?.data.kind).toBe('container');
  });
});

describe('createObjectCommands – placeholder', () => {
  it('returns null when no optimistic node exists for the temp id', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { commands } = makeCommands();

    await expect(commands.handleConfirmPlaceholder('tmp-x', 'Payment')).resolves.toBeNull();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });

  it('creates the node under a generated id and clears the optimistic entry', async () => {
    const { commands } = makeCommands();
    store().addOptimisticNode({ tempId: 'tmp-1', type: 'component', position: { x: 5, y: 6 } });

    const result = await commands.handleConfirmPlaceholder('tmp-1', 'My Service');

    expect(result).toEqual({ id: 'my-service', name: 'My Service' });
    expect(store().nodes[0]).toMatchObject({
      id: 'my-service',
      position: { x: 5, y: 6 },
      isTransient: true,
    });
    expect(store().pendingOptimisticNodes).toEqual({});
    expect(store().syncQueue[0]).toMatchObject({
      action: 'create',
      payload: { id: 'my-service', name: 'My Service', type: 'component' },
    });
  });

  it('falls back to "untitled" for a name without usable characters', async () => {
    const { commands } = makeCommands();
    store().addOptimisticNode({ tempId: 'tmp-1', type: 'system', position: { x: 0, y: 0 } });

    const result = await commands.handleConfirmPlaceholder('tmp-1', '!!!');

    expect(result).toEqual({ id: 'untitled', name: '!!!' });
  });

  it('creates an edge when the placeholder came from an edge drop', async () => {
    const { commands } = makeCommands();
    store().addOptimisticNode({ tempId: 'tmp-1', type: 'component', position: { x: 0, y: 0 } });

    await commands.handleConfirmPlaceholder('tmp-1', 'Payment', { sourceNodeId: 'api' });

    expect(store().edges).toEqual([
      { id: 'api__payment', source: 'api', target: 'payment' },
    ]);
    expect(store().syncQueue.map((e) => e.action)).toEqual(['create', 'create_edge']);
    expect(store().syncQueue[1]?.payload).toEqual({ from_id: 'api', to_id: 'payment' });
  });

  it('removes the associated temp edge on confirmation', async () => {
    const { commands } = makeCommands();
    store().addOptimisticNode({ tempId: 'tmp-1', type: 'component', position: { x: 0, y: 0 } });
    store().addTempEdge('tmp-1', { edgeId: 'e1', sourceId: 'api', targetId: 'tmp-1' });

    await commands.handleConfirmPlaceholder('tmp-1', 'Payment');

    expect(store().tempEdges).toEqual({});
  });
});

describe('createObjectCommands – cancel placeholder', () => {
  it('removes the optimistic node and its temp edge', () => {
    const { commands } = makeCommands();
    store().addOptimisticNode({ tempId: 'tmp-1', type: 'component', position: { x: 0, y: 0 } });
    store().addTempEdge('tmp-1', { edgeId: 'e1', sourceId: 'api', targetId: 'tmp-1' });

    commands.handleCancelPlaceholder('tmp-1');

    expect(store().pendingOptimisticNodes).toEqual({});
    expect(store().tempEdges).toEqual({});
  });

  it('is a no-op for an unknown temp id', () => {
    const { commands } = makeCommands();

    expect(() => commands.handleCancelPlaceholder('missing')).not.toThrow();
  });
});

describe('getChildType', () => {
  it.each([
    ['system', 'container'],
    ['container', 'component'],
    ['component', 'component'],
    ['person', 'system'],
  ] as [CardKind, string][])('maps %s to %s', (kind, expected) => {
    expect(getChildType(kind)).toBe(expected);
  });

  it('defaults unknown kinds to container', () => {
    expect(getChildType('group' as CardKind)).toBe('container');
  });
});

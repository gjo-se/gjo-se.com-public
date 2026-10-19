/**
 * Tests: undoRedoCommands
 *
 * Behaviour: undo/redo transitions run through the command-history singleton
 * and mirror the resulting overrides plus canUndo/canRedo back into the store.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createUndoRedoCommands } from '@src/features/viscera/viewer/services/undoRedoCommands';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('createUndoRedoCommands', () => {
  it('undo restores the overrides captured by the reset command', () => {
    store().setNodeOverride('view:api', { x: 10, y: 20 });
    store().clearPersistedOverrides();
    expect(store().nodeOverrides).toEqual({});

    const commands = createUndoRedoCommands();
    commands.onUndo();

    expect(store().nodeOverrides).toEqual({ 'view:api': { x: 10, y: 20 } });
    expect(store().overrides).toEqual({ 'view:api': { x: 10, y: 20 } });
    expect(store().canUndo).toBe(false);
    expect(store().canRedo).toBe(true);
  });

  it('redo re-applies the reset', () => {
    store().setNodeOverride('view:api', { x: 10, y: 20 });
    store().clearPersistedOverrides();
    const commands = createUndoRedoCommands();
    commands.onUndo();

    commands.onRedo();

    expect(store().nodeOverrides).toEqual({});
    expect(store().overrides).toEqual({});
    expect(store().canUndo).toBe(true);
    expect(store().canRedo).toBe(false);
  });

  it('undo on an empty history is a no-op', () => {
    const commands = createUndoRedoCommands();

    commands.onUndo();

    expect(store().nodeOverrides).toEqual({});
    expect(store().canUndo).toBe(false);
    expect(store().canRedo).toBe(false);
  });

  it('redo on an empty history is a no-op', () => {
    const commands = createUndoRedoCommands();

    commands.onRedo();

    expect(store().nodeOverrides).toEqual({});
    expect(store().canRedo).toBe(false);
  });
});

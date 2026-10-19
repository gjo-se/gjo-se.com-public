/**
 * Tests: commandHistory
 *
 * Behaviour of the generic undo/redo stack at its public interface: execute /
 * undo / redo transitions, redo invalidation, the max-size boundary (FIFO),
 * empty-stack no-ops and external state synchronisation.
 */

import { describe, expect, it } from 'vitest';

import {
  CommandHistory,
} from '@src/features/viscera/services/commandHistory';

import type { Command } from '@src/features/viscera/services/commandHistory';

interface CounterState {
  value: number;
}

/** Command that adds `amount` forward and subtracts it on undo. */
function addCommand(amount: number): Command<CounterState> {
  return {
    type: 'ADD',
    timestamp: 0,
    execute: <T extends CounterState>(state: T): T => ({
      ...state,
      value: state.value + amount,
    }),
    undo: <T extends CounterState>(state: T): T => ({
      ...state,
      value: state.value - amount,
    }),
  };
}

describe('CommandHistory – stack transitions', () => {
  it('starts with empty stacks and no history', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undoStackSize).toBe(0);
    expect(history.redoStackSize).toBe(0);
  });

  it('execute applies the command and enables undo', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });

    const state = history.execute(addCommand(5));

    expect(state.value).toBe(5);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
    expect(history.undoStackSize).toBe(1);
  });

  it('undo reverts the last command and moves it to the redo stack', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });
    history.execute(addCommand(5));

    const state = history.undo();

    expect(state.value).toBe(0);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
    expect(history.redoStackSize).toBe(1);
  });

  it('redo re-applies the last undone command', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });
    history.execute(addCommand(5));
    history.undo();

    const state = history.redo();

    expect(state.value).toBe(5);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('executing a new command clears the redo stack', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });
    history.execute(addCommand(5));
    history.undo();

    history.execute(addCommand(2));

    expect(history.canRedo).toBe(false);
    expect(history.redoStackSize).toBe(0);
  });

  it('undo and redo are no-ops on empty stacks', () => {
    const history = new CommandHistory<CounterState>({ value: 3 });

    expect(history.undo().value).toBe(3);
    expect(history.redo().value).toBe(3);
  });
});

describe('CommandHistory – max size boundary', () => {
  it('drops the oldest entry when the undo stack exceeds maxSize (FIFO)', () => {
    const history = new CommandHistory<CounterState>({ value: 0 }, 2);
    history.execute(addCommand(1));
    history.execute(addCommand(2));
    history.execute(addCommand(3));

    expect(history.undoStackSize).toBe(2);

    // The dropped (oldest) command can no longer be undone.
    expect(history.undo().value).toBe(3);
    expect(history.undo().value).toBe(1);
    expect(history.canUndo).toBe(false);
  });

  it('keeps exactly maxSize entries at the boundary', () => {
    const history = new CommandHistory<CounterState>({ value: 0 }, 2);
    history.execute(addCommand(1));
    history.execute(addCommand(1));

    expect(history.undoStackSize).toBe(2);
  });

  it('applies the default limit of 50 commands', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });
    for (let i = 0; i < 51; i += 1) history.execute(addCommand(1));

    expect(history.undoStackSize).toBe(50);
    expect(history.getState().value).toBe(51);
  });

  it('enforces maxSize again after redo', () => {
    const history = new CommandHistory<CounterState>({ value: 0 }, 2);
    history.execute(addCommand(1));
    history.execute(addCommand(1));
    history.undo();
    history.redo();

    expect(history.undoStackSize).toBe(2);
  });
});

describe('CommandHistory – state sync', () => {
  it('clear empties both stacks without changing the state', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });
    history.execute(addCommand(5));
    history.undo();

    history.clear();

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.getState().value).toBe(0);
  });

  it('syncState replaces the internal state', () => {
    const history = new CommandHistory<CounterState>({ value: 0 });

    history.syncState({ value: 42 });

    expect(history.getState()).toEqual({ value: 42 });
  });
});

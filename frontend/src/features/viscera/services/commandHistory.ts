/**
 * Command Pattern – Infrastructure for undo/redo.
 *
 * Pure TypeScript – no React dependency, no store access.
 * Commands are serializable (type + timestamp) with pure execute/undo functions.
 */

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MAX_SIZE = 50;

// ── Command Interface ────────────────────────────────────────────────────────

export interface Command<TState> {
  /** Unique command type identifier, e.g. 'MOVE_NODE'. */
  readonly type: string;
  /** Creation timestamp (Date.now()). */
  readonly timestamp: number;
  /**
   * Pure function: applies the command to state, returns the resulting state.
   *
   * Generic over the concrete state so a command written against a narrow
   * state shape (e.g. `OverridesState`) can be applied to any wider state that
   * contains it (e.g. the full store) without the command importing the store.
   */
  execute<T extends TState>(state: T): T;
  /** Pure function: reverses the command on state, returns the resulting state. */
  undo<T extends TState>(state: T): T;
}

// ── CommandHistory Class ─────────────────────────────────────────────────────

export class CommandHistory<TState> {
  private undoStack: Command<TState>[] = [];
  private redoStack: Command<TState>[] = [];
  private readonly maxSize: number;
  private state: TState;

  constructor(initialState: TState, maxSize: number = DEFAULT_MAX_SIZE) {
    this.state = initialState;
    this.maxSize = maxSize;
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoStackSize(): number {
    return this.undoStack.length;
  }

  get redoStackSize(): number {
    return this.redoStack.length;
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Executes a command, pushes it onto the undo stack, and clears the redo stack.
   * If the undo stack exceeds maxSize, the oldest entry is removed (FIFO).
   */
  execute(command: Command<TState>): TState {
    this.state = command.execute(this.state);
    this.undoStack.push(command);
    this.redoStack = [];

    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    return this.state;
  }

  /**
   * Reverts the last executed command.
   * Pops from undo stack → calls command.undo(state) → pushes onto redo stack.
   * Noop if undo stack is empty.
   */
  undo(): TState {
    if (this.undoStack.length === 0) {
      return this.state;
    }

    const command = this.undoStack.pop()!;
    this.state = command.undo(this.state);
    this.redoStack.push(command);

    return this.state;
  }

  /**
   * Re-applies the last undone command.
   * Pops from redo stack → calls command.execute(state) → pushes onto undo stack.
   * Noop if redo stack is empty.
   */
  redo(): TState {
    if (this.redoStack.length === 0) {
      return this.state;
    }

    const command = this.redoStack.pop()!;
    this.state = command.execute(this.state);
    this.undoStack.push(command);

    // Enforce max size on undo stack after redo
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    return this.state;
  }

  /** Clears both undo and redo stacks. Does not affect current state. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Synchronizes the internal state with an external source.
   * Used to keep CommandHistory state in sync with the Zustand store
   * before executing a command.
   */
  syncState(state: TState): void {
    this.state = state;
  }

  /** Returns the current state. */
  getState(): TState {
    return this.state;
  }
}

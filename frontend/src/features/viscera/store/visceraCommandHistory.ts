/**
 * Viscera CommandHistory Singleton (leaf module).
 *
 * Lives outside the store barrel (`store/index.ts`) to break the runtime import
 * cycle `canvasSlice.ts ⇄ index.ts`: `canvasSlice` imports the *value*
 * `getVisceraCommandHistory` from here instead of from the composition root.
 * The barrel re-exports the public API unchanged.
 *
 * The `VisceraStore` back-import is intentionally `import type` only (type-only
 * edges do not exist at runtime and are not a depcruise runner cycle).
 */

import { CommandHistory } from '../services/commandHistory';

import type { VisceraStore } from './visceraStore';

let visceraInstance: CommandHistory<VisceraStore> | null = null;

/** Creates the singleton Viscera CommandHistory. Must be called once during store initialization. */
export function createVisceraCommandHistory(initialState: VisceraStore): CommandHistory<VisceraStore> {
  visceraInstance = new CommandHistory<VisceraStore>(initialState);
  return visceraInstance;
}

/** Returns the singleton Viscera CommandHistory. Throws if not initialized. */
export function getVisceraCommandHistory(): CommandHistory<VisceraStore> {
  if (!visceraInstance) {
    throw new Error('Viscera CommandHistory not initialized. Call createVisceraCommandHistory first.');
  }
  return visceraInstance;
}

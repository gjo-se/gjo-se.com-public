import { produce } from 'immer';

import type { Command } from './commandHistory';
import type { OverridePosition, OverridesState } from '../core/nodeOverrides';

/**
 * Command for layout reset operations.
 *
 * Stores all current overrides so undo can restore them.
 * Clears both `nodeOverrides` and `overrides` (deprecated alias) in the store.
 *
 * Implements the narrow `OverridesState` shape — the only store fields this
 * command touches are `nodeOverrides`/`overrides`.
 */
export class ResetLayoutCommand implements Command<OverridesState> {
  readonly type = 'RESET_LAYOUT';
  readonly timestamp = Date.now();

  private previousOverrides: Record<string, OverridePosition>;

  constructor(previousOverrides: Record<string, OverridePosition>) {
    this.previousOverrides = previousOverrides;
  }

  execute<S extends OverridesState>(state: S): S {
    return produce(state, (draft) => {
      draft.nodeOverrides = {};
      draft.overrides = {};
    });
  }

  undo<S extends OverridesState>(state: S): S {
    return produce(state, (draft) => {
      draft.nodeOverrides = this.previousOverrides;
      draft.overrides = this.previousOverrides;
    });
  }
}

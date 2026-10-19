import { produce } from 'immer';

import { overrideKey } from '../core/nodeOverrides';

import type { Command } from './commandHistory';
import type { OverridePosition, OverridesState } from '../core/nodeOverrides';

/**
 * Command for node drag operations.
 *
 * Stores the previous override position (if any) so undo can restore it.
 * Uses composite key `${diagramKey}:${nodeId}` for per-diagram positions (#2229).
 *
 * Implements the narrow `OverridesState` shape — the only store fields this
 * command touches are `nodeOverrides`/`overrides`.
 */
export class MoveNodeCommand implements Command<OverridesState> {
  readonly type = 'MOVE_NODE';
  readonly timestamp = Date.now();

  private nodeId: string;
  private diagramKey: string;
  private newPosition: OverridePosition;
  private previousPosition: OverridePosition | undefined;

  constructor(
    nodeId: string,
    newPosition: OverridePosition,
    diagramKey: string,
    previousPosition?: OverridePosition,
  ) {
    this.nodeId = nodeId;
    this.diagramKey = diagramKey;
    this.newPosition = newPosition;
    this.previousPosition = previousPosition;
  }

  execute<S extends OverridesState>(state: S): S {
    return produce(state, (draft) => {
      const key = overrideKey(this.diagramKey, this.nodeId);
      draft.nodeOverrides[key] = this.newPosition;
      draft.overrides[key] = this.newPosition;
    });
  }

  undo<S extends OverridesState>(state: S): S {
    return produce(state, (draft) => {
      const key = overrideKey(this.diagramKey, this.nodeId);
      if (this.previousPosition) {
        draft.nodeOverrides[key] = this.previousPosition;
        draft.overrides[key] = this.previousPosition;
      } else {
        delete draft.nodeOverrides[key];
        delete draft.overrides[key];
      }
    });
  }
}

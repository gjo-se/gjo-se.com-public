/**
 * Position override domain types — single home for override keys and types.
 *
 * Moved from store slices (Epic #188, Inc 6): `OverridePosition` lived in
 * `store/canvasSlice.ts`, `overrideKey` in `store/diagramSlice.ts`. Both were
 * imported by services (MoveNodeCommand, ResetLayoutCommand), which formed
 * the core of the store ⇄ services dependency cycles. Pure module — no store
 * imports, no React dependency.
 */

export interface OverridePosition {
  x: number;
  y: number;
  /**
   * Optional group bounds (flow units) — set by group moves/resizes (#2293)
   * and persisted per diagram via the 'move' sync action.
   */
  width?: number;
  height?: number;
}

/**
 * State shape the move/reset commands operate on — the narrow slice of the
 * Viscera store that these commands mutate. Commands implement
 * `Command<OverridesState>` instead of `Command<VisceraStore>` so services
 * no longer import store modules.
 */
export interface OverridesState {
  nodeOverrides: Record<string, OverridePosition>;
  overrides: Record<string, OverridePosition>;
}

/**
 * Builds the composite nodeOverrides key `${diagramKey}:${nodeId}`.
 * A node can have different positions on different diagrams (#2229).
 */
export function overrideKey(diagramKey: string, nodeId: string): string {
  return `${diagramKey}:${nodeId}`;
}

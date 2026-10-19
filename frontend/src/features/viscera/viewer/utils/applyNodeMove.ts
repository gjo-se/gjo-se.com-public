import { overrideKey } from '../../core/nodeOverrides';
import { MoveNodeCommand } from '../../services/moveNodeCommand';
import { getVisceraCommandHistory, useVisceraStore } from '../../store/visceraStore';

import type { OverridePosition } from '../../core/nodeOverrides';
import type { NodeBounds } from '../../store/diagramSlice';

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * Canvas snap grid in flow units — SSOT for the drag snap and the
 * background grid rendering in CanvasContainer.
 */
export const GRID = 20;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Snaps a flow coordinate to the canvas grid. */
export const snapToGrid = (n: number): number => Math.round(n / GRID) * GRID;

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Applies a finished card drag (#2294): snaps the absolute flow position to
 * the grid, executes a ``MoveNodeCommand`` (undo/redo) and persists via
 * ``store.moveNode`` (optimistic update + ``move`` sync queue → PUT endpoint).
 *
 * Positions are absolute flow coordinates — conversion to ReactFlow-relative
 * positions for ``parentId`` children happens at rendering time only.
 *
 * ``previousPosition`` overrides the undo source when the caller kept a
 * snapshot before the drag (live drag previews mutate ``nodeOverrides``,
 * so the store value at drop time is not the pre-drag position anymore).
 *
 * ``bounds`` carries group dimensions (width/height) for group moves —
 * regular card moves stay ``{x, y}`` only (#2293).
 *
 * Extracted from ``useCanvas.onNodeDragStop``.
 *
 * ``onBeforePersist`` (optional) runs VOR dem Persist (#2491): materialisiert
 * ein ephemeres derived-Diagramm (create_diagram), damit der Sync-Queue das
 * Diagramm vor dem ``persist_layout``/``move``-Eintrag anlegt (sonst 404).
 */
export function applyNodeMove(
  nodeId: string,
  flowPosition: OverridePosition,
  diagramKey: string,
  previousPosition?: OverridePosition,
  bounds?: NodeBounds,
  onBeforePersist?: (diagramKey: string) => void,
): void {
  const position = { x: snapToGrid(flowPosition.x), y: snapToGrid(flowPosition.y) };

  const store = useVisceraStore.getState();
  const commandHistory = getVisceraCommandHistory();

  // Materialisierungs-Hook VOR dem Persist — das derived-Diagramm muss existieren,
  // bevor Positionen geschrieben werden (sequenzielle drainQueue: create_diagram → move).
  onBeforePersist?.(diagramKey);

  commandHistory.syncState(store);
  const compositeKey = overrideKey(diagramKey, nodeId);
  const previous = previousPosition ?? store.nodeOverrides[compositeKey];
  const command = new MoveNodeCommand(nodeId, position, diagramKey, previous);
  commandHistory.execute(command);

  store.moveNode(nodeId, position, diagramKey, bounds);

  useVisceraStore.setState({
    canUndo: commandHistory.canUndo,
    canRedo: commandHistory.canRedo,
  });
}

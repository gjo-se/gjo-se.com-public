import { produce } from 'immer';

import { ResetLayoutCommand } from '../services/resetLayoutCommand';

import { getVisceraCommandHistory } from './visceraCommandHistory';

import type { VisceraStore } from './visceraStore';
import type { OverridePosition } from '../core/nodeOverrides';
import type { ModelObjectType } from '../core/workspaceSchema';
import type { NodePosition } from '../services/elkLayoutService';
import type { XYPosition } from '@xyflow/react';
import type { StateCreator } from 'zustand';

// ── Optimistic Node Types ─────────────────────────────────────────────────────

export interface CanvasSlice {
  viewport: ViewportState;
  /** @deprecated Use nodeOverrides instead – renamed for clarity per ticket #1919. */
  overrides: Record<string, OverridePosition>;
  /** Node position overrides from manual drag (layout override per node). */
  nodeOverrides: Record<string, OverridePosition>;
  /** ELK.js-computed base positions (without drag overrides). SSOT for layout. */
  basePositions: NodePosition[];
  /** Incremented on every layout recomputation (e.g. workspace/viewKey change). */
  layoutVersion: number;
  interaction: InteractionState;
  /** Flag-driven fitView: set by shortcut → useCanvas triggers fitView() on ReactFlow instance. */
  fitViewRequested: boolean;
  /** Layout reset counter: incremented on user-triggered reset → DiagramViewer re-lays out. */
  layoutResetKey: number;
  /** One-shot: suppress the initial-layout auto-persist on the next layout run (#2523). */
  suppressAutoPersist: boolean;
  /** Whether undo is available (undo stack non-empty). Mirrors CommandHistory.canUndo. */
  canUndo: boolean;
  /** Whether redo is available (redo stack non-empty). Mirrors CommandHistory.canRedo. */
  canRedo: boolean;
  /** Currently selected node IDs and names from React Flow selection (for keyboard delete). */
  selectedNodes: { id: string; name: string }[];
  /** Currently selected edge IDs from React Flow selection (for keyboard delete). */
  selectedEdges: { id: string }[];
  /** Increments layoutResetKey to trigger a full diagram re-layout. */
  incrementLayoutReset: () => void;
  /** One-shot: set by resetLayout to suppress the initial-layout auto-persist (#2523). */
  setSuppressAutoPersist: (suppress: boolean) => void;
  setViewport: (viewport: ViewportState) => void;
  setOverrides: (overrides: Record<string, OverridePosition>) => void;
  addOverride: (nodeId: string, pos: OverridePosition) => void;
  /** Saves a single node's manual position override. Primary API per ticket #1919. */
  setNodeOverride: (nodeId: string, position: OverridePosition) => void;
  /** Saves a single node's manual position override. Persisted automatically via persistLocal middleware. */
  persistNodeOverride: (nodeId: string, position: OverridePosition) => void;
  /** Clears all overrides from store. Persistence cleared automatically via persistLocal middleware. */
  clearPersistedOverrides: () => void;
  removeOverride: (nodeId: string) => void;
  clearOverrides: () => void;
  /** Stores ELK.js-computed base positions and increments layoutVersion. */
  setBasePositions: (positions: NodePosition[]) => void;
  setHoveredNode: (nodeId: string | null) => void;
  addPulsedNode: (nodeId: string) => void;
  removePulsedNode: (nodeId: string) => void;
  /** Zooms in by factor 1.5 (keyboard shortcut '+'). */
  zoomIn: () => void;
  /** Zooms out by factor 1.5 (keyboard shortcut '-'). */
  zoomOut: () => void;
  /** Sets fitViewRequested flag → useCanvas triggers fitView() on the ReactFlow instance. */
  fitView: () => void;
  /** Resets viewport to { x: 0, y: 0, zoom: 1 } (keyboard shortcut '3'). */
  zoomReset: () => void;
  /** Resets fitViewRequested flag after fitView has been executed. */
  resetFitViewRequested: () => void;
  /** Stores currently selected nodes from React Flow selection state. */
  setSelectedNodes: (nodes: { id: string; name: string }[]) => void;
  /** Stores currently selected edges from React Flow selection state. */
  setSelectedEdges: (edges: { id: string }[]) => void;
  /** Syncs Zustand canUndo/canRedo from CommandHistory singleton. */
  syncUndoRedoState: () => void;
  /** Optimistic nodes awaiting server confirmation. Keyed by tempId. */
  pendingOptimisticNodes: Record<string, OptimisticNode>;
  /** Track a new optimistic node before the API confirms creation. */
  addOptimisticNode: (node: OptimisticNode) => void;
  /** Remove an optimistic node after API success or error. */
  removeOptimisticNode: (tempId: string) => void;
  /** Temporary edges created by edge-drop (placeholder node ID → edge data). */
  tempEdges: Record<string, TempEdge>;
  /** Track a temporary edge created by edge-drop. */
  addTempEdge: (placeholderTempId: string, edge: TempEdge) => void;
  /** Remove a temporary edge after the placeholder node is confirmed or cancelled. */
  removeTempEdge: (placeholderTempId: string) => void;
  /** Position for the canvas context menu (right-click). */
  contextMenuPosition: XYPosition | null;
  /** Open the canvas context menu at the given flow coordinates. */
  setContextMenuPosition: (position: XYPosition | null) => void;
  /** Pending canvas-add request (context menu action → CanvasContainer picks up). */
  pendingCanvasAdd: { type: ModelObjectType; position: XYPosition } | null;
  /** Enqueue a canvas-add request for CanvasContainer to execute. */
  setPendingCanvasAdd: (req: { type: ModelObjectType; position: XYPosition } | null) => void;
}

interface InteractionState {
  hoveredNodeId: string | null;
  pulsedNodeIds: string[];
}

interface OptimisticNode {
  tempId: string;
  type: ModelObjectType;
  position: XYPosition;
}

/** Tracks a temporary edge created by edge-drop (handle drag onto empty canvas). */
interface TempEdge {
  edgeId: string;
  sourceId: string;
  targetId: string;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export const createCanvasSlice = (
  initialViewport: ViewportState = { x: 0, y: 0, zoom: 1 },
): StateCreator<VisceraStore, [], [], CanvasSlice> => (set, get) => ({
  viewport: initialViewport,
  overrides: {},
  nodeOverrides: {},
  basePositions: [],
  layoutVersion: 0,
  interaction: { hoveredNodeId: null, pulsedNodeIds: [] },
  fitViewRequested: false,
  layoutResetKey: 0,
  suppressAutoPersist: false,
  canUndo: false,
  canRedo: false,
  selectedNodes: [],
  selectedEdges: [],
  pendingOptimisticNodes: {},
  tempEdges: {},
  contextMenuPosition: null,
  pendingCanvasAdd: null,

  setViewport: (viewport) =>
    set(
      produce((state: VisceraStore) => {
        state.viewport = viewport;
      }),
    ),

  setOverrides: (overrides) =>
    set(
      produce((state: VisceraStore) => {
        state.overrides = overrides;
        state.nodeOverrides = overrides;
      }),
    ),

  addOverride: (nodeId, pos) =>
    set(
      produce((state: VisceraStore) => {
        state.overrides[nodeId] = pos;
        state.nodeOverrides[nodeId] = pos;
      }),
    ),

  setNodeOverride: (nodeId, position) =>
    set(
      produce((state: VisceraStore) => {
        state.nodeOverrides[nodeId] = position;
        state.overrides[nodeId] = position;
      }),
    ),

  persistNodeOverride: (nodeId, position) => {
    set(
      produce((state: VisceraStore) => {
        state.nodeOverrides[nodeId] = position;
        state.overrides[nodeId] = position;
      }),
    );
  },

  clearPersistedOverrides: () => {
    const currentState = get();
    const commandHistory = getVisceraCommandHistory();

    commandHistory.syncState(currentState);
    const command = new ResetLayoutCommand({ ...currentState.nodeOverrides });
    commandHistory.execute(command);

    set(
      produce((state: VisceraStore) => {
        state.overrides = {};
        state.nodeOverrides = {};
        state.canUndo = commandHistory.canUndo;
        state.canRedo = commandHistory.canRedo;
      }),
    );
  },

  removeOverride: (nodeId) =>
    set(
      produce((state: VisceraStore) => {
        delete state.overrides[nodeId];
        delete state.nodeOverrides[nodeId];
      }),
    ),

  clearOverrides: () =>
    set(
      produce((state: VisceraStore) => {
        state.overrides = {};
        state.nodeOverrides = {};
      }),
    ),

  setBasePositions: (positions) =>
    set(
      produce((state: VisceraStore) => {
        state.basePositions = positions;
        state.layoutVersion += 1;
      }),
    ),

  setHoveredNode: (nodeId) =>
    set(
      produce((state: VisceraStore) => {
        state.interaction.hoveredNodeId = nodeId;
      }),
    ),

  addPulsedNode: (nodeId) =>
    set(
      produce((state: VisceraStore) => {
        if (!state.interaction.pulsedNodeIds.includes(nodeId)) {
          state.interaction.pulsedNodeIds.push(nodeId);
        }
      }),
    ),

  removePulsedNode: (nodeId) =>
    set(
      produce((state: VisceraStore) => {
        state.interaction.pulsedNodeIds = state.interaction.pulsedNodeIds.filter(
          (id) => id !== nodeId,
        );
      }),
    ),

  // ── Zoom / FitView Actions ────────────────────────────────────────────

  zoomIn: () =>
    set(
      produce((state: VisceraStore) => {
        state.viewport.zoom = Math.min(state.viewport.zoom * 1.5, 4);
      }),
    ),

  zoomOut: () =>
    set(
      produce((state: VisceraStore) => {
        state.viewport.zoom = Math.max(state.viewport.zoom / 1.5, 0.1);
      }),
    ),

  fitView: () =>
    set(
      produce((state: VisceraStore) => {
        state.fitViewRequested = true;
      }),
    ),

  zoomReset: () =>
    set(
      produce((state: VisceraStore) => {
        state.viewport = { x: 0, y: 0, zoom: 1 };
      }),
    ),

  resetFitViewRequested: () =>
    set(
      produce((state: VisceraStore) => {
        state.fitViewRequested = false;
      }),
    ),

  // ── Layout Reset ───────────────────────────────────────────────────────

  incrementLayoutReset: () =>
    set(
      produce((state: VisceraStore) => {
        state.layoutResetKey += 1;
      }),
    ),

  setSuppressAutoPersist: (suppress) =>
    set(
      produce((state: VisceraStore) => {
        state.suppressAutoPersist = suppress;
      }),
    ),

  // ── Selection State (for keyboard delete) ─────────────────────────────

  setSelectedNodes: (nodes) =>
    set(
      produce((state: VisceraStore) => {
        state.selectedNodes = nodes;
      }),
    ),

  setSelectedEdges: (edges) =>
    set(
      produce((state: VisceraStore) => {
        state.selectedEdges = edges;
      }),
    ),

  // ── Undo/Redo State Sync ────────────────────────────────────────────────

  syncUndoRedoState: () => {
    const ch = getVisceraCommandHistory();
    set(
      produce((state: VisceraStore) => {
        state.canUndo = ch.canUndo;
        state.canRedo = ch.canRedo;
      }),
    );
  },

  // ── Optimistic Node Tracking ────────────────────────────────────────────

  addOptimisticNode: (node) =>
    set(
      produce((state: VisceraStore) => {
        state.pendingOptimisticNodes[node.tempId] = node;
      }),
    ),

  removeOptimisticNode: (tempId) =>
    set(
      produce((state: VisceraStore) => {
        delete state.pendingOptimisticNodes[tempId];
      }),
    ),

  // ── Temp Edge Tracking (Edge-Drop) ────────────────────────────────────────

  addTempEdge: (placeholderTempId, edge) =>
    set(
      produce((state: VisceraStore) => {
        state.tempEdges[placeholderTempId] = edge;
      }),
    ),

  removeTempEdge: (placeholderTempId) =>
    set(
      produce((state: VisceraStore) => {
        delete state.tempEdges[placeholderTempId];
      }),
    ),

  // ── Position-Accurate Context Menu ────────────────────────────────────

  setContextMenuPosition: (position) =>
    set(
      produce((state: VisceraStore) => {
        state.contextMenuPosition = position;
      }),
    ),

  setPendingCanvasAdd: (req) =>
    set(
      produce((state: VisceraStore) => {
        state.pendingCanvasAdd = req;
      }),
    ),
});

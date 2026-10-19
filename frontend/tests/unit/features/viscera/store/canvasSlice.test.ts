/**
 * Tests: canvasSlice
 *
 * Behaviour of the canvas viewport, override, interaction, zoom/fit-view,
 * selection and optimistic-tracking actions through the public store API.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('canvasSlice – viewport', () => {
  it('sets the complete viewport', () => {
    store().setViewport({ x: 10, y: 20, zoom: 2 });

    expect(store().viewport).toEqual({ x: 10, y: 20, zoom: 2 });
  });

  it('zooms in by 1.5 and caps at 4', () => {
    store().zoomIn();
    expect(store().viewport.zoom).toBe(1.5);

    store().setViewport({ x: 0, y: 0, zoom: 3 });
    store().zoomIn();
    expect(store().viewport.zoom).toBe(4);

    store().zoomIn();
    expect(store().viewport.zoom).toBe(4);
  });

  it('zooms out by 1.5 and floors at 0.1', () => {
    store().zoomOut();
    expect(store().viewport.zoom).toBeCloseTo(2 / 3, 5);

    store().setViewport({ x: 0, y: 0, zoom: 0.12 });
    store().zoomOut();
    expect(store().viewport.zoom).toBe(0.1);

    store().zoomOut();
    expect(store().viewport.zoom).toBe(0.1);
  });

  it('resets the viewport to origin and 100% zoom', () => {
    store().setViewport({ x: 42, y: -7, zoom: 2.5 });

    store().zoomReset();

    expect(store().viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('requests and clears a fit view', () => {
    store().fitView();
    expect(store().fitViewRequested).toBe(true);

    store().resetFitViewRequested();
    expect(store().fitViewRequested).toBe(false);
  });
});

describe('canvasSlice – overrides', () => {
  it('keeps both override maps in sync for every write path', () => {
    store().addOverride('api', { x: 1, y: 2 });
    expect(store().overrides.api).toEqual({ x: 1, y: 2 });
    expect(store().nodeOverrides.api).toEqual({ x: 1, y: 2 });

    store().setNodeOverride('db', { x: 3, y: 4 });
    expect(store().overrides.db).toEqual({ x: 3, y: 4 });
    expect(store().nodeOverrides.db).toEqual({ x: 3, y: 4 });

    store().persistNodeOverride('cache', { x: 5, y: 6 });
    expect(store().nodeOverrides.cache).toEqual({ x: 5, y: 6 });
  });

  it('replaces both override maps via setOverrides', () => {
    store().addOverride('old', { x: 1, y: 1 });

    store().setOverrides({ fresh: { x: 2, y: 2 } });

    expect(store().overrides).toEqual({ fresh: { x: 2, y: 2 } });
    expect(store().nodeOverrides).toEqual({ fresh: { x: 2, y: 2 } });
  });

  it('removes a single override from both maps', () => {
    store().addOverride('api', { x: 1, y: 2 });
    store().addOverride('db', { x: 3, y: 4 });

    store().removeOverride('api');

    expect(store().nodeOverrides).toEqual({ db: { x: 3, y: 4 } });
    expect(store().overrides).toEqual({ db: { x: 3, y: 4 } });
  });

  it('clears all overrides without touching the command history', () => {
    store().addOverride('api', { x: 1, y: 2 });

    store().clearOverrides();

    expect(store().nodeOverrides).toEqual({});
    expect(store().overrides).toEqual({});
    expect(store().canUndo).toBe(false);
  });

  it('records a clear-persisted-overrides step in the command history', () => {
    store().addOverride('view:api', { x: 1, y: 2 });

    store().clearPersistedOverrides();

    expect(store().nodeOverrides).toEqual({});
    expect(store().canUndo).toBe(true);
  });
});

describe('canvasSlice – layout and interaction', () => {
  it('stores base positions and bumps the layout version', () => {
    store().setBasePositions([{ id: 'api', position: { x: 0, y: 0 }, width: 200, height: 100 }]);

    expect(store().basePositions).toHaveLength(1);
    expect(store().layoutVersion).toBe(1);

    store().setBasePositions([]);
    expect(store().layoutVersion).toBe(2);
  });

  it('increments the layout reset counter', () => {
    store().incrementLayoutReset();
    store().incrementLayoutReset();

    expect(store().layoutResetKey).toBe(2);
  });

  it('sets and clears the auto-persist suppression flag', () => {
    store().setSuppressAutoPersist(true);
    expect(store().suppressAutoPersist).toBe(true);

    store().setSuppressAutoPersist(false);
    expect(store().suppressAutoPersist).toBe(false);
  });

  it('tracks the hovered node', () => {
    store().setHoveredNode('api');
    expect(store().interaction.hoveredNodeId).toBe('api');

    store().setHoveredNode(null);
    expect(store().interaction.hoveredNodeId).toBeNull();
  });

  it('tracks pulsed nodes without duplicates', () => {
    store().addPulsedNode('api');
    store().addPulsedNode('api');
    store().addPulsedNode('db');

    expect(store().interaction.pulsedNodeIds).toEqual(['api', 'db']);

    store().removePulsedNode('api');
    expect(store().interaction.pulsedNodeIds).toEqual(['db']);
  });

  it('stores selected nodes and edges', () => {
    store().setSelectedNodes([{ id: 'api', name: 'API' }]);
    store().setSelectedEdges([{ id: 'api__db' }]);

    expect(store().selectedNodes).toEqual([{ id: 'api', name: 'API' }]);
    expect(store().selectedEdges).toEqual([{ id: 'api__db' }]);
  });
});

describe('canvasSlice – optimistic tracking', () => {
  it('adds and removes optimistic nodes by temp id', () => {
    store().addOptimisticNode({ tempId: 'tmp-1', type: 'component', position: { x: 0, y: 0 } });
    expect(store().pendingOptimisticNodes['tmp-1']).toBeDefined();

    store().removeOptimisticNode('tmp-1');
    expect(store().pendingOptimisticNodes).toEqual({});
  });

  it('adds and removes temporary edges by placeholder id', () => {
    store().addTempEdge('tmp-1', { edgeId: 'e1', sourceId: 'api', targetId: 'tmp-1' });
    expect(store().tempEdges['tmp-1']).toEqual({
      edgeId: 'e1',
      sourceId: 'api',
      targetId: 'tmp-1',
    });

    store().removeTempEdge('tmp-1');
    expect(store().tempEdges).toEqual({});
  });

  it('stores and clears the context-menu position', () => {
    store().setContextMenuPosition({ x: 12, y: 34 });
    expect(store().contextMenuPosition).toEqual({ x: 12, y: 34 });

    store().setContextMenuPosition(null);
    expect(store().contextMenuPosition).toBeNull();
  });

  it('stores and clears a pending canvas add request', () => {
    store().setPendingCanvasAdd({ type: 'component', position: { x: 1, y: 2 } });
    expect(store().pendingCanvasAdd).toEqual({
      type: 'component',
      position: { x: 1, y: 2 },
    });

    store().setPendingCanvasAdd(null);
    expect(store().pendingCanvasAdd).toBeNull();
  });
});

describe('canvasSlice – undo/redo state mirror', () => {
  it('mirrors the command-history flags into the store', () => {
    store().addOverride('view:api', { x: 1, y: 2 });
    store().clearPersistedOverrides();

    store().syncUndoRedoState();

    expect(store().canUndo).toBe(true);
    expect(store().canRedo).toBe(false);
  });
});

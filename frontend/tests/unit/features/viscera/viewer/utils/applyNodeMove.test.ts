/**
 * Tests: applyNodeMove
 *
 * Verifies the finished-drag pipeline against the real store: grid snapping,
 * the override + move sync entry, the onBeforePersist ordering contract, the
 * undo source (previousPosition) and the optional group bounds.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { getVisceraCommandHistory } from '@src/features/viscera/store/visceraStore';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import {
  applyNodeMove,
  GRID,
  snapToGrid,
} from '@src/features/viscera/viewer/utils/applyNodeMove';

import { resetVisceraStore } from '../../helpers';

import type { DiagramNode } from '@src/features/viscera/store/diagramSlice';

const NODE: DiagramNode = {
  id: 'api',
  type: 'systemCard',
  data: {},
  position: { x: 0, y: 0 },
  isTransient: false,
};

beforeEach(() => {
  resetVisceraStore();
  useVisceraStore.setState({ nodes: [NODE] });
});

describe('snapToGrid', () => {
  it('fixiert das Raster auf zwanzig Flow-Einheiten', () => {
    expect(GRID).toBe(20);
  });

  it('rundet Koordinaten auf das nächste Raster-Vielfache', () => {
    expect(snapToGrid(31)).toBe(40);
    expect(snapToGrid(29)).toBe(20);
    expect(snapToGrid(20)).toBe(20);
  });

  it('rundet an der exakten halben Rasterbreite auf', () => {
    expect(snapToGrid(9)).toBe(0);
    expect(snapToGrid(10)).toBe(20);
    expect(snapToGrid(30)).toBe(40);
  });

  it('rundet negative Koordinaten auf das nächste Vielfache', () => {
    expect(snapToGrid(-11)).toBe(-20);
    expect(snapToGrid(-29)).toBe(-20);
  });
});

describe('applyNodeMove', () => {
  it('speichert die gerastete Position als Override und Move-Eintrag', () => {
    applyNodeMove('api', { x: 63, y: 41 }, 'diagram-a');

    const state = useVisceraStore.getState();
    expect(state.nodeOverrides['diagram-a:api']).toEqual({ x: 60, y: 40 });
    expect(state.syncQueue).toHaveLength(1);
    expect(state.syncQueue[0]).toMatchObject({
      nodeId: 'api',
      action: 'move',
      payload: { x: 60, y: 40, diagramKey: 'diagram-a' },
      status: 'pending',
    });
  });

  it('verschiebt den vorhandenen Node auf die gerastete Position', () => {
    applyNodeMove('api', { x: 63, y: 41 }, 'diagram-a');

    expect(useVisceraStore.getState().nodes[0].position).toEqual({ x: 60, y: 40 });
  });

  it('ruft onBeforePersist vor dem Move-Eintrag auf', () => {
    const queueLengths: number[] = [];

    applyNodeMove('api', { x: 20, y: 20 }, 'diagram-a', undefined, undefined, () => {
      queueLengths.push(useVisceraStore.getState().syncQueue.length);
    });

    expect(queueLengths).toEqual([0]);
    expect(useVisceraStore.getState().syncQueue).toHaveLength(1);
  });

  it('persistiert optionale Gruppen-Bounds', () => {
    applyNodeMove('api', { x: 20, y: 40 }, 'diagram-a', undefined, {
      width: 400,
      height: 300,
    });

    const state = useVisceraStore.getState();
    expect(state.nodeOverrides['diagram-a:api']).toEqual({
      x: 20,
      y: 40,
      width: 400,
      height: 300,
    });
    expect(state.syncQueue[0].payload).toMatchObject({ width: 400, height: 300 });
  });

  it('nutzt previousPosition als Undo-Quelle ohne vorherigen Override', () => {
    applyNodeMove('api', { x: 20, y: 20 }, 'diagram-a', { x: 100, y: 200 });

    const undone = getVisceraCommandHistory().undo();

    expect(undone.nodeOverrides['diagram-a:api']).toEqual({ x: 100, y: 200 });
  });

  it('entfernt den Override beim Undo, wenn keine Vorposition existiert', () => {
    applyNodeMove('api', { x: 20, y: 20 }, 'diagram-a');

    const undone = getVisceraCommandHistory().undo();

    expect(undone.nodeOverrides['diagram-a:api']).toBeUndefined();
  });

  it('aktualisiert die Undo-/Redo-Flags im Store', () => {
    applyNodeMove('api', { x: 20, y: 20 }, 'diagram-a');

    expect(useVisceraStore.getState().canUndo).toBe(true);
    expect(useVisceraStore.getState().canRedo).toBe(false);
  });

  it('führt den Move auch ohne onBeforePersist aus', () => {
    applyNodeMove('api', { x: 40, y: 40 }, 'diagram-a');

    expect(useVisceraStore.getState().syncQueue).toHaveLength(1);
    expect(useVisceraStore.getState().nodeOverrides['diagram-a:api']).toEqual({ x: 40, y: 40 });
  });
});

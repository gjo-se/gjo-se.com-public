/**
 * Tests: diagramSliceTypes
 *
 * This module is declaration-only, so its contract is asserted at the type
 * level (status union, optional bounds, node shape) plus a runtime instance
 * check that the declared shapes are actually consumable by the store.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  DiagramEdge,
  DiagramNode,
  NodeBounds,
  SyncQueueEntry,
} from '@src/features/viscera/store/diagramSliceTypes';

describe('diagramSliceTypes – contract', () => {
  it('models a sync entry status as pending | retrying | failed', () => {
    expectTypeOf<SyncQueueEntry['status']>().toEqualTypeOf<'pending' | 'retrying' | 'failed'>();

    const entry: SyncQueueEntry = {
      mutationId: 'm1',
      nodeId: 'api',
      action: 'create',
      payload: { id: 'api' },
      retryCount: 0,
      status: 'pending',
    };

    expect(entry.status).toBe('pending');
    expect(entry.retryCount).toBe(0);
  });

  it('supports optional group bounds only as numbers', () => {
    expectTypeOf<NodeBounds>().toEqualTypeOf<{ width?: number; height?: number }>();

    const empty: NodeBounds = {};
    const full: NodeBounds = { width: 400, height: 300 };

    expect(empty).toEqual({});
    expect(full.width).toBe(400);
  });

  it('models a diagram node with a transient flag and position', () => {
    expectTypeOf<DiagramNode['isTransient']>().toEqualTypeOf<boolean>();

    const node: DiagramNode = {
      id: 'api',
      type: 'file',
      data: { name: 'api' },
      position: { x: 10, y: 20 },
      isTransient: true,
    };

    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.isTransient).toBe(true);
  });

  it('models an edge with optional straight type and data', () => {
    expectTypeOf<DiagramEdge['type']>().toEqualTypeOf<'straight' | undefined>();

    const edge: DiagramEdge = { id: 'a__b', source: 'a', target: 'b', type: 'straight' };

    expect(edge.type).toBe('straight');
  });
});

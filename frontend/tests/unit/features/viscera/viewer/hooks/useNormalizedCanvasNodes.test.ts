/**
 * Tests: useNormalizedCanvasNodes
 *
 * Verifies the override projection at render time: nodes without an override
 * stay untouched, absolute overrides are applied directly, group members get
 * positions relative to their group's resolved position, and the parent extent
 * is stripped from members.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useNormalizedCanvasNodes } from '@src/features/viscera/viewer/hooks/useNormalizedCanvasNodes';

import type { Node } from '@xyflow/react';

function makeNode(patch: Partial<Node>): Node {
  return { id: 'node', position: { x: 0, y: 0 }, data: {}, ...patch };
}

describe('useNormalizedCanvasNodes', () => {
  it('returns nodes unchanged when no override exists', () => {
    const nodes = [makeNode({ id: 'api', position: { x: 10, y: 20 } })];

    const { result } = renderHook(() =>
      useNormalizedCanvasNodes({ nodes, nodeOverrides: {}, currentViewKey: 'view-a' }),
    );

    expect(result.current[0]).toBe(nodes[0]);
  });

  it('applies an absolute override for the active diagram only', () => {
    const nodes = [makeNode({ id: 'api' })];

    const { result } = renderHook(() =>
      useNormalizedCanvasNodes({
        nodes,
        nodeOverrides: { 'view-a:api': { x: 100, y: 200 }, 'view-b:api': { x: 1, y: 2 } },
        currentViewKey: 'view-a',
      }),
    );

    expect(result.current[0]?.position).toEqual({ x: 100, y: 200 });
  });

  it('converts absolute member overrides into group-relative positions', () => {
    const nodes = [
      makeNode({ id: 'group', position: { x: 0, y: 0 } }),
      makeNode({ id: 'child', position: { x: 5, y: 5 }, parentId: 'group', extent: 'parent' }),
    ];

    const { result } = renderHook(() =>
      useNormalizedCanvasNodes({
        nodes,
        nodeOverrides: {
          'view:group': { x: 50, y: 60 },
          'view:child': { x: 80, y: 100 },
        },
        currentViewKey: 'view',
      }),
    );

    expect(result.current[1]?.position).toEqual({ x: 30, y: 40 });
    expect(result.current[1]?.extent).toBeUndefined();
  });

  it('strips the parent extent from members even without an override', () => {
    const nodes = [makeNode({ id: 'child', parentId: 'group', extent: 'parent' })];

    const { result } = renderHook(() =>
      useNormalizedCanvasNodes({ nodes, nodeOverrides: {}, currentViewKey: 'view' }),
    );

    expect(result.current[0]?.extent).toBeUndefined();
  });

  it('keeps the extent of nodes without a parent', () => {
    const nodes = [makeNode({ id: 'root', extent: 'parent' })];

    const { result } = renderHook(() =>
      useNormalizedCanvasNodes({ nodes, nodeOverrides: {}, currentViewKey: 'view' }),
    );

    expect(result.current[0]?.extent).toBe('parent');
  });
});

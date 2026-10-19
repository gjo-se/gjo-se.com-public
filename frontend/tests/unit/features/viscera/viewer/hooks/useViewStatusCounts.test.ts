/**
 * Tests: useViewStatusCounts
 *
 * Verifies per-diagram counting of pending/scan-missing objects, the node-map
 * membership filter, and the omission of diagrams without relevant objects.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useViewStatusCounts } from '@src/features/viscera/viewer/hooks/useViewStatusCounts';

import { makeDiagram, makeObject, makeWorkspace } from '../../helpers';

describe('useViewStatusCounts', () => {
  it('returns an empty record without a workspace', () => {
    const { result } = renderHook(() => useViewStatusCounts(null));

    expect(result.current).toEqual({});
  });

  it('counts pending and scan-missing objects per diagram', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'a', name: 'A', status: 'viscera-pending' }),
        makeObject({ id: 'b', name: 'B', status: 'viscera-pending' }),
        makeObject({ id: 'c', name: 'C', status: 'viscera-scan_missing' }),
        makeObject({ id: 'd', name: 'D', status: 'viscera-approved' }),
      ],
      diagrams: [
        makeDiagram({
          key: 'one',
          nodes: { a: { x: 0, y: 0 }, c: { x: 0, y: 0 } },
        }),
        makeDiagram({
          key: 'two',
          nodes: { b: { x: 0, y: 0 }, d: { x: 0, y: 0 } },
        }),
      ],
    });

    const { result } = renderHook(() => useViewStatusCounts(workspace));

    expect(result.current).toEqual({
      one: { pending: 1, scan_missing: 1 },
      two: { pending: 1, scan_missing: 0 },
    });
  });

  it('omits diagrams without pending or scan-missing nodes', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'a', name: 'A', status: 'viscera-approved' })],
      diagrams: [makeDiagram({ key: 'clean', nodes: { a: { x: 0, y: 0 } } })],
    });

    const { result } = renderHook(() => useViewStatusCounts(workspace));

    expect(result.current).toEqual({});
  });

  it('only counts objects that are part of the diagram node map', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'inside', name: 'Inside', status: 'viscera-pending' }),
        makeObject({ id: 'outside', name: 'Outside', status: 'viscera-pending' }),
      ],
      diagrams: [makeDiagram({ key: 'one', nodes: { inside: { x: 0, y: 0 } } })],
    });

    const { result } = renderHook(() => useViewStatusCounts(workspace));

    expect(result.current.one).toEqual({ pending: 1, scan_missing: 0 });
  });
});

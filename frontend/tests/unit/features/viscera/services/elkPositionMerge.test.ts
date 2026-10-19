/**
 * Tests: elkPositionMerge
 *
 * Behaviour: ELK positions are converted to React Flow node positions, manual
 * overrides win on x/y, dimensions always come from the ELK result.
 */

import { describe, expect, it } from 'vitest';

import { toNodePositions } from '@src/features/viscera/services/elkPositionMerge';

import type { LayoutPosition } from '@src/features/viscera/services/elkAdapter';

function elkMap(entries: Record<string, LayoutPosition>): Map<string, LayoutPosition> {
  return new Map(Object.entries(entries));
}

describe('toNodePositions', () => {
  it('returns an empty list for an empty layout', () => {
    expect(toNodePositions(new Map(), new Map())).toEqual([]);
  });

  it('uses the ELK position and dimensions when no override exists', () => {
    const positions = toNodePositions(
      elkMap({ api: { x: 20, y: 40, width: 200, height: 100 } }),
      new Map(),
    );

    expect(positions).toEqual([
      { id: 'api', position: { x: 20, y: 40 }, width: 200, height: 100 },
    ]);
  });

  it('replaces x/y with the manual override but keeps ELK dimensions', () => {
    const positions = toNodePositions(
      elkMap({ api: { x: 20, y: 40, width: 200, height: 100 } }),
      new Map([['api', { x: 300, y: 400 }]]),
    );

    expect(positions[0]).toEqual({
      id: 'api',
      position: { x: 300, y: 400 },
      width: 200,
      height: 100,
    });
  });

  it('honours an override at exactly 0/0 (not treated as missing)', () => {
    const positions = toNodePositions(
      elkMap({ api: { x: 80, y: 90, width: 200, height: 100 } }),
      new Map([['api', { x: 0, y: 0 }]]),
    );

    expect(positions[0]?.position).toEqual({ x: 0, y: 0 });
  });

  it('only overrides the node that has an entry', () => {
    const positions = toNodePositions(
      elkMap({
        api: { x: 20, y: 40, width: 200, height: 100 },
        db: { x: 220, y: 40, width: 200, height: 100 },
      }),
      new Map([['api', { x: 1, y: 2 }]]),
    );

    expect(positions).toEqual([
      { id: 'api', position: { x: 1, y: 2 }, width: 200, height: 100 },
      { id: 'db', position: { x: 220, y: 40 }, width: 200, height: 100 },
    ]);
  });
});

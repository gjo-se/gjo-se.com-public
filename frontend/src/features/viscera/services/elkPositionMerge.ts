import type { LayoutPosition, NodePosition } from './elkAdapter';

// ── Position Merge ────────────────────────────────────────────────────────────

/**
 * Convert Map<string, LayoutPosition> to NodePosition[] for React Flow.
 * Applies manual overrides, keeping width/height from ELK computation.
 */
export function toNodePositions(
  elkPositions: Map<string, LayoutPosition>,
  overrides: Map<string, { x: number; y: number }>,
): NodePosition[] {
  const results: NodePosition[] = [];
  elkPositions.forEach((pos, id) => {
    const override = overrides.get(id);
    results.push({
      id,
      position: {
        x: override?.x ?? pos.x,
        y: override?.y ?? pos.y,
      },
      width: pos.width,
      height: pos.height,
    });
  });
  return results;
}

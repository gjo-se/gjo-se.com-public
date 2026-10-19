import { Handle, Position } from '@xyflow/react';

// ── Style ──────────────────────────────────────────────────────────────────────

/** Indigo handle fill used across the canvas. */
const HANDLE_COLOR = '#6366f1';
/** Handle size in px (larger than the plain `NodeEdgeHandles` variant). */
const HANDLE_SIZE = 10;

const HANDLE_STYLE = {
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  background: HANDLE_COLOR,
  border: '2px solid #fff',
} as const;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CardEdgeHandlesProps {
  /**
   * Layering direction of the current diagram – `'down'` (vertical) or `'lr'`
   * (horizontal). Determines the handle orientation and ids so edges attach in
   * the diagram's flow direction.
   */
  layoutDirection: 'lr' | 'down';
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Layout-aware source/target edge handles of a card node.
 *
 * Vertical layering (`down`) puts the source at the bottom and the target at the
 * top; horizontal layering (`lr`) puts them right/left respectively.
 */
export default function CardEdgeHandles({ layoutDirection }: CardEdgeHandlesProps) {
  const isVertical = layoutDirection === 'down';

  return (
    <>
      <Handle
        type="source"
        position={isVertical ? Position.Bottom : Position.Right}
        id={isVertical ? 'source-bottom' : 'source-right'}
        isConnectable
        style={HANDLE_STYLE}
      />
      <Handle
        type="target"
        position={isVertical ? Position.Top : Position.Left}
        id={isVertical ? 'target-top' : 'target-left'}
        isConnectable
        style={HANDLE_STYLE}
      />
    </>
  );
}

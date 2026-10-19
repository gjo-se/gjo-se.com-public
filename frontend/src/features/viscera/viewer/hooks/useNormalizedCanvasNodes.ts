import { useMemo } from 'react';

import { overrideKey } from '../../core/nodeOverrides';

import type { OverridePosition } from '../../core/nodeOverrides';
import type { Node, XYPosition } from '@xyflow/react';

export interface UseNormalizedCanvasNodesInput<T extends Node = Node> {
  /** React Flow nodes from the local canvas state (useNodesState). */
  nodes: T[];
  /** Manual position overrides, keyed by `${diagramKey}:${nodeId}` (#2229). */
  nodeOverrides: Record<string, OverridePosition>;
  /** Key of the active diagram — builds the composite override keys. */
  currentViewKey: string;
}

// ── Node Position Normalization (#2294) ──────────────────────────────────
//
// nodeOverrides hold ABSOLUTE flow coordinates (state + persistence SSOT).
// ReactFlow expects RELATIVE positions for nodes with parentId (group
// members) — convert here at rendering time so the store stays absolute
// while the canvas renders correctly. Nodes without an override keep their
// layout position untouched.
//
// Positions are resolved from the live nodeOverrides so that members
// follow a group that is currently being dragged (#2295 group drag).
//
// ``extent: 'parent'`` is stripped here as well: React Flow v12 clamps
// parent-extent children to the group bounds on RENDER (not only during
// drags), which would pin members inside their group and block dragging
// them out (#2295). React Flow dragging is disabled — the extent has no
// other purpose on this canvas.

/**
 * Applies absolute nodeOverrides as relative React Flow positions at render time.
 *
 * Group members get their override converted relative to the group position
 * (which follows a dragged group via the live override). The `extent: 'parent'`
 * flag is stripped from members so React Flow does not clamp them to the
 * group bounds on render (#2295).
 */
export function useNormalizedCanvasNodes<T extends Node = Node>({
  nodes,
  nodeOverrides,
  currentViewKey,
}: UseNormalizedCanvasNodesInput<T>): T[] {
  return useMemo(() => {
    const positionById = new Map<string, XYPosition>();
    nodes.forEach((n) => {
      const override = nodeOverrides[overrideKey(currentViewKey, n.id)];
      positionById.set(n.id, override ?? { x: n.position.x, y: n.position.y });
    });

    return nodes.map((n) => {
      const override = nodeOverrides[overrideKey(currentViewKey, n.id)];
      const isMember = n.parentId != null;

      if (!override && !isMember) return n;

      let position = n.position;
      if (override) {
        const parentPosition = n.parentId != null ? positionById.get(n.parentId) : undefined;
        position =
          isMember && parentPosition
            ? { x: override.x - parentPosition.x, y: override.y - parentPosition.y }
            : { x: override.x, y: override.y };
      }

      return {
        ...n,
        position,
        extent: isMember ? undefined : n.extent,
      };
    });
  }, [nodes, nodeOverrides, currentViewKey]);
}

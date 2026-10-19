/**
 * canvasPlaceholder – shared helpers for the ReactFlow canvas placeholder nodes.
 *
 * Extracted from useCanvasContextMenu / useCanvasEdgeHandlers (#2370): the
 * CardKind↔node-type mapping, the type label, and the builder for an editing
 * placeholder CardNode (inline name editing → confirm/cancel). Both canvas
 * hooks build the same placeholder node; the builder keeps the confirm/cancel
 * semantics in one place.
 */

import { getCardKind, NODE_TYPE_BY_KIND } from '../../core/cardKindRegistry';
import { CARD } from '../../core/nodeDimensions';

import type { ModelObjectType } from '../../core/workspaceSchema';
import type { Node, XYPosition } from '@xyflow/react';

export interface CanvasPlaceholderCallbacks {
  /** Callback for placeholder node confirm (Enter on inline name input). */
  onConfirmPlaceholder?: (
    tempId: string,
    name: string,
    opts?: { sourceNodeId?: string },
  ) => Promise<Record<string, unknown> | null>;
  /** Callback for placeholder node cancel (Escape or × button). */
  onCancelPlaceholder?: (tempId: string) => void;
}

export interface PlaceholderNodeParams {
  /** Temporary node id used until the entity is persisted. */
  tempId: string;
  /** Object type the placeholder represents. */
  type: ModelObjectType;
  /** Flow position for the placeholder. */
  position: XYPosition;
  /** ReactFlow setNodes from the canvas instance. */
  setNodes: SetNodes;
  onConfirmPlaceholder?: CanvasPlaceholderCallbacks['onConfirmPlaceholder'];
  onCancelPlaceholder?: CanvasPlaceholderCallbacks['onCancelPlaceholder'];
  /** Forwarded to onConfirmPlaceholder as `opts.sourceNodeId` (edge-drop origin). */
  sourceNodeId?: string;
  /** Replace the placeholder id with the persisted entity id on successful confirm. */
  remapIdOnConfirm?: boolean;
  /** Called after a successful confirm with the resolved entity id. */
  onConfirmed?: (resolvedId: string) => void;
  /** Called on cancel, before onCancelPlaceholder. */
  onCancelled?: () => void;
}

type SetNodes = (updater: (nodes: Node[]) => Node[]) => void;

/**
 * Builds an editing placeholder CardNode that persists through
 * `onConfirmPlaceholder` on Enter (or shows an error) and is removed on cancel.
 */
export function buildPlaceholderNode({
  tempId,
  type,
  position,
  setNodes,
  onConfirmPlaceholder,
  onCancelPlaceholder,
  sourceNodeId,
  remapIdOnConfirm = false,
  onConfirmed,
  onCancelled,
}: PlaceholderNodeParams): Node {
  const kind = getCardKind(type);
  return {
    id: tempId,
    type: NODE_TYPE_BY_KIND[kind],
    position,
    data: {
      name: '',
      kind,
      cardWidth: CARD.width,
      cardHeight: CARD.height,
      isEditing: true,
      editingLabel: `New ${typeLabel(type)}`,
      onConfirmEdit: async (name: string) => {
        const result = await onConfirmPlaceholder?.(tempId, name, sourceNodeId ? { sourceNodeId } : undefined);
        if (!result) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === tempId
                ? { ...n, data: { ...(n.data as Record<string, unknown>), editingError: 'Fehler beim Speichern' } }
                : n,
            ),
          );
          return;
        }
        const resultId = (result.id as string) || tempId;
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id !== tempId) return n;
            return {
              ...n,
              ...(remapIdOnConfirm ? { id: resultId } : {}),
              data: { ...(n.data as Record<string, unknown>), name, isEditing: false },
            };
          }),
        );
        onConfirmed?.(resultId);
      },
      onCancelEdit: () => {
        setNodes((nds) => nds.filter((n) => n.id !== tempId));
        onCancelled?.();
        onCancelPlaceholder?.(tempId);
      },
    },
  };
}

/** Returns the capitalized display label for a model object type. */
function typeLabel(type: ModelObjectType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

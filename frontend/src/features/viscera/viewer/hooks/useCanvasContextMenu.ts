import { useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';

import { useVisceraStore } from '../../store/visceraStore';
import { buildPlaceholderNode } from '../utils/canvasPlaceholder';

import type { ModelObjectType } from '../../core/workspaceSchema';
import type { CanvasPlaceholderCallbacks } from '../utils/canvasPlaceholder';
import type { XYPosition } from '@xyflow/react';
import type { RefObject } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseCanvasContextMenuResult {
  /** Ref for the context menu container — used for the outside-click guard. */
  contextMenuRef: RefObject<HTMLDivElement | null>;
  /** Current context menu screen position (null while closed). */
  contextMenuPosition: XYPosition | null;
  /** Right-click on the canvas pane: opens the context menu at the cursor. */
  onPaneContextMenu: (event: React.MouseEvent | MouseEvent) => void;
  /** Menu action: creates an editing placeholder CardNode at the menu position. */
  handleContextMenuAction: (type: ModelObjectType) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Context-menu concern of the ReactFlow canvas (extracted from
 * CanvasContainer, #2370): pane right-click menu state, type-selection
 * action (placeholder node creation), the outside-click/Escape close
 * effect, and the pending-canvas-add watcher that consumes store requests
 * from the keyboard shortcut.
 */
export function useCanvasContextMenu({
  onConfirmPlaceholder,
  onCancelPlaceholder,
}: CanvasPlaceholderCallbacks): UseCanvasContextMenuResult {
  const { screenToFlowPosition, addNodes, setNodes } = useReactFlow();

  const contextMenuPosition = useVisceraStore((s) => s.contextMenuPosition);
  const pendingCanvasAdd = useVisceraStore((s) => s.pendingCanvasAdd);

  // ── Context Menu Handler ────────────────────────────────────────────────

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      // Store screen coordinates for menu positioning
      useVisceraStore.getState().setContextMenuPosition({ x: event.clientX, y: event.clientY });
    },
    [],
  );

  // ── Context Menu Action: create placeholder node ────────────────────────

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenuAction = useCallback(
    (type: ModelObjectType) => {
      const screenPos = useVisceraStore.getState().contextMenuPosition;
      if (!screenPos) return;

      useVisceraStore.getState().setContextMenuPosition(null);

      // Convert screen coordinates to flow coordinates for node placement
      const pos = screenToFlowPosition({ x: screenPos.x, y: screenPos.y });
      const tempId = crypto.randomUUID();

      addNodes([
        buildPlaceholderNode({
          tempId,
          type,
          position: pos,
          setNodes,
          onConfirmPlaceholder,
          onCancelPlaceholder,
        }),
      ]);

      useVisceraStore.getState().addOptimisticNode({ tempId, type, position: pos });
    },
    [addNodes, setNodes, screenToFlowPosition, onConfirmPlaceholder, onCancelPlaceholder],
  );

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenuPosition) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        useVisceraStore.getState().setContextMenuPosition(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useVisceraStore.getState().setContextMenuPosition(null);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuPosition]);

  // ── Pending Canvas Add Watcher ──────────────────────────────────────────

  useEffect(() => {
    if (!pendingCanvasAdd) return;

    const { type, position } = pendingCanvasAdd;
    useVisceraStore.getState().setPendingCanvasAdd(null);

    // Convert screen coordinates to flow coordinates for node placement
    const flowPos = screenToFlowPosition({ x: position.x, y: position.y });
    const tempId = crypto.randomUUID();

    addNodes([
      buildPlaceholderNode({
        tempId,
        type,
        position: flowPos,
        setNodes,
        remapIdOnConfirm: true,
        onConfirmPlaceholder,
        onCancelPlaceholder,
      }),
    ]);

    useVisceraStore.getState().addOptimisticNode({ tempId, type, position: flowPos });
  }, [pendingCanvasAdd, addNodes, setNodes, screenToFlowPosition, onConfirmPlaceholder, onCancelPlaceholder]);

  return { contextMenuRef, contextMenuPosition, onPaneContextMenu, handleContextMenuAction };
}

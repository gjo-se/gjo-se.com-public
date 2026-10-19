import { useVisceraStore } from '../../store/visceraStore';

import type { ModelObjectType } from '../../core/workspaceSchema';
import type { XYPosition } from '@xyflow/react';

/**
 * Creates canvas interaction handlers for adding nodes via double-click,
 * the context menu, or the AddNodeOverlay trigger.
 *
 * The factory takes no dependencies: all state lives in the viscera store
 * (`pendingCanvasAdd`, `contextMenuPosition`), which is accessed via
 * `getState()` outside the React render cycle.
 */
export function createCanvasCommands() {
  /**
   * Enqueues a placeholder creation request at the given (optional) position.
   * If position is omitted, the caller should set addOverlayPosition separately.
   * CanvasContainer picks up pendingCanvasAdd via useEffect and creates the node.
   */
  const handleCanvasAdd = (type: ModelObjectType, position?: XYPosition) => {
    if (position) {
      useVisceraStore.getState().setPendingCanvasAdd({ type, position });
    }
  };

  /** Stores the right-click position for the canvas context menu. */
  const handleCanvasContextMenu = (position: XYPosition) => {
    useVisceraStore.getState().setContextMenuPosition(position);
  };

  /** Context menu action: creates node at stored position, then closes the menu. */
  const handleCanvasContextMenuAction = (type: ModelObjectType) => {
    const pos = useVisceraStore.getState().contextMenuPosition;
    if (pos) {
      useVisceraStore.getState().setContextMenuPosition(null);
      handleCanvasAdd(type, pos);
    }
  };

  return {
    handleCanvasAdd,
    handleCanvasContextMenu,
    handleCanvasContextMenuAction,
  };
}

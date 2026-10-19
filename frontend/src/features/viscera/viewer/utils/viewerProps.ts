import type { Diagram } from '../../core/workspaceSchema';
import type { GroupCreateOutcome } from '../hooks/useViewerActions';
import type { XYPosition } from '@xyflow/react';

/**
 * Diagram-interaction callbacks and state shared by the viscera viewer shell
 * components (`DiagramViewer`, `VisceraReactFlow`, `CanvasContainer`).
 */
export interface ViewerDiagramCallbacks {
  /** Materialisiert das derived-Diagramm bei erster Kuration (VOR persist_layout). */
  onBeforePersist?: (diagramKey: string) => void;
  /** Creates a container node from the AddNodeOverlay. */
  onCreateContainer?: (systemId: string) => void;
  /** Creates a component node from the AddNodeOverlay. */
  onCreateComponent?: (containerId: string) => void;
  /** Callback for placeholder node confirm (Enter on inline name input). */
  onConfirmPlaceholder?: (
    tempId: string,
    name: string,
    opts?: { sourceNodeId?: string },
  ) => Promise<Record<string, unknown> | null>;
  /** Callback for placeholder node cancel (Escape or × button). */
  onCancelPlaceholder?: (tempId: string) => void;
  /** Active diagram object — candidate scope for AddNodeOverlay (#2268). */
  activeDiagram?: Diagram | null;
  /** Assigns existing node IDs to the active diagram (#2268). */
  onAssignExistingNode?: (objectIds: string[]) => void;
  /** Creates a new group from the AddNodeOverlay "Neue Group" section (#2276). */
  onCreateGroup?: (name: string, position: XYPosition) => Promise<GroupCreateOutcome>;
  /** Renames a group via the GroupNode context menu (#2278). */
  onRenameGroup?: (id: string, name: string) => void;
  /** Deletes a group via the GroupNode context menu (#2278). */
  onDeleteGroup?: (id: string) => void;
}

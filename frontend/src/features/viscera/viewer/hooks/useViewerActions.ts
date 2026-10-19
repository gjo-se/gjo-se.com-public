import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildDerivedDiagram,
  buildDerivedDiagramKey,
  type DerivedDiagramLevel,
} from '../../core/derivedDiagram';
import { useWorkspace } from '../../core/useWorkspace';
import { useFlow } from '../../hooks/useFlow';
import { useFlows } from '../../hooks/useFlows';
import { useViewState } from '../../hooks/useViewState';
import { withHoveredBadgeFocus } from '../../store/badgeSelectors';
import {
  selectIsFullscreen,
  selectBadgeStates,
  selectHoveredKey,
  selectShortcutsOpen,
  selectIsCanvasEmpty,
  selectCanUndo,
  selectCanRedo,
} from '../../store/selectors';
import {
  useVisceraStore,
  syncFilterFromUrl,
} from '../../store/visceraStore';
import { createCanvasCommands } from '../services/canvasCommands';
import {
  createDeleteCommands,
  type DeleteDialogState,
} from '../services/deleteCommands';
import {
  createDiagramCommands,
  createDiagramDerivedState,
  createMaterializeDerivedDiagramCommand,
  type DiagramDialogState,
} from '../services/diagramCommands';
import {
  createDiagramReviewCommands,
  type AssignDiagramDialogState,
} from '../services/diagramReviewCommands';
import { createGroupCommands } from '../services/groupCommands';
export type { GroupCreateOutcome } from '../services/groupCommands';
import {
  createObjectCommands,
  type CreateObjectDialogState,
} from '../services/objectCommands';
import { createUndoRedoCommands } from '../services/undoRedoCommands';
import { computeFilteredNodeIds } from '../utils/computeFilteredNodeIds';

import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useScanCode } from './useScanCode';
import { useViewStatusCounts } from './useViewStatusCounts';


import type { DiagramSource } from '../../core/workspaceSchema';

/**
 * Central coordination hook for the VisceraViewsPage.
 *
 * Extracts all state, callbacks, and computed values that the page needs
 * for pure JSX composition. No useState, useCallback, or useMemo with
 * business logic remains in the page itself.
 */
export function useViewerActions() {
  // ── View State ─────────────────────────────────────────────────────────
  const {
    objectId,
    setObjectId,
    currentViewKey,
    setViewKey,
  } = useViewState();

  // ── Diagram World (Source) ─────────────────────────────────────────────
  const source = useVisceraStore((s) => s.source);
  const handleSourceChange = useCallback((next: DiagramSource) => {
    // setSource resets view/derived state (analog View-Wechsel); WorkspaceProvider
    // subscribed to `source` reloads the workspace for the new world.
    useVisceraStore.getState().setSource(next);
  }, []);

  // ── Workspace ──────────────────────────────────────────────────────────
  const { workspace, error, loading, reload, updateWorkspace } = useWorkspace();

  // ── Derived Diagram State (Navigation) ─────────────────────────────────
  const setDerivedDiagram = useVisceraStore((s) => s.setDerivedDiagram);

  // ── Fullscreen (Store) ─────────────────────────────────────────────────
  const isFullscreen = useVisceraStore(selectIsFullscreen);
  const toggleFullscreen = useCallback(
    () => useVisceraStore.getState().toggleFullscreen(),
    [],
  );

  // ── Layout Reset (Store) ───────────────────────────────────────────────
  const layoutResetKey = useVisceraStore((s) => s.layoutResetKey);
  const resetLayout = useCallback(() => {
    // Clear persisted overrides + saved lastUrl BEFORE incrementing the layout key,
    // so the subsequent re-layout computes fresh ELK positions.
    useVisceraStore.getState().clearPersistedOverrides();
    useVisceraStore.getState().clearLastUrl(currentViewKey || 'SystemContext');
    // Clear persisted positions in diagram YAML so ELK runs fresh (#2232)
    const dk = currentViewKey || 'SystemContext';
    useVisceraStore.getState().persistLayout(dk, {});
    // Suppress the initial-layout auto-persist for the upcoming layout run (#2523):
    // resetLayout clears the diagram YAML nodes map; the re-layout must NOT write
    // ELK positions back, otherwise the file gets repopulated (incl. stale nodes).
    useVisceraStore.getState().setSuppressAutoPersist(true);
    useVisceraStore.getState().incrementLayoutReset();
  }, [currentViewKey]);

  // ── Filter (Store) ─────────────────────────────────────────────────────
  const badgeStates = useVisceraStore(selectBadgeStates);
  const hoveredKey = useVisceraStore(selectHoveredKey);
  const resetAll = useVisceraStore((s) => s.resetAll);

  // Compute effective badge states including transient hover focus.
  // MUST use useMemo — NOT a Zustand selector. Zustand selectors are called on
  // every render and compared with Object.is. Returning `new Map(...)` from a
  // selector would produce a fresh reference every call, causing an infinite
  // re-render loop (Zustand sees a new value → re-render → new Map → …).
  const effectiveBadgeStates = useMemo(
    () => withHoveredBadgeFocus(badgeStates, hoveredKey),
    [badgeStates, hoveredKey],
  );

  // Sync filter state from URL on mount
  useEffect(() => {
    syncFilterFromUrl(useVisceraStore);
  }, []);

  // ── Filtered Node IDs ──────────────────────────────────────────────────
  const filteredNodeIds = useMemo(
    () => {
      if (!workspace) return { dimmedNodeIds: new Set<string>(), hiddenNodeIds: new Set<string>() };
      return computeFilteredNodeIds(workspace, effectiveBadgeStates);
    },
    [workspace, effectiveBadgeStates],
  );
  const { dimmedNodeIds, hiddenNodeIds } = filteredNodeIds;

  // ── Scan Code ──────────────────────────────────────────────────────────
  const scanCode = useScanCode();

  // ── Flows ──────────────────────────────────────────────────────────────
  const { flows, activeFlow, selectFlow, getParentFlows, getSubFlows } = useFlows();
  const flowControls = useFlow(activeFlow);

  // ── Undo/Redo ───────────────────────────────────────────────────────────
  const canUndo = useVisceraStore(selectCanUndo);
  const canRedo = useVisceraStore(selectCanRedo);
  const { onUndo, onRedo } = useMemo(() => createUndoRedoCommands(), []);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────
  const shortcutsOpen = useVisceraStore(selectShortcutsOpen);

  // ── Delete Confirmation Dialog ──────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    nodes: [],
    edges: [],
    deleting: false,
  });
  const deleteCommands = useMemo(
    () => createDeleteCommands({ deleteDialog, setDeleteDialog, setObjectId }),
    [deleteDialog, setObjectId],
  );
  const {
    handleDeleteSelectedElements,
    handleDeleteConfirm,
    handleDeleteCancel,
  } = deleteCommands;

  // ── Create Object Dialog ────────────────────────────────────────────────
  const [createObjectDialog, setCreateObjectDialog] = useState<CreateObjectDialogState>({
    open: false,
    prefill: undefined,
    isSubmitting: false,
    error: null,
  });
  const objectCommands = useMemo(
    () => createObjectCommands({ setCreateObjectDialog, setObjectId }),
    [setObjectId],
  );
  const {
    handleCreateObject,
    handleCreateContainer,
    handleCreateComponent,
    handleCreateObjectClose,
    handleCreateObjectSubmit,
    handleConfirmPlaceholder,
    handleCancelPlaceholder,
  } = objectCommands;

  useKeyboardShortcuts(toggleFullscreen, handleDeleteSelectedElements);

  // ── Group Commands (#2276 / #2278) ──────────────────────────────────────
  const groupCommands = useMemo(
    () => createGroupCommands({ workspace, updateWorkspace }),
    [workspace, updateWorkspace],
  );
  const {
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
  } = groupCommands;

  // ── Canvas Add Commands: Double-Click & Context Menu ────────────────────
  const canvasCommands = useMemo(() => createCanvasCommands(), []);
  const {
    handleCanvasAdd,
    handleCanvasContextMenu,
    handleCanvasContextMenuAction,
  } = canvasCommands;

  // ── Callback Handlers ──────────────────────────────────────────────────
  const handleViewKeyChange = useCallback(
    (key: string) => setViewKey(key),
    [setViewKey],
  );

  /**
   * Opens a derived L3 (component) / L4 (module) view for a container/component
   * parent. Navigates via `setViewKey` + registers an ephemeral `derivedDiagram`
   * in the store — kein API-Call, kein Datei-Write (lazy Lebenszyklus, #2491).
   * Persistiertes Diagramm mit demselben deterministischen Key gewinnt.
   */
  const handleOpenDerivedView = useCallback(
    (parentId: string, level: DerivedDiagramLevel) => {
      if (!workspace) return;
      const key = buildDerivedDiagramKey(parentId, level);
      const persisted = (workspace.diagrams ?? []).find((d) => d.key === key);
      setViewKey(key);
      if (!persisted) {
        setDerivedDiagram(buildDerivedDiagram(parentId, level));
      }
    },
    [workspace, setViewKey, setDerivedDiagram],
  );

  /**
   * Materialisiert das ephemeren derived-Diagramm bei der ersten Kuration:
   * optimistisch zu `workspace.diagrams` (updateWorkspace) + `create_diagram`-Sync
   * queueen, danach `derivedDiagram` clearen (#2491). Delegiert an den Command.
   */
  const materializeDerivedDiagram = useCallback(() => {
    const store = useVisceraStore.getState();
    const derived = store.derivedDiagram;
    if (!derived || !workspace) return;
    createMaterializeDerivedDiagramCommand({ workspace, updateWorkspace, derivedDiagram: derived });
    store.clearDerivedDiagram();
  }, [workspace, updateWorkspace]);

  const handleObjectClick = useCallback(
    (id: string) => setObjectId(id),
    [setObjectId],
  );

  const handleClosePanel = useCallback(() => setObjectId(null), [setObjectId]);

  // ── Derived Selectors ──────────────────────────────────────────────────
  const activeWorkspace = workspace;
  const isCanvasEmpty = selectIsCanvasEmpty(activeWorkspace, hiddenNodeIds, effectiveBadgeStates);

  // ── Status Counts ───────────────────────────────────────────────────────
  const statusCounts = useViewStatusCounts(activeWorkspace);

  // ── Diagram Commands ────────────────────────────────────────────────────

  const [createDiagramDialog, setCreateDiagramDialog] = useState<DiagramDialogState>({
    open: false,
    isSubmitting: false,
    error: null,
  });
  const diagramCommands = useMemo(
    () => createDiagramCommands({
      workspace,
      updateWorkspace,
      currentViewKey,
      setViewKey,
      setCreateDiagramDialog,
    }),
    [workspace, updateWorkspace, currentViewKey, setViewKey],
  );
  const {
    handleCreateDiagram,
    handleCreateDiagramClose,
    handleCreateDiagramSubmit,
    handleEditDiagram,
    handleEditDiagramSubmit,
    removeDiagram,
    handleDeleteDiagram,
  } = diagramCommands;

  const { diagrams, activeDiagram, unassignedCount } = useMemo(
    () => createDiagramDerivedState(workspace, currentViewKey, workspace?.objects ?? []),
    [workspace, currentViewKey],
  );

  const [assignDiagramDialog, setAssignDiagramDialog] = useState<AssignDiagramDialogState>({
    open: false,
    isSubmitting: false,
    error: null,
  });
  const diagramReviewCommands = useMemo(
    () => createDiagramReviewCommands({
      workspace,
      updateWorkspace,
      currentViewKey,
      setAssignDiagramDialog,
      removeDiagram,
    }),
    [workspace, updateWorkspace, currentViewKey, removeDiagram],
  );
  const {
    handleShowUnassigned,
    handleAssignDiagramClose,
    assignNodesToDiagram,
    handleAssignDiagramSubmit,
    handleAcceptDiagram,
    handleRejectDiagram,
  } = diagramReviewCommands;

  return {
    // Navigation
    source,
    handleSourceChange,
    objectId,
    currentViewKey,
    handleViewKeyChange,
    handleOpenDerivedView,
    materializeDerivedDiagram,
    handleObjectClick,
    handleClosePanel,

    // Workspace
    workspace,
    error,
    loading,

    // Fullscreen
    isFullscreen,
    toggleFullscreen,

    // Layout
    layoutResetKey,
    resetLayout,

    // Filter
    effectiveBadgeStates,
    hoveredKey,
    hiddenNodeIds,
    dimmedNodeIds,
    resetAll,
    isCanvasEmpty,

    // Scan code
    scanCode,

    // Flows
    flows,
    activeFlow,
    selectFlow,
    getParentFlows,
    getSubFlows,
    flowControls,

    // Shortcuts
    shortcutsOpen,

    // Undo/Redo
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onReload: reload,

    // Derived
    activeWorkspace,
    statusCounts,

    // Delete Dialog
    deleteDialog,
    handleDeleteConfirm,
    handleDeleteCancel,

    // Create Object Dialog
    createObjectDialog,
    handleCreateObject,
    handleCreateContainer,
    handleCreateComponent,
    handleCreateObjectClose,
    handleCreateObjectSubmit,

    // Placeholder Confirm / Cancel
    handleConfirmPlaceholder,
    handleCancelPlaceholder,

    // Group Creation (#2276)
    handleCreateGroup,

    // Group Rename / Delete (#2278)
    handleRenameGroup,
    handleDeleteGroup,

    // Canvas Add: Context Menu
    handleCanvasAdd,
    handleCanvasContextMenu,
    handleCanvasContextMenuAction,

    // Diagram CRUD
    unassignedCount,
    diagrams,
    activeDiagram,
    handleCreateDiagram,
    handleCreateDiagramClose,
    handleCreateDiagramSubmit,
    createDiagramDialog,
    handleDeleteDiagram,
    handleEditDiagram,
    handleEditDiagramSubmit,
    assignDiagramDialog,
    handleShowUnassigned,
    handleAssignDiagramClose,
    handleAssignDiagramSubmit,

    // AddNodeOverlay: Existing Nodes (#2268)
    assignNodesToDiagram,

    // Diagram Review (#2263)
    handleAcceptDiagram,
    handleRejectDiagram,
  };
}

import { cva } from 'class-variance-authority';
import { useCallback, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';

import { useVisceraStore } from '../store/visceraStore';

import VisceraReactFlow from './VisceraReactFlow';

import type { ViewerDiagramCallbacks } from './utils/viewerProps';
import type { Diagram, FlowStep, Workspace } from '../core/workspaceSchema';

// ── Props ────────────────────────────────────────────────────────────────────

const centeredVariants = cva('flex h-full items-center justify-center bg-white dark:bg-gray-950');
const centeredColumnVariants = cva('flex h-full flex-col items-center justify-center gap-4 bg-white dark:bg-gray-950');
const errorLineVariants = cva('max-w-lg');
const emptyCanvasVariants = cva('flex h-full items-center justify-center');

export interface DiagramViewerProps extends ViewerDiagramCallbacks {
  ist: Workspace | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  currentViewKey: string;
  onViewKeyChange: (key: string) => void;
  /** Opens a derived L3/L4 view for a container/component (parent = node id). */
  onOpenDerivedView?: (parentId: string, level: 'component' | 'module') => void;
  onObjectClick: (id: string) => void;
  hiddenNodeIds: Set<string>;
  dimmedNodeIds: Set<string>;
  isFullscreen: boolean;
  layoutResetKey: number;
  hoveredKey: string | null;
  isCanvasEmpty: boolean;
  onResetAll: () => void;
  activeFlowStep: FlowStep | null;
}

// ── Component ────────────────────────────────────────────────────────────────

/** Renders Loading, Error, Empty, Canvas Empty, or Diagram (single/side-by-side) based on workspace state. */
export default function DiagramViewer({
  ist,
  loading,
  error,
  onReload,
  currentViewKey,
  onViewKeyChange,
  onOpenDerivedView,
  onBeforePersist,
  onObjectClick,
  hiddenNodeIds,
  dimmedNodeIds,
  isFullscreen,
  layoutResetKey,
  hoveredKey,
  isCanvasEmpty,
  onResetAll,
  activeFlowStep,
  onCreateContainer,
  onCreateComponent,
  onConfirmPlaceholder,
  onCancelPlaceholder,
  onAssignExistingNode,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: DiagramViewerProps) {
  // Active diagram object for the AddNodeOverlay candidate scope (#2268)
  const activeDiagram = (ist?.diagrams ?? []).find(
    (d) => d.key === currentViewKey,
  ) as Diagram | undefined;

  const handleAddAnnotation = useCallback((objectId: string, text: string) => {
    const store = useVisceraStore.getState();
    store.addAnnotation(objectId, text, 'greg');
  }, []);

  // Show loading indicator only on the initial mount to prevent
  // "Loading workspace data…" flash on HMR/external syncs.
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  if (!hasInitiallyLoaded && !loading) {
    setHasInitiallyLoaded(true);
  }
  if (loading && !hasInitiallyLoaded) {
    return (
      <div className={centeredVariants()}>
        <Text color="muted">Loading workspace data…</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className={centeredColumnVariants()}>
        <Text color="muted" size="sm">Fehler beim Laden des Workspace:</Text>
        <div className={errorLineVariants()}>
          <Text color="error" size="sm" mono align="center">
            {error}
          </Text>
        </div>
        <Button variant="outline" size="sm" onClick={onReload}>
          Erneut laden
        </Button>
      </div>
    );
  }

  if (!ist) {
    return (
      <div className={centeredVariants()}>
        <Text color="muted">Keine Workspace-Daten gefunden</Text>
      </div>
    );
  }

  if (isCanvasEmpty) {
    return (
      <div className={emptyCanvasVariants()}>
        <aside className="flex flex-col items-center gap-4">
          <Text color="muted" size="sm" align="center">Keine Objekte für die aktiven Filter</Text>
          <Button variant="outline" size="sm" onClick={onResetAll}>Alle Filter zurücksetzen</Button>
        </aside>
      </div>
    );
  }

  return (
    <VisceraReactFlow
      currentViewKey={currentViewKey}
      onViewKeyChange={onViewKeyChange}
      onOpenDerivedView={onOpenDerivedView}
      onBeforePersist={onBeforePersist}
      onObjectClick={onObjectClick}
      hiddenNodeIds={hiddenNodeIds}
      dimmedNodeIds={dimmedNodeIds}
      isFullscreen={isFullscreen}
      activeFlowStep={activeFlowStep}
      layoutResetKey={layoutResetKey}
      perspectiveHoveredKey={hoveredKey ?? undefined}
      onCreateContainer={onCreateContainer}
      onCreateComponent={onCreateComponent}
      onConfirmPlaceholder={onConfirmPlaceholder}
      onCancelPlaceholder={onCancelPlaceholder}
      activeDiagram={activeDiagram ?? null}
      onAssignExistingNode={onAssignExistingNode}
      onCreateGroup={onCreateGroup}
      onRenameGroup={onRenameGroup}
      onDeleteGroup={onDeleteGroup}
      onAddAnnotation={handleAddAnnotation}
    />
  );
}

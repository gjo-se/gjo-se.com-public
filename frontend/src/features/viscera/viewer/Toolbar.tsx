import { cva } from 'class-variance-authority';
import { useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';
import Separator from '@src/components/primitives/Separator/Separator';

import ExportButton from '../shared/ExportButton';
import FullscreenToggle from '../shared/FullscreenToggle';

import Breadcrumb from './components/misc/Breadcrumb';
import DiagramsDropdown from './components/misc/DiagramsDropdown';

import type { Diagram, DiagramSource, Workspace } from '../core/workspaceSchema';
import type { ViewStatusCounts } from '../viewer/hooks/useViewStatusCounts';

// ── Props ────────────────────────────────────────────────────────────────────

const sourceGroupVariants = cva('flex items-center gap-1 rounded-lg border border-border bg-background p-1 dark:border-input dark:bg-input/30');

export interface ToolbarProps {
  variant: 'full' | 'fullscreen';
  activeWorkspace: Workspace | null;
  currentViewKey: string;
  /** Aktive Diagramm-Welt ('code' | 'golden'). */
  source?: DiagramSource;
  /** Wird beim Umschalten der Welt aufgerufen. */
  onSourceChange?: (source: DiagramSource) => void;
  statusCounts?: Record<string, ViewStatusCounts>;
  onViewKeyChange: (key: string) => void;
  onResetLayout: () => void;
  onScanCode: () => void;
  scanCodeRunning: boolean;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReload?: () => void;
  /** Number of unassigned objects to show as badge. */
  unassignedCount?: number;
  onCreateDiagram?: () => void;
  onDeleteDiagram?: (key: string) => void;
  onEditDiagram?: (key: string) => void;
  onShowUnassigned?: () => void;
  /** Diagrams from the API — provides status + scan_meta for the dropdown (#2263). */
  diagrams?: Diagram[];
  /** Called when the user accepts a pending scanner diagram (#2263). */
  onAcceptDiagram?: (key: string) => void;
  /** Called when the user confirms rejection of a pending scanner diagram (#2263). */
  onRejectDiagram?: (key: string) => void;
  /** L4-only: active diagram is a module view → show the view-flip button. */
  isModuleView?: boolean;
  /** L4-only: active projection (ReactFlow ⇄ Sigma). */
  viewMode?: 'reactflow' | 'sigma';
  /** L4-only: flips between Sicht A (ReactFlow) and Sicht B (Sigma). */
  onToggleViewMode?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Toolbar für den Viscera Architecture Viewer.
 *
 * Reine Presentational-Komponente – keine Business-Logik, keine eigenen Hooks.
 * Zwei Varianten:
 * - `full`: Komplette Toolbar (Breadcrumb, Dropdown, Reset, ScanCode, Export, Fullscreen)
 * - `fullscreen`: Floating-Controls (ScanCode, Export, Fullscreen)
 */
export default function Toolbar({
  variant,
  activeWorkspace,
  currentViewKey,
  source = 'code',
  onSourceChange,
  statusCounts,
  onViewKeyChange,
  onResetLayout,
  onScanCode,
  scanCodeRunning,
  onToggleFullscreen,
  isFullscreen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReload,
  unassignedCount = 0,
  onCreateDiagram,
  onDeleteDiagram,
  onEditDiagram,
  onShowUnassigned,
  diagrams = [],
  onAcceptDiagram,
  onRejectDiagram,
  isModuleView = false,
  viewMode = 'reactflow',
  onToggleViewMode,
}: ToolbarProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const renderViewFlipButton = () => {
    if (!isModuleView || !onToggleViewMode) return null;
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleViewMode}
        title={viewMode === 'sigma'
          ? 'Zur Sicht A (ReactFlow-Canvas) wechseln'
          : 'Zur Sicht B (Sigma-Gesamtnetz) wechseln'}
      >
        {viewMode === 'sigma' ? 'Sicht A (ReactFlow)' : 'Sicht B (Sigma)'}
      </Button>
    );
  };

  if (variant === 'fullscreen') {
    return (
      <aside className="fixed right-4 top-4 z-overlay flex gap-2">
        {renderViewFlipButton()}
        <Button
          variant="outline"
          size="sm"
          onClick={onScanCode}
          disabled={scanCodeRunning}
        >
          Scan Code
        </Button>
        <ExportButton viewKey={currentViewKey} />
        <FullscreenToggle isFullscreen={isFullscreen} onToggle={onToggleFullscreen} />
      </aside>
    );
  }

  return (
    <section className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900">
      {/* Breadcrumb */}
      <Breadcrumb workspace={activeWorkspace} />

      <Separator orientation="vertical" />

      {/* Source Switcher: Code / Golden — determines which world is loaded (#2805) */}
      {onSourceChange && (
        <div
          role="group"
          aria-label="Diagramm-Welt"
          className={sourceGroupVariants()}
        >
          {(['code', 'golden'] as const).map((opt) => {
            const active = source === opt;
            return (
              <Button
                key={opt}
                type="button"
                size="xs"
                variant={active ? 'secondary' : 'ghost'}
                aria-pressed={active}
                onClick={() => onSourceChange(opt)}
                title={active
                  ? `${opt === 'code' ? 'Code' : 'Golden'}-Welt (aktiv)`
                  : `Zur ${opt === 'code' ? 'Code' : 'Golden'}-Welt wechseln`}
              >
                {opt === 'code' ? 'Code' : 'Golden'}
              </Button>
            );
          })}
        </div>
      )}

      {/* Diagrams Dropdown */}
      <DiagramsDropdown
        currentViewKey={currentViewKey}
        onSelect={onViewKeyChange}
        statusCounts={statusCounts}
        unassignedCount={unassignedCount}
        onCreateDiagram={onCreateDiagram}
        onDeleteDiagram={onDeleteDiagram}
        onEditDiagram={onEditDiagram}
        onShowUnassigned={onShowUnassigned}
        diagrams={diagrams}
        onAcceptDiagram={onAcceptDiagram}
        onRejectDiagram={onRejectDiagram}
      />

      {/* Reset Layout */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowResetConfirm(true)}
        title="Auto-Layout zurücksetzen (manuelle Positionen verwerfen)"
      >
        Reset Layout
      </Button>

      {/* Reset-Layout-Bestätigung – gleiches Dialog-Muster wie Datensatz-Löschen (TableRowActions) */}
      <Dialog open={showResetConfirm} onOpenChange={(open) => !open && setShowResetConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Layout zurücksetzen bestätigen</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Das Auto-Layout wird neu berechnet und alle manuell gesetzten Positionen
            werden verworfen. Wirklich zurücksetzen?
          </DialogDescription>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowResetConfirm(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowResetConfirm(false);
                onResetLayout();
              }}
            >
              Zurücksetzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View-Flip (L4 only): ReactFlow ⇄ Sigma */}
      {renderViewFlipButton()}

      {/* Undo / Redo */}
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
        >
          ↩
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
        >
          ↪
        </Button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Reload Workspace */}
      {onReload && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReload}
          title="Workspace neu laden (Scanner-Ergebnisse abrufen)"
        >
          ⟳ Reload
        </Button>
      )}

      {/* Scan Code */}
      <Button
        variant="outline"
        size="sm"
        onClick={onScanCode}
        disabled={scanCodeRunning}
        title="Code scannen (pyvisualizer + dependency-cruiser)"
      >
        Scan Code
      </Button>

      {/* Export */}
      <ExportButton viewKey={currentViewKey} />

      {/* Fullscreen */}
      <FullscreenToggle isFullscreen={isFullscreen} onToggle={onToggleFullscreen} />
    </section>
  );
}

import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { NodeResizer, useNodeId } from '@xyflow/react';
import { cva } from 'class-variance-authority';
import { memo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@src/components/primitives/Button/Button';
import Card from '@src/components/primitives/Card/Card';
import Input from '@src/components/primitives/Input/Input';
import Separator from '@src/components/primitives/Separator/Separator';
import Text from '@src/components/primitives/Text/Text';

import { useCloseOnEscape } from '../../hooks/useCloseOnEscape';
import { snapToGrid } from '../../utils/applyNodeMove';
import { clampX, clampY, CONTEXT_MENU_MAX_HEIGHT } from '../../utils/contextMenu';

import type { GroupDragData, GroupDropData, VisceraDragData } from '../../utils/dndTypes';
import type { NodeProps, ResizeParams } from '@xyflow/react';

// ── Node Data ───────────────────────────────────────────────────────────────

export interface GroupNodeData extends Record<string, unknown> {
  name: string;
  width: number;
  height: number;
  /** Called on rename confirm (Enter) with the trimmed label text. */
  onRenameGroup?: (id: string, name: string) => void;
  /** Called on delete confirm. Member nodes stay untouched. */
  onDeleteGroup?: (id: string) => void;
  /** Called on boundary click to open the GroupDetailsPanel (#2279). */
  onSelectGroup?: (id: string) => void;
  /** Called after a boundary resize ends with the new grid-snapped absolute bounds (flow units). */
  onResizeGroup?: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Minimum group size when resizing by hand — smaller than GROUP_MIN so compact groups stay shrinkable. */
const MIN_GROUP_WIDTH = 200;
const MIN_GROUP_HEIGHT = 150;

const nopanVariants = cva('nopan');
const labelVariants = cva('text-gray-600 dark:text-gray-200');
const dangerTextVariants = cva('text-red-600 dark:text-red-400');
const dangerConfirmVariants = cva('pb-2 text-red-600 dark:text-red-400');

interface ContextMenuState {
  x: number;
  y: number;
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * React Flow Group Node für Groups aus `workspace.groups` (Finding 9).
 *
 * Rendert ein gestricheltes SVG-Rechteck mit solider Fläche (hohe Opazität)
 * und dynamischen Dimensionen: YAML-persistierte Bounds → Override-Bounds
 * (Move/Resize dieser Session) → abgeleitet aus Kind-Positionen
 * (`getNodesBounds` + Padding). Das Label sitzt innerhalb der Group oben-links.
 *
 * Child-Nodes werden via `parentId` + `extent: 'parent'` innerhalb dieser
 * Gruppe positioniert und beim Drag auf die Group-Bounds beschränkt.
 *
 * Resize: `NodeResizer` (nur Groups — Cards haben keine Handles). Die Größe
 * wird live in lokalem State gehalten und bei Resize-Ende grid-gesnappt via
 * `onResizeGroup` an den CanvasContainer gemeldet (Persistenz in die
 * Diagramm-YAML über den 'move'-Sync-Pfad).
 *
 * Interaktion (#2278): Rechtsklick öffnet ein Kontextmenü mit „Umbenennen"
 * (Inline-Input auf dem Label, Enter/Escape) und „Löschen" (Inline-Confirm).
 * Die Node bleibt reines Rendering — alle Aktionen laufen über data-Callbacks.
 */
const GroupNode = memo(function GroupNode({
  data,
  selected,
  width,
  height,
}: NodeProps & { data: GroupNodeData }) {
  const { name, onRenameGroup, onDeleteGroup, onSelectGroup, onResizeGroup } = data;

  const nodeId = useNodeId() ?? '';

  // `width`/`height` sind in NodeProps optional, aber useDiagramNodes setzt sie
  // für Groups immer. Fallback auf 0 hält die folgenden Render-Ausdrücke
  // typsicher (Arithmetik, Drag-Data) — zur Laufzeit liegen echte Werte vor.
  const groupWidth = width ?? 0;
  const groupHeight = height ?? 0;

  // ── Resize (offizielles NodeResizer, exakt wie reactflow.dev/examples/nodes/node-resizer) ──
  //
  // NodeResizer resized direkt die RF-Node: Position (links/oben-Handles) und
  // Dimensionen werden live in die RF-interne Store geschrieben. React Flow
  // rendert die Node daraus live nach — NodeProps `width`/`height` und
  // `positionAbsoluteX/Y` folgen. Der sichtbare Inhalt wird DIREKT in die RF-
  // Node gerendert (EINE Positionsquelle, kein manueller Boundary-Div/Offset).
  //
  // Solange bis `onResizeEnd` persistiert wird, ändert sich `nodeOverrides`
  // nicht → `nodesForCanvas` behält eine stabile Referenz → React Flow nutzt
  // die Live-Dimensionen von NodeResizer. Erst am Ende werden die finalen
  // grid-gesnappten Bounds via `onResizeGroup` → `moveNode` persistiert und
  // die Node springt einmalig auf das korrekte (gesnappte) Ziel.

  const handleResizeEnd = useCallback(
    (_event: unknown, params: ResizeParams) => {
      onResizeGroup?.(nodeId, {
        x: snapToGrid(params.x),
        y: snapToGrid(params.y),
        width: snapToGrid(params.width),
        height: snapToGrid(params.height),
      });
    },
    [nodeId, onResizeGroup],
  );

  // ── @dnd-kit drop zone (#2295): the group boundary is the droppable.
  // ``isOver`` replaces the former ``data.isDropTarget`` highlight — the
  // context evaluates the drop via ``pointerWithin`` collision detection.
  // Disabled while a group drag is active: groups cannot be nested.
  const { active } = useDndContext();
  const activeDragData = active?.data.current as VisceraDragData | undefined;
  const isGroupDragActive = activeDragData?.dndType === 'group';
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: nodeId,
    data: { kind: 'group', groupId: nodeId } satisfies GroupDropData,
    disabled: isGroupDragActive,
  });

  // ── @dnd-kit group dragging: the whole group area moves the group.
  // Left button only — right click stays reserved for the context menu.
  // Members on top keep their own drag handling (separate node wrappers).
  const { attributes, listeners, setNodeRef: setDraggableRef } = useDraggable({
    id: nodeId,
    data: { dndType: 'group', width: groupWidth, height: groupHeight } satisfies GroupDragData,
  });

  const setGroupRef = useCallback(
    (element: HTMLElement | null) => {
      setDroppableRef(element);
      setDraggableRef(element);
    },
    [setDroppableRef, setDraggableRef],
  );

  const handleGroupPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Resize-Handles (viscera-group-resize) starten NIEMALS einen Group-Drag —
      // Guard gegen Bubbling, falls stopPropagation am Handle nicht greift.
      if ((e.target as HTMLElement)?.closest?.('.viscera-group-resize')) return;
      if (e.button === 0) {
        listeners?.onPointerDown?.(e);
      }
    },
    [listeners],
  );

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // ── Boundary selection (#2279) ────────────────────────────────────────────

  // Doppelklick auf den Group-Boundary öffnet das GroupDetailsPanel
  // (konsistent zu Cards: Single-Klick = nur Selektion). stopPropagation
  // verhindert, dass ReactFlows onNodeDoubleClick das Panel doppelt öffnet.
  const handleBoundaryDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectGroup?.(nodeId);
    },
    [nodeId, onSelectGroup],
  );

  // ── Context menu handlers ────────────────────────────────────────────────

  const closeAll = useCallback(() => {
    setContextMenu(null);
    setConfirmingDelete(false);
  }, []);

  const hasAnyOpen = contextMenu !== null;

  useCloseOnEscape(hasAnyOpen, closeAll);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRenameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setContextMenu(null);
      setRenameValue(name);
      setIsRenaming(true);
    },
    [name],
  );

  const handleRenameCancel = useCallback(() => {
    setIsRenaming(false);
    setRenameValue('');
  }, []);

  const handleRenameConfirm = useCallback(() => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      handleRenameCancel();
      return;
    }
    setIsRenaming(false);
    setRenameValue('');
    onRenameGroup?.(nodeId, trimmed);
  }, [renameValue, nodeId, onRenameGroup, handleRenameCancel]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Enter' && renameValue.trim()) {
        handleRenameConfirm();
      } else if (e.key === 'Escape') {
        handleRenameCancel();
      }
    },
    [renameValue, handleRenameConfirm, handleRenameCancel],
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(true);
  }, []);

  const handleDeleteCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDelete(false);
  }, []);

  const handleDeleteConfirm = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmingDelete(false);
      setContextMenu(null);
      onDeleteGroup?.(nodeId);
    },
    [nodeId, onDeleteGroup],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  //
  // Der Inhalt wird DIREKT in die RF-Node gerendert (EINE Positionsquelle —
  // exakt wie die reactflow.dev node-resizer Vorlage). `width`/`height` sind
  // die NodeProps, die NodeResizer live aktualisiert; React Flow positioniert
  // und skaliert die Node aus der internen Store. Kein manueller Boundary-Div,
  // kein Offset — das war der verbaut Side-Effekt.

  return (
    <div
      ref={setGroupRef}
      {...attributes}
      className={nopanVariants()}
      style={{ width: groupWidth, height: groupHeight, position: 'relative' }}
      onContextMenu={isRenaming ? undefined : handleContextMenu}
      onPointerDown={handleGroupPointerDown}
    >
      {/* Drop-Target highlight background (#2295): shown while a card hovers the boundary */}
      {isOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Gestricheltes SVG-Rechteck (Boundary — kein CardKind mehr, Optik wie zuvor).
          Halbtransparente Fläche: Group bleibt klar erkennbar, Canvas schimmert durch. */}
      <svg
        width={groupWidth}
        height={groupHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
        onPointerDown={handleGroupPointerDown}
        onDoubleClick={isRenaming ? undefined : handleBoundaryDoubleClick}
      >
        <rect
          x={0}
          y={0}
          width={groupWidth}
          height={groupHeight}
          rx={4}
          ry={4}
          className="fill-gray-100/50 stroke-gray-300 dark:fill-gray-700/40 dark:stroke-gray-500"
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        {/* Drop-Target highlight stroke: thicker, blue */}
        {isOver && (
          <rect
            x={0}
            y={0}
            width={groupWidth}
            height={groupHeight}
            rx={4}
            ry={4}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={3}
            strokeDasharray="6,4"
          />
        )}
      </svg>

      {/* Label: positioniert innerhalb der Group (top-left, mit Padding) —
          or inline rename input (#2278) */}
      {isRenaming ? (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 8,
            zIndex: 10,
            width: Math.max(140, groupWidth - 24),
          }}
        >
          <Input
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameCancel}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-nodrag="true"
            aria-label="Group umbenennen"
          />
        </div>
      ) : (
        <div
          className={labelVariants()}
          style={{
            position: 'absolute',
            top: 4,
            left: 8,
            padding: '4px 8px',
            fontSize: '13px',
            fontWeight: 600,
            color: isOver ? '#3b82f6' : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
      )}

      {/* Offizielles NodeResizer — alle 8 Handles (Ecken + Kanten), live
          aktualisiert die Node-Dimensionen; Sichtbarkeit + Treffbarkeit via
          viscera-canvas.css. stopPropagation verhindert den @dnd-kit Drag. */}
      <div onPointerDown={(e) => e.stopPropagation()}>
        <NodeResizer
          isVisible={selected}
          color="#3b82f6"
          minWidth={MIN_GROUP_WIDTH}
          minHeight={MIN_GROUP_HEIGHT}
          onResizeEnd={handleResizeEnd}
        />
      </div>

      {/* Context Menu (#2278) — Portal, Muster analog CardNode */}
      {contextMenu && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={closeAll}>
          <div
            style={{
              position: 'absolute',
              left: clampX(contextMenu.x, 380),
              top: clampY(contextMenu.y, CONTEXT_MENU_MAX_HEIGHT),
              minWidth: 240,
              maxWidth: 380,
              maxHeight: CONTEXT_MENU_MAX_HEIGHT,
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card size="sm">
              {!confirmingDelete ? (
                <>
                  <Button
                    variant="menu-primary"
                    size="none"
                    onClick={handleRenameClick}
                  >
                    <Text size="sm">✏️ Umbenennen</Text>
                  </Button>
                  <Separator />
                  <Button
                    variant="menu-danger"
                    size="none"
                    onClick={handleDeleteClick}
                  >
                    <div className={dangerTextVariants()}>
                      <Text size="sm" color="inherit">🗑 Löschen</Text>
                    </div>
                  </Button>
                </>
              ) : (
                <div className="px-3 py-2">
                  <div className={dangerConfirmVariants()}>
                    <Text size="sm" weight="medium" color="inherit">
                      „{name}“ wirklich löschen?
                    </Text>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="menu-cancel"
                      size="none"
                      onClick={handleDeleteCancel}
                    >
                      Abbrechen
                    </Button>
                    <Button
                      variant="menu-submit"
                      size="none"
                      onClick={handleDeleteConfirm}
                    >
                      Ja, löschen
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});

export default GroupNode;

import { EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { cva } from 'class-variance-authority';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import Button from '@src/components/primitives/Button/Button';
import Card from '@src/components/primitives/Card/Card';
import Input from '@src/components/primitives/Input/Input';
import Text from '@src/components/primitives/Text/Text';
import { useEntityCache } from '@src/features/viscera/core/useEntityCache';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import type { EdgeProps as ReactFlowEdgeProps } from '@xyflow/react';

// ── Edge Data ────────────────────────────────────────────────────────────────

export interface EdgeData extends Record<string, unknown> {
  label?: string;
  description?: string;
  technology?: string;
  previewed?: boolean;
  dimmed?: boolean;
  filterDimmed?: boolean;
  pulsing?: boolean;
  highlighted?: boolean;
  /** Override color when a PerspectiveBar badge is hovered. */
  activeTagColor?: string;
  /** FK-Kante (ER-Diagramm) – Crow's-Foot-Kardinalität rendern (source=many, target=one). */
  crowFoot?: boolean;
}

export type EdgeProps = ReactFlowEdgeProps & {
  data?: EdgeData;
};

// ── Style Constants ──────────────────────────────────────────────────────────

const COLOR_DEFAULT = '#b1b1b7';
const COLOR_PREVIEWED = '#3b82f6';
const COLOR_HIGHLIGHTED = '#f59e0b';
const COLOR_DIMMED = '#d1d5db';
const COLOR_FILTER_DIMMED = '#b1b1b7';
const COLOR_HOVER = '#6366f1';

const WIDTH_DEFAULT = 1.5;
const WIDTH_PREVIEWED = 2;
const WIDTH_HIGHLIGHTED = 2.5;
const WIDTH_HOVER = 3.0;

const contextMenuPanelVariants = cva(
  'min-w-context-menu border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900',
);
const dangerTextVariants = cva('text-red-600 dark:text-red-400');
const dangerConfirmVariants = cva('pb-2 text-red-600 dark:text-red-400');

const OPACITY_DEFAULT = 0.6;
const OPACITY_DIMMED = 0.12;
const OPACITY_FILTER_DIMMED = 0.3;

// Crow's-Foot-Marker-Dimensionen (FK-Kanten im ER-Diagramm).
const CROW_VIEWBOX = 14;
const CROW_MARKER_SIZE = 9;
const CROW_LINE_WIDTH = 1.6;
/** x des Fußes (Punkt, an dem die Prongs zusammenlaufen). */
const CROW_HEEL = 4;
/** refX – Punkt am Marker, der auf der Knoten-Kante sitzt. */
const CROW_REF = 11;
const CROW_MID = 7;

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Custom React Flow Edge für Viscera-Kanten.
 *
 * Rendert eine Bezier-Kurve mit Pfeilspitze, inline-editablem Label,
 * Hover-Tooltip und visuellen Zuständen.
 *
 * Doppelklick auf das Label → Input-Feld → Enter speichert via API.
 */
export default function Edge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const { technologyMap } = useEntityCache();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // ── Context Menu State ─────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const techColor = data?.technology
    ? technologyMap.get(data.technology)?.colorToken ?? undefined
    : undefined;

  const appearance = resolveEdgeAppearance(data, techColor, selected, isHovered);
  const label = data?.label ?? data?.description;
  const markerId = `arrow-${id}`;
  const markerColor = selected ? COLOR_HIGHLIGHTED : appearance.stroke;

  // Crow's-Foot (FK): source=many (drei Prongs), target=one (ein Strich).
  const isCrowFoot = data?.crowFoot === true;
  const crowOneId = `crow-one-${id}`;
  const crowManyId = `crow-many-${id}`;

  const tooltipText = resolveTooltipText(data);

  // ── Inline Edit Handlers ────────────────────────────────────────────────

  const handleDoubleClick = useCallback(() => {
    setEditValue(label ?? '');
    setIsEditing(true);
  }, [label]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    setIsEditing(false);

    if (trimmed === (label ?? '')) return; // no change

    const store = useVisceraStore.getState();

    // Optimistic: update edge label in store
    const edges = store.edges.map((e) => {
      if (e.id !== id) return e;
      return {
        ...e,
        data: { ...(e.data ?? {}), label: trimmed || undefined, description: trimmed || undefined },
      };
    });
    store.setEdges(edges);

    // Enqueue API sync
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: id,
      action: 'update_edge',
      payload: { description: trimmed || null },
      retryCount: 0,
      status: 'pending',
    });
  }, [editValue, label, id]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  // ── Context Menu Handlers ───────────────────────────────────────────────

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setConfirmingDelete(false);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setConfirmingDelete(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setConfirmingDelete(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    const store = useVisceraStore.getState();
    store.deleteEdge(id);
    store.queueSync({
      mutationId: crypto.randomUUID(),
      nodeId: id,
      action: 'delete_edge',
      payload: {},
      retryCount: 0,
      status: 'pending',
    });
    setContextMenu(null);
    setConfirmingDelete(false);
  }, [id]);

  // Close context menu on outside pointer-down.
  // Nutzt `pointerdown` statt `click`: ein Klick auf einen Menü-Button löst
  // state-getriebene Re-Renders aus (z. B. setConfirmingDelete), die den
  // angeklickten Knoten detachen – `contains(e.target)` wäre danach false und
  // das Menü würde sofort geschlossen, bevor der Confirm sichtbar wird.
  // Beim pointerdown ist der Menü-Knoten noch intakt.
  useEffect(() => {
    if (!contextMenu) return;
    const handlePointerDown = (e: PointerEvent) => {
      // Don't close if pointer-down is inside the context menu itself
      const menuEl = document.querySelector('[data-viscera-edge-context-menu]');
      if (menuEl && menuEl.contains(e.target as Node)) return;
      setContextMenu(null);
      setConfirmingDelete(false);
    };
    const timer = setTimeout(() => document.addEventListener('pointerdown', handlePointerDown), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [contextMenu]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* SVG Arrowhead Definition */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={markerColor} />
        </marker>
        {isCrowFoot && (
          <>
            {/* target = one: einzelner senkrechter Strich */}
            <marker
              id={crowOneId}
              viewBox={`0 0 ${CROW_VIEWBOX} ${CROW_VIEWBOX}`}
              refX={CROW_REF}
              refY={CROW_MID}
              markerWidth={CROW_MARKER_SIZE}
              markerHeight={CROW_MARKER_SIZE}
              orient="auto-start-reverse"
            >
              <path
                d={`M ${CROW_REF} 1 L ${CROW_REF} ${CROW_VIEWBOX - 1}`}
                stroke={markerColor}
                strokeWidth={CROW_LINE_WIDTH}
                fill="none"
              />
            </marker>
            {/* source = many: Crow-Fuß (drei Prongs + Stiel zum Fuß) */}
            <marker
              id={crowManyId}
              viewBox={`0 0 ${CROW_VIEWBOX} ${CROW_VIEWBOX}`}
              refX={CROW_REF}
              refY={CROW_MID}
              markerWidth={CROW_MARKER_SIZE}
              markerHeight={CROW_MARKER_SIZE}
              orient="auto-start-reverse"
            >
              <path
                d={`M ${CROW_VIEWBOX} 1 L ${CROW_HEEL} ${CROW_MID} L ${CROW_VIEWBOX} ${CROW_VIEWBOX - 1} M ${CROW_HEEL} ${CROW_MID} L ${CROW_REF} ${CROW_MID}`}
                stroke={markerColor}
                strokeWidth={CROW_LINE_WIDTH}
                fill="none"
              />
            </marker>
          </>
        )}
      </defs>

      {/* Hover Hitbox (invisible wider path) + double-click for edit + right-click for context menu */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: isEditing ? 'default' : 'pointer' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />

      {/* Main Edge Line */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={appearance.stroke}
        strokeWidth={appearance.strokeWidth}
        strokeOpacity={appearance.opacity}
        markerStart={isCrowFoot ? `url(#${crowManyId})` : undefined}
        markerEnd={isCrowFoot ? `url(#${crowOneId})` : `url(#${markerId})`}
        className={appearance.className}
        style={{ transition: 'stroke 0.2s, stroke-opacity 0.2s, stroke-width 0.2s' }}
      />

      {/* Edge Label – inline editable, only rendered when content exists */}
      <EdgeLabelRenderer>
        {isEditing ? (
          <div
            data-nodrag="true"
            data-nopan="true"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              zIndex: 1001,
            }}
          >
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="Label"
              autoFocus
            />
          </div>
        ) : label ? (
          <div
            data-nodrag="true"
            data-nopan="true"
            onDoubleClick={handleDoubleClick}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 400,
              color: '#9ca3af',
              background: isHovered ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
              borderRadius: 4,
              border: isHovered ? '1px solid #e5e7eb' : '1px solid transparent',
              whiteSpace: 'nowrap',
              // Label nur bei aktivem Zustand sichtbar (Hover einer verbundenen
              // Node → previewed, oder direkter Edge-Hover); Default unsichtbar (#2523).
              opacity: resolveLabelOpacity(data, isHovered),
              transition: 'opacity 0.2s, background 0.15s, border-color 0.15s',
              pointerEvents: 'all',
              cursor: 'text',
            }}
          >
            {label}
          </div>
        ) : null}
      </EdgeLabelRenderer>

      {/* Hover Tooltip */}
      {isHovered && tooltipText && !isEditing && (
        <EdgeLabelRenderer>
          <div
            data-nodrag="true"
            data-nopan="true"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 12}px)`,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 400,
              color: '#ffffff',
              background: 'rgba(55, 65, 81, 0.92)',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            {tooltipText}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Context Menu (right-click) */}
      {contextMenu && createPortal(
        <div
          data-viscera-edge-context-menu
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
          }}
        >
          <div className={contextMenuPanelVariants()}>
            <Card size="sm">
              {!confirmingDelete ? (
                <Button
                  variant="menu-danger"
                  size="none"
                  onClick={handleDeleteClick}
                >
                  <div className={dangerTextVariants()}>
                    <Text size="sm" color="inherit">🗑 Edge löschen</Text>
                  </div>
                </Button>
              ) : (
                <div style={{ padding: '8px 12px' }}>
                  <div className={dangerConfirmVariants()}>
                    <Text size="sm" weight="medium" color="inherit">
                      Edge wirklich löschen?
                    </Text>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
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

      {/* Pulse Animation Keyframes */}
      <style>{`
        .viscera-pulse {
          animation: viscera-pulse-anim 2s ease-in-out;
        }
        @keyframes viscera-pulse-anim {
          0%   { stroke-opacity: 0.3; }
          25%  { stroke-opacity: 1; }
          50%  { stroke-opacity: 0.3; }
          75%  { stroke-opacity: 1; }
          100% { stroke-opacity: 0.3; }
        }
      `}</style>
    </>
  );
}

function resolveEdgeAppearance(
  data: EdgeData | undefined,
  techColor: string | undefined,
  selected?: boolean,
  isHovered?: boolean,
) {
  const effectiveDefault = data?.activeTagColor ?? techColor ?? COLOR_DEFAULT;

  if (selected) {
    return {
      stroke: COLOR_HIGHLIGHTED,
      strokeWidth: WIDTH_HIGHLIGHTED,
      opacity: 1,
      className: '',
    };
  }

  if (isHovered) {
    return {
      stroke: COLOR_HOVER,
      strokeWidth: WIDTH_HOVER,
      opacity: 1,
      className: '',
    };
  }

  if (!data) {
    return { stroke: effectiveDefault, strokeWidth: WIDTH_DEFAULT, opacity: OPACITY_DEFAULT, className: '' };
  }

  if (data.pulsing) {
    return {
      stroke: COLOR_PREVIEWED,
      strokeWidth: WIDTH_PREVIEWED,
      opacity: 1,
      className: 'viscera-pulse',
    };
  }

  if (data.highlighted) {
    return {
      stroke: COLOR_HIGHLIGHTED,
      strokeWidth: WIDTH_HIGHLIGHTED,
      opacity: 1,
      className: '',
    };
  }

  if (data.dimmed) {
    return {
      stroke: COLOR_DIMMED,
      strokeWidth: WIDTH_DEFAULT,
      opacity: OPACITY_DIMMED,
      className: '',
    };
  }

  if (data.previewed) {
    return {
      stroke: COLOR_PREVIEWED,
      strokeWidth: WIDTH_PREVIEWED,
      opacity: 1,
      className: '',
    };
  }

  if (data.filterDimmed) {
    return {
      stroke: COLOR_FILTER_DIMMED,
      strokeWidth: WIDTH_DEFAULT,
      opacity: OPACITY_FILTER_DIMMED,
      className: '',
    };
  }

  return { stroke: effectiveDefault, strokeWidth: WIDTH_DEFAULT, opacity: OPACITY_DEFAULT, className: '' };
}

/** Opacity of the inline label depending on preview/hover/dim state. */
function resolveLabelOpacity(data: EdgeData | undefined, isHovered: boolean): number {
  if (data?.previewed || isHovered) return 1;
  if (data?.dimmed) return OPACITY_DIMMED;
  if (data?.filterDimmed) return OPACITY_FILTER_DIMMED;
  return 0;
}

// ── Edge States ──────────────────────────────────────────────────────────────

/** Tooltip text for an edge (description and/or technology), empty when neither. */
function resolveTooltipText(data: EdgeData | undefined): string {
  if (data?.description && data?.technology) return `${data.description} · ${data.technology}`;
  return data?.description || data?.technology || '';
}

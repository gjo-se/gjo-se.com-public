import { useDraggable } from '@dnd-kit/core';
import { useNodeId } from '@xyflow/react';
import { cva } from 'class-variance-authority';
import { memo, useCallback, useRef, useState } from 'react';

import Text from '@src/components/primitives/Text/Text';
import type { Adr } from '@src/features/viscera/adrs/hooks/useAdrs';
import { useEntityCache } from '@src/features/viscera/core/useEntityCache';
import type { EntityData } from '@src/features/viscera/core/useEntityCache';
import type { Annotation, ChildDiagram } from '@src/features/viscera/core/workspaceSchema';
import { useContextMenuOpen } from '@src/features/viscera/viewer/hooks/useContextMenuOpen';
import { COLOR_TOKEN_CSS, type ColorToken } from '@src/lib/colorTokens';

import { useStatusBorder } from '../../hooks/useStatusBorder';
import CardBackground from '../card/CardBackground';
import TagBar from '../card/TagBar';

import CardContextMenu from './CardContextMenu';
import CardEdgeHandles from './CardEdgeHandles';
import CardHeader from './CardHeader';
import CardNodeToolbar from './CardNodeToolbar';

import type { CardContextMenuHandle } from './CardContextMenu';
import type { StatusBorderResult } from '../../hooks/useStatusBorder';
import type { CardKind } from '../../utils/cardShape';
import type { CardDragData } from '../../utils/dndTypes';
import type { NodeProps } from '@xyflow/react';

// ── Node Data ───────────────────────────────────────────────────────────────

export interface CardNodeData extends Record<string, unknown> {
  name: string;
  description?: string;
  kind: CardKind;
  technology?: string;
  technologies?: string[];
  tags?: string[];
  status?: string;
  external?: boolean;
  d2?: string;
  hasLayoutOverride?: boolean;
  decisions?: Adr[];
  annotations?: Annotation[];
  onAddAnnotation?: (text: string) => void;
  childDiagrams?: ChildDiagram[];
  onNavigateToChild?: (childKey: string) => void;
  /** Opens a derived L3/L4 view for a node (parent = node id, level = 'component' | 'module'). */
  onOpenDerivedView?: (parentId: string, level: 'component' | 'module') => void;
  cardWidth: number;
  cardHeight: number;
  dimmed?: boolean;
  hidden?: boolean;
  onCreateContainer?: (systemId: string) => void;
  onCreateComponent?: (containerId: string) => void;
  /** Editing mode: show inline input instead of static name text. */
  isEditing?: boolean;
  /** Placeholder text for the editing input. */
  editingLabel?: string;
  /** Called on Enter with the trimmed input value. */
  onConfirmEdit?: (name: string) => void;
  /** Called on Escape or × button click. */
  onCancelEdit?: () => void;
  /** Error message shown below the card during editing. */
  editingError?: string;
  /**
   * Layout-Richtung des aktuellen Diagramms – `'down'` (oben/unten) oder `'lr'` (links/rechts).
   * Bestimmt die Ausrichtung der Edge-Handles, damit Kanten zur Layering-Richtung passen.
   * Default `'lr'` (historisch, L2/L3/ER).
   */
  layoutDirection?: 'lr' | 'down';
}

type CardNodeProps = NodeProps & { data: CardNodeData };

const nopanVariants = cva('nopan');

// ── Component ───────────────────────────────────────────────────────────────

function CardNode({ data }: CardNodeProps) {
  const {
    name, kind, technology, technologies: technologiesProp, tags, status, external = false,
    description,
    decisions, annotations, onAddAnnotation,
    childDiagrams, onNavigateToChild, onOpenDerivedView, cardWidth: width, cardHeight: height,
    dimmed, hidden, onCreateContainer, onCreateComponent,
    isEditing, editingLabel, onConfirmEdit, onCancelEdit, editingError,
    layoutDirection = 'lr',
  } = data;

  const nodeId = useNodeId() ?? '';

  // Component cards always offer the L4 module drill-down, even without children.
  const canOpenModuleView = kind === 'component';
  // Container cards always offer the L3 component drill-down, even without children (#2491).
  const canOpenComponentView = kind === 'container';

  // ── @dnd-kit dragging (#2294): React Flow only renders, the card body is
  // the draggable. Editing mode disables dragging so text selection works.
  // The card itself is moved live via ``nodeOverrides`` (VisceraDndContext
  // dragMove) — no opacity dimming, the real card follows the pointer.
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: nodeId,
    data: { dndType: 'card' } satisfies CardDragData,
    disabled: isEditing,
  });

  const { statusMap, tagMap } = useEntityCache();
  const statusBorder = useStatusBorder(status, statusMap);

  // Schriftfarbe der Karte = Badge-Textfarbe der Button-Bar (S1-Statusfarbe).
  const statusTextClass = resolveStatusTextClass(status, statusBorder, statusMap);

  // ── Context menu ─────────────────────────────────────────────────────────
  const contextMenuRef = useRef<CardContextMenuHandle>(null);
  const handleContextMenu = useContextMenuOpen(contextMenuRef);

  // ── Editing state ────────────────────────────────────────────────────────
  const [editValue, setEditValue] = useState('');

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && editValue.trim()) {
        onConfirmEdit?.(editValue.trim());
      } else if (e.key === 'Escape') {
        onCancelEdit?.();
      }
    },
    [editValue, onConfirmEdit, onCancelEdit],
  );

  // ── Derived ──────────────────────────────────────────────────────────────

  const effectiveTechSlugs = technologiesProp ?? (technology ? [technology] : []);
  const firstTechSlug = effectiveTechSlugs[0];

  // ── Render ───────────────────────────────────────────────────────────────

  if (hidden) return null;

  return (
    <>
      {/* NodeToolbar: Decision + Annotation (top-right), or cancel button when editing */}
      <CardNodeToolbar
        isEditing={isEditing ?? false}
        onCancelEdit={onCancelEdit}
        nodeId={nodeId}
        decisions={decisions}
        annotations={annotations}
        onAddAnnotation={onAddAnnotation}
        cardWidth={width}
        cardHeight={height}
      />

      {/* SVG Card Content — also the @dnd-kit draggable (#2294).
          The ``nopan`` class tells React Flow's pan/zoom system to ignore
          drags starting on the card — otherwise the whole canvas pans
          in parallel to the @dnd-kit card drag. */}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={nopanVariants()}
        style={{ width, height }}
        onContextMenu={isEditing ? undefined : handleContextMenu}
      >
        <svg
          width={width}
          height={height}
          opacity={dimmed ? 0.3 : 1}
          className="overflow-visible nopan"
          style={
            {
              cursor: 'grab',
              // Status-Hover-Farbe für den CSS-Frame (viscera-canvas.css).
              // Fallback: Indigo (Kanten-Hover) wenn kein Status (Default/approved).
              '--card-status-color': statusBorder?.stroke,
            } as React.CSSProperties
          }
        >
          <CardBackground
            kind={kind}
            width={width}
            height={height}
            external={external}
            statusBorder={statusBorder ?? undefined}
          />

          <CardHeader
            kind={kind}
            width={width}
            name={name}
            description={description}
            external={external}
            statusTextClass={statusTextClass}
            firstTechSlug={firstTechSlug}
            isEditing={isEditing}
            editValue={editValue}
            onEditValueChange={setEditValue}
            onEditKeyDown={handleEditKeyDown}
            editingLabel={editingLabel}
          />

          {/* Tag bar — colored line segments inside the card.
              Unterer Abstand (= horizontaler Abstand) 6px + BAR_HEIGHT 4px. */}
          {tags && tags.length > 0 && (
            <TagBar
              tagSlugs={tags}
              tagMap={tagMap}
              cardWidth={width}
              y={height - 10}
            />
          )}

        </svg>
      </div>

      {/* Editing error below card */}
      {isEditing && editingError && (
        <div style={{ position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center' }}>
          <Text size="xs" color="error">{editingError}</Text>
        </div>
      )}

      {/* Edge Handles – visibility controlled by viscera-canvas.css */}
      <CardEdgeHandles layoutDirection={layoutDirection} />

      {/* Context Menu (inkl. Sub-Diagramm-Navigation) */}
      <CardContextMenu
        ref={contextMenuRef}
        nodeId={nodeId}
        name={name}
        kind={kind}
        onCreateContainer={onCreateContainer}
        onCreateComponent={onCreateComponent}
        childDiagrams={childDiagrams}
        onNavigateToChild={onNavigateToChild}
        onOpenDerivedView={onOpenDerivedView}
        canOpenModuleView={canOpenModuleView}
        canOpenComponentView={canOpenComponentView}
      />
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolves the card text colour class from the object status.
 *
 * Schriftfarbe der Karte = Badge-Textfarbe der Button-Bar (S1-Statusfarbe):
 * `fill-current` + `text-tag-*-text` (`COLOR_TOKEN_CSS`) → exakt die vorhandene
 * Textfarbe, theme-abhängig. Only non-default statuses (with a status border)
 * carry an explicit colour, otherwise `undefined` (CSS default).
 */
function resolveStatusTextClass(
  status: string | undefined,
  statusBorder: StatusBorderResult | null,
  statusMap: Map<string, EntityData>,
): string | undefined {
  if (!statusBorder) return undefined;
  const token = (statusMap.get(status ?? '')?.colorToken as ColorToken) ?? 'gray';
  return (COLOR_TOKEN_CSS[token] ?? COLOR_TOKEN_CSS.gray).text;
}

export default memo(CardNode);

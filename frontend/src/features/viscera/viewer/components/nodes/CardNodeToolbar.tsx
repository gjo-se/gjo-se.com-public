import { NodeToolbar, Position } from '@xyflow/react';

import Button from '@src/components/primitives/Button/Button';
import type { Adr } from '@src/features/viscera/adrs/hooks/useAdrs';
import type { Annotation } from '@src/features/viscera/core/workspaceSchema';

import AnnotationBadge from '../badge/AnnotationBadge';
import DecisionBadge from '../badge/DecisionBadge';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CardNodeToolbarProps {
  /** Editing mode: render the cancel button instead of the badges. */
  isEditing: boolean;
  onCancelEdit?: () => void;
  nodeId: string;
  decisions?: Adr[];
  annotations?: Annotation[];
  onAddAnnotation?: (text: string) => void;
  cardWidth: number;
  cardHeight: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Top-right toolbar of a card node: the cancel button while editing, otherwise
 * the decision and annotation badges.
 */
export default function CardNodeToolbar({
  isEditing,
  onCancelEdit,
  nodeId,
  decisions,
  annotations,
  onAddAnnotation,
  cardWidth,
  cardHeight,
}: CardNodeToolbarProps) {
  if (isEditing) {
    return (
      <NodeToolbar isVisible position={Position.Top} align="end" offset={4}>
        <Button
          variant="cancel-icon"
          size="none"
          onClick={() => onCancelEdit?.()}
          title="Abbrechen"
        >
          ×
        </Button>
      </NodeToolbar>
    );
  }

  return (
    <NodeToolbar isVisible position={Position.Top} align="end" offset={4}>
      {decisions && decisions.length > 0 && (
        <DecisionBadge decisions={decisions} systemId={nodeId} cardWidth={cardWidth} />
      )}
      {annotations && onAddAnnotation && (
        <AnnotationBadge
          annotations={annotations}
          onAdd={onAddAnnotation}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
        />
      )}
    </NodeToolbar>
  );
}

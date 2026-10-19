import type { Diagram, Edge } from '@src/features/viscera/core/workspaceSchema';

import { DependenciesView } from '../misc/DependenciesView';

// ── Props ────────────────────────────────────────────────────────────────────

export interface EdgesTabProps {
  objectId: string;
  edges: Edge[];
  diagrams: Diagram[];
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Wraps {@link DependenciesView} as a standalone tab component.
 * Pure presentational — all data comes via props.
 */
export function EdgesTab({ objectId, edges, diagrams }: EdgesTabProps) {
  return (
    <DependenciesView
      objectId={objectId}
      edges={edges}
      diagrams={diagrams}
    />
  );
}

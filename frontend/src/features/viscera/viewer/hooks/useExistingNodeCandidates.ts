import { useMemo } from 'react';

import { useWorkspace } from '../../core/useWorkspace';
import { selectDiagramNodeIds } from '../../services/elkViewMapper';

import type { Diagram, Workspace } from '../../core/workspaceSchema';

// ── Types ─────────────────────────────────────────────────────────────────────

/** A workspace node that can be added to the active diagram. */
export interface ExistingNodeCandidate {
  id: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the display name for a workspace node ID from the flat object
 * list or people (Finding 1/2). Object IDs carry their full dotted value in
 * the ``id`` field, so a direct match covers local and dotted IDs alike.
 */
function resolveNodeName(workspace: Workspace, id: string): string | undefined {
  const person = workspace.people.find((p) => p.id === id);
  if (person) return person.name;

  const object = workspace.objects.find((o) => o.id === id);
  if (object) return object.name;

  return undefined;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Derives the existing nodes that qualify as content for the given diagram
 * but are not yet part of it (Finding 7, #2268).
 *
 * Candidates = `selectDiagramNodeIds(diagram, workspace)` minus the IDs already
 * present in the diagram's persisted `nodes` map. Hook-level derivation is
 * allowed to read global state (workspace context); the rendering component
 * (CandidateNodeList) stays a pure molecule.
 *
 * @param diagram - The active diagram (type + parent define the scope).
 * @returns Candidates with display name, ordered by `selectDiagramNodeIds`.
 */
export function useExistingNodeCandidates(diagram: Diagram | null): ExistingNodeCandidate[] {
  const { workspace } = useWorkspace();

  return useMemo(() => {
    if (!diagram || !workspace) return [];

    const assignedIds = new Set(Object.keys(diagram.nodes ?? {}));

    return selectDiagramNodeIds(diagram, workspace)
      .filter((id) => !assignedIds.has(id))
      .map((id) => ({ id, name: resolveNodeName(workspace, id) ?? id }));
  }, [diagram, workspace]);
}

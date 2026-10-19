import { useMemo } from 'react';

import { useWorkspace } from './useWorkspace';

import type { ChildDiagram, Diagram, Workspace } from './workspaceSchema';

/**
 * Pure derivation function: extracts navigable ChildDiagrams from workspace diagrams.
 *
 * Rules (Kanon R1/R2):
 * - Child diagrams are derived from `workspace.diagrams` (API), NOT from views.
 * - Only diagrams with a direct `parent` are offered.
 * - Only diagrams with `type: 'container'`, `type: 'component'`, `type: 'module'`
 *   or `type: 'dataModel'` are child diagrams (module = L4-Modul-Ebene einer
 *   Component, dataModel = ER-Modell am DB-Container).
 * - Empty diagrams (no nodes) are skipped.
 * - The first diagram for a given parent is the default (deterministic by API order).
 */
export function deriveChildDiagrams(workspace: Workspace): ChildDiagram[] {
  const diagrams = (workspace.diagrams ?? []) as Diagram[];
  const results: ChildDiagram[] = [];

  const seenParents = new Map<string, number>(); // parentId → count (for isDefault)

  diagrams.forEach((diagram) => {
    const parentId = diagram.parent;
    if (!parentId) return;

    // Only container, component, module and dataModel type diagrams are child diagrams
    if (
      diagram.type !== 'container' &&
      diagram.type !== 'component' &&
      diagram.type !== 'module' &&
      diagram.type !== 'dataModel'
    )
      return;

    // Skip empty diagrams
    if (Object.keys(diagram.nodes ?? {}).length === 0) return;

    const parentCount = seenParents.get(parentId) ?? 0;
    seenParents.set(parentId, parentCount + 1);

    results.push({
      key: diagram.key,
      name: diagram.name,
      parentId,
      level: diagram.type,
      description: diagram.description,
      isDefault: parentCount === 0,
    });
  });

  return results;
}

/**
 * Hook: returns ChildDiagram[] for the current workspace, grouped by parentId.
 *
 * Also provides helper to get child diagrams for a specific parent system.
 */
export function useChildDiagrams(): {
  /** All child diagrams derived from workspace.diagrams. */
  diagrams: ChildDiagram[];
  /** Child diagrams grouped by parentId. */
  byParent: Map<string, ChildDiagram[]>;
  /** Get child diagram count for a specific parent. */
  countForParent: (parentId: string) => number;
  /** Get child diagrams for a specific parent. */
  diagramsForParent: (parentId: string) => ChildDiagram[];
} {
  const { workspace } = useWorkspace();

  const diagrams = useMemo(() => {
    if (!workspace) return [];
    return deriveChildDiagrams(workspace);
  }, [workspace]);

  const byParent = useMemo(() => {
    const map = new Map<string, ChildDiagram[]>();
    diagrams.forEach((d) => {
      const existing = map.get(d.parentId) ?? [];
      existing.push(d);
      map.set(d.parentId, existing);
    });
    return map;
  }, [diagrams]);

  const countForParent = useMemo(
    () => (parentId: string) => byParent.get(parentId)?.length ?? 0,
    [byParent],
  );

  const diagramsForParent = useMemo(
    () => (parentId: string) => byParent.get(parentId) ?? [],
    [byParent],
  );

  return { diagrams, byParent, countForParent, diagramsForParent };
}

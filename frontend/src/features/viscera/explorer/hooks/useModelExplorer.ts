import { useMemo } from 'react';

import { useWorkspace } from '../../core/useWorkspace';
import { modelObjectTypeSchema } from '../../core/workspaceSchema';

import type { Diagram, ModelObjectType } from '../../core/workspaceSchema';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Re-export ModelObjectType from schema (SSOT). */
export type { ModelObjectType } from '../../core/workspaceSchema';

export interface ModelObject {
  id: string;
  name: string;
  type: ModelObjectType;
  parentId: string | undefined;
  childrenCount: number;
  edgesCount: number;
  diagramsCount: number;
  status?: string;
  external?: boolean;
  contains?: string[];
  description?: string;
  tags?: string[];
}

export interface UseModelExplorerResult {
  /** Model objects grouped by type. */
  objectsByType: Record<ModelObjectType, ModelObject[]>;
  /** Flat list of all model objects. */
  allObjects: ModelObject[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeDiagramsCount(id: string, diagramsMap: Map<string, number>): number {
  return diagramsMap.get(id) ?? 0;
}

function computeEdgesCount(id: string, edgesMap: Map<string, number>): number {
  return edgesMap.get(id) ?? 0;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook that extracts, normalizes, and enriches all model objects
 * from the workspace for the Model Explorer.
 *
 * - Reads the flat workspace.objects list (parent links instead of nesting)
 * - Computes childrenCount, edgesCount, diagramsCount per object
 * - Diagrams membership via ``workspace.diagrams`` node maps (R1/R2)
 * - Objects with unknown/invalid ``type`` are excluded (data problem, no bucket default)
 * - Groups results by ModelObjectType
 *
 * @throws {Error} If used outside a <WorkspaceProvider>
 */
export function useModelExplorer(): UseModelExplorerResult {
  const { workspace } = useWorkspace();

  return useMemo(() => {
    const empty: ModelObject[] = [];
    const emptyRecord: Record<ModelObjectType, ModelObject[]> = {
      system: [],
      container: [],
      component: [],
      store: [],
      person: [],
      table: [],
    };

    if (!workspace) {
      return { objectsByType: emptyRecord, allObjects: empty };
    }

    const objects = workspace.objects ?? [];
    const edges = workspace.edges ?? [];
    const diagrams = (workspace.diagrams ?? []) as Diagram[];

    // Pre-compute edge counts: count how many edges each element participates in
    const edgesMap = new Map<string, number>();
    edges.forEach((edge) => {
      edgesMap.set(edge.from, (edgesMap.get(edge.from) ?? 0) + 1);
      edgesMap.set(edge.to, (edgesMap.get(edge.to) ?? 0) + 1);
    });

    // Pre-compute diagram counts: count how many diagram node maps each element appears in
    const diagramsMap = new Map<string, number>();
    diagrams.forEach((diagram) => {
      Object.keys(diagram.nodes ?? {}).forEach((includedId) => {
        diagramsMap.set(includedId, (diagramsMap.get(includedId) ?? 0) + 1);
      });
    });

    // Pre-compute childrenCount per parent (flat lookup)
    const childrenCountByParent = new Map<string, number>();
    objects.forEach((obj) => {
      if (obj.parent) {
        childrenCountByParent.set(obj.parent, (childrenCountByParent.get(obj.parent) ?? 0) + 1);
      }
    });

    const allObjects: ModelObject[] = objects.flatMap((obj) => {
      const parsedType = modelObjectTypeSchema.safeParse(obj.type);
      if (!parsedType.success) return [];

      return [{
        id: obj.id,
        name: obj.name,
        type: parsedType.data,
        parentId: obj.parent,
        childrenCount: childrenCountByParent.get(obj.id) ?? 0,
        edgesCount: computeEdgesCount(obj.id, edgesMap),
        diagramsCount: computeDiagramsCount(obj.id, diagramsMap),
        status: obj.status,
        external: obj.external,
        contains: obj.contains,
        description: obj.description,
        tags: obj.tags,
      }];
    });

    // Group by type
    const objectsByType: Record<ModelObjectType, ModelObject[]> = {
      system: [],
      container: [],
      component: [],
      store: [],
      person: [],
      table: [],
    };

    allObjects.forEach((obj) => {
      objectsByType[obj.type].push(obj);
    });

    return { objectsByType, allObjects };
  }, [workspace]);
}

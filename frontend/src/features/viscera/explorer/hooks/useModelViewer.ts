import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { useWorkspace } from '@src/features/viscera/core/useWorkspace';
import type { UseWorkspaceResult } from '@src/features/viscera/core/useWorkspace';
import { tagValues } from '@src/features/viscera/core/workspaceSchema';
import type { ArchitectureObject, Diagram } from '@src/features/viscera/core/workspaceSchema';
import type { NormalizedModelObject, EdgeLine } from '@src/features/viscera/explorer/components/model/ModelViewer';
import { routeConfig } from '@src/router.config';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EdgeLineInternal extends EdgeLine {
  diagrams: string[];
}

export interface UseModelViewerResult {
  workspace: UseWorkspaceResult['workspace'];
  objects: NormalizedModelObject[];
  edges: EdgeLineInternal[];
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  expandedIds: Set<string>;
  onObjectClick: (id: string) => void;
  onObjectHover: (id: string | null) => void;
  onToggleExpand: (id: string) => void;
  onEdgeClick: (from: string, to: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build edge lines from workspace edges, annotated with diagram keys (R1/R2). */
function buildEdges(workspace: {
  edges?: { from: string; to: string; description?: string | null }[];
  diagrams?: Diagram[];
}): EdgeLineInternal[] {
  const edges = workspace.edges ?? [];
  const diagrams = workspace.diagrams ?? [];

  return edges.map((edge) => {
    // Find diagrams whose node map contains both endpoints
    const relatedDiagrams = diagrams
      .filter((d) => {
        const nodeIds = Object.keys(d.nodes ?? {});
        return nodeIds.includes(edge.from) && nodeIds.includes(edge.to);
      })
      .map((d) => d.key);

    return {
      from: edge.from,
      to: edge.to,
      description: edge.description ?? undefined,
      diagrams: relatedDiagrams,
    };
  });
}

/** Count edges per object. */
function computeEdgeCounts(
  objects: NormalizedModelObject[],
  edges: EdgeLineInternal[],
): Map<string, number> {
  const map = new Map<string, number>();
  objects.forEach((obj) => { map.set(obj.id, 0); });
  edges.forEach((edge) => {
    map.set(edge.from, (map.get(edge.from) ?? 0) + 1);
    map.set(edge.to, (map.get(edge.to) ?? 0) + 1);
  });
  return map;
}

/** Build a flat list of all model objects with parentId and children info. Objects with unknown type are excluded. */
function normalizeObjects(workspace: {
  objects?: ArchitectureObject[];
}): NormalizedModelObject[] {
  const flatObjects = workspace.objects ?? [];

  // Pre-count children per parent (flat lookup)
  const childCounts = new Map<string, number>();
  flatObjects.forEach((obj) => {
    if (obj.parent) {
      childCounts.set(obj.parent, (childCounts.get(obj.parent) ?? 0) + 1);
    }
  });

  return flatObjects.flatMap((obj) => {
    const type = toViewerType(obj.type);
    if (!type) return [];

    return [{
      id: obj.id,
      name: obj.name,
      type,
      parentId: obj.parent,
      description: obj.description,
      tags: tagValues(obj.tags),
      technologies: obj.technologies ?? [],
      edgesCount: 0, // filled in later
      hasChildren: (childCounts.get(obj.id) ?? 0) > 0,
    }];
  });
}

/**
 * Map flat object types to viewer display types (stores render as containers).
 * Only known types are mapped — unknown types are a data problem, not a display default.
 */
function toViewerType(type: string | undefined): NormalizedModelObject['type'] | undefined {
  switch (type) {
    case 'system':
      return 'system';
    case 'container':
    case 'store':
      return 'container';
    case 'component':
      return 'component';
    case 'person':
      return 'person';
    default:
      return undefined;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Hook that encapsulates all business logic for the Model Viewer page.
 *
 * - Normalizes the flat workspace.objects list (parent links, persons included;
 *   unknown types are excluded — type is SSOT)
 * - Builds annotated edge lines with diagram references (``workspace.diagrams``)
 * - Manages selection, hover, and expand state
 * - Provides navigation handlers for edge clicks
 *
 * This enables the page to be pure composition (G5/G6 pattern).
 */
export default function useModelViewer(): UseModelViewerResult {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // ── Normalize data ──────────────────────────────────────────────────────

  const { objects, edges } = useMemo(() => {
    if (!workspace) return { objects: [], edges: [] };

    const rawObjects = normalizeObjects(workspace);
    const rawEdges = buildEdges(workspace);
    const edgeCounts = computeEdgeCounts(rawObjects, rawEdges);

    // Apply edge counts
    const objectsWithCounts = rawObjects.map((obj) => ({
      ...obj,
      edgesCount: edgeCounts.get(obj.id) ?? 0,
    }));

    return { objects: objectsWithCounts, edges: rawEdges };
  }, [workspace]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const onObjectClick = useCallback(
    (id: string) => {
      setSelectedObjectId((prev) => (prev === id ? null : id));
    },
    [],
  );

  const onObjectHover = useCallback(
    (id: string | null) => {
      setHoveredObjectId(id);
    },
    [],
  );

  const onToggleExpand = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [],
  );

  const onEdgeClick = useCallback(
    (from: string, to: string) => {
      // Find the edge and get the first diagram key
      const edge = edges.find(
        (e) => e.from === from && e.to === to,
      );
      if (edge && edge.diagrams.length > 0) {
        navigate(`${routeConfig.adminVisceraViews.path}?view=${edge.diagrams[0]}`);
      } else {
        // Fallback: navigate to views without a specific view key
        navigate(routeConfig.adminVisceraViews.path);
      }
    },
    [edges, navigate],
  );

  return {
    workspace,
    objects,
    edges,
    selectedObjectId,
    hoveredObjectId,
    expandedIds,
    onObjectClick,
    onObjectHover,
    onToggleExpand,
    onEdgeClick,
  };
}

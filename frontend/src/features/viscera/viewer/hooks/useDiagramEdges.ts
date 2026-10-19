import { useMemo } from 'react';

import { useVisceraStore } from '../../store/visceraStore';

import type { EntityData } from '../../core/useEntityCache';
import type { FlowStep } from '../../core/workspaceSchema';
import type { DiagramEdge, DiagramNode } from '../../store/diagramSlice';
import type { EdgeData } from '../components/edges/Edge';
import type { Edge } from '@xyflow/react';

// ── Input Interface ──────────────────────────────────────────────────────────

/** Parsed perspective hover key (`<entityType>:<slug>`). */
interface PerspectiveKey {
  entityType: string;
  slug: string;
}

// ── Perspective Helpers ──────────────────────────────────────────────────────

/** Slug → EntityData maps used for perspective highlight resolution. */
interface PerspectiveMaps {
  tagMap: Map<string, EntityData>;
  statusMap: Map<string, EntityData>;
  technologyMap: Map<string, EntityData>;
}

export interface UseDiagramEdgesInput {
  /** Currently hovered card ID (null if none). */
  hoveredCardId: string | null;
  /** Currently selected card ID for pulse effect. */
  selectedCardId: string | null;
  /** Active flow step for edge highlighting (Flow-Player). */
  activeFlowStep?: FlowStep | null;
  /** IDs of nodes hidden by filters. */
  hiddenNodeIds?: Set<string>;
  /** IDs of nodes dimmed by filters. */
  dimmedNodeIds?: Set<string>;
  /** Perspective hover key string (e.g. "tag:kafka") — parsed internally. */
  perspectiveHoveredKey?: string;
  /** Slug → EntityData map for tags (colorToken resolution). */
  tagMap: Map<string, EntityData>;
  /** Slug → EntityData map for statuses. */
  statusMap: Map<string, EntityData>;
  /** Slug → EntityData map for technologies. */
  technologyMap: Map<string, EntityData>;
}

/**
 * Pure function: applies UI state to DiagramEdges from diagramSlice.
 *
 * Handles:
 * - Perspective hover → activeTagColor resolution
 * - Edge visual state flags (previewed, dimmed, pulsing, highlighted, filterDimmed)
 * - Filter-based hiding
 */
function buildDiagramEdges(
  diagramEdges: DiagramEdge[],
  diagramNodes: DiagramNode[],
  input: UseDiagramEdgesInput,
): Edge<EdgeData>[] {
  const {
    hoveredCardId,
    selectedCardId,
    activeFlowStep,
    hiddenNodeIds,
    dimmedNodeIds,
    perspectiveHoveredKey: rawKey,
    tagMap,
    statusMap,
    technologyMap,
  } = input;

  // Parse perspectiveHoveredKey string → structured object
  const perspectiveKey = rawKey ? parsePerspectiveKey(rawKey) : null;
  const maps: PerspectiveMaps = { tagMap, statusMap, technologyMap };

  if (diagramEdges.length === 0) return [];

  // Build node status lookup from diagramNodes for status-based perspective hover
  const nodeStatusMap = new Map<string, string | undefined>();
  diagramNodes.forEach((node) => {
    const status = (node.data as Record<string, unknown>)?.status as string | undefined;
    if (status) {
      nodeStatusMap.set(node.id, status);
    }
  });

  return diagramEdges.map((rel): Edge<EdgeData> => {
    const from = rel.source;
    const to = rel.target;
    const edgeData = (rel.data ?? {}) as Record<string, unknown>;

    const activeTagColor = resolveActiveTagColor(
      perspectiveKey,
      edgeData,
      from,
      to,
      nodeStatusMap,
      maps,
    );
    // Hover einer Card → nur deren direkte Verbindungen aktiv/stärker (previewed).
    const isPreviewed = edgeTouchesCard(hoveredCardId, from, to, edgeData);
    const isPulsing = edgeTouchesCard(selectedCardId, from, to, edgeData);
    const isHighlighted = edgeMatchesFlowStep(activeFlowStep, from, to, edgeData);
    const { hidden, filterDimmed } = resolveEdgeVisibility(from, to, hiddenNodeIds, dimmedNodeIds);

    return {
      id: rel.id,
      source: from,
      target: to,
      // L4 nutzt den built-in `straight`-Edge (gerade Kanten); Default: edge (L1–L3).
      type: rel.type ?? ('edge' as const),
      reconnectable: true,
      hidden,
      // Beim Hover einer Card nur deren direkte Verbindungen über die Nodes
      // heben (per-Edge-Z-Index) — die übrigen Edges bleiben unter den Nodes
      // (#2523).
      zIndex: isPreviewed ? 10 : undefined,
      data: {
        label: edgeData.label as string | undefined,
        description: edgeData.description as string | undefined,
        technology: edgeData.technology as string | undefined,
        activeTagColor,
        previewed: isPreviewed,
        dimmed: filterDimmed,
        filterDimmed,
        pulsing: isPulsing,
        highlighted: isHighlighted,
        // FK-Flag aus den Diagram-Edge-Modellen durchreichen (ER-Rendering).
        crowFoot: edgeData.crowFoot as boolean | undefined,
      },
    };
  });
}

/** True if the edge connects both endpoints of the active flow step. */
function edgeMatchesFlowStep(
  step: FlowStep | null | undefined,
  from: string,
  to: string,
  edgeData: Record<string, unknown>,
): boolean {
  if (step?.from === undefined || step?.to === undefined) return false;
  const origFrom = edgeData.originalFrom as string | undefined;
  const origTo = edgeData.originalTo as string | undefined;
  return (from === step.from || origFrom === step.from)
    && (to === step.to || origTo === step.to);
}

// ── Edge-state Predicates ────────────────────────────────────────────────────

/** True if `id` is null-safe matching one of the edge endpoints (incl. projected originals). */
function edgeTouchesCard(
  id: string | null,
  from: string,
  to: string,
  edgeData: Record<string, unknown>,
): boolean {
  if (id === null) return false;
  const origFrom = edgeData.originalFrom as string | undefined;
  const origTo = edgeData.originalTo as string | undefined;
  return from === id || to === id || origFrom === id || origTo === id;
}

/** Parses a raw `perspectiveHoveredKey` string into its parts (null if malformed). */
function parsePerspectiveKey(raw: string): PerspectiveKey | null {
  const colonIdx = raw.indexOf(':');
  if (colonIdx <= 0) return null;
  return { entityType: raw.slice(0, colonIdx), slug: raw.slice(colonIdx + 1) };
}

/**
 * Resolves the highlight color for a perspective hover, if the edge matches the
 * hovered tag / technology / status entity.
 */
function resolveActiveTagColor(
  perspectiveKey: PerspectiveKey | null,
  edgeData: Record<string, unknown>,
  from: string,
  to: string,
  nodeStatusMap: Map<string, string | undefined>,
  maps: PerspectiveMaps,
): string | undefined {
  if (!perspectiveKey) return undefined;
  const { entityType, slug } = perspectiveKey;

  if (entityType === 'tag') {
    const tagData = maps.tagMap.get(slug);
    const relTags = edgeData.tags as string[] | undefined;
    if (tagData && relTags?.includes(slug)) return tagData.colorToken;
  } else if (entityType === 'technology') {
    const techData = maps.technologyMap.get(slug);
    if (techData && edgeData.technology === slug) return techData.colorToken;
  } else if (entityType === 'status') {
    const statusData = maps.statusMap.get(slug);
    if (statusData && (nodeStatusMap.get(from) === slug || nodeStatusMap.get(to) === slug)) {
      return statusData.colorToken;
    }
  }

  return undefined;
}

// ── Pure Function ────────────────────────────────────────────────────────────

/** Resolves the edge's hidden/filter-dimmed visibility from the filter node sets. */
function resolveEdgeVisibility(
  from: string,
  to: string,
  hiddenNodeIds: Set<string> | undefined,
  dimmedNodeIds: Set<string> | undefined,
): { hidden: boolean; filterDimmed: boolean } {
  const fromHidden = hiddenNodeIds?.has(from) ?? false;
  const toHidden = hiddenNodeIds?.has(to) ?? false;
  const fromDimmed = !fromHidden && (dimmedNodeIds?.has(from) ?? false);
  const toDimmed = !toHidden && (dimmedNodeIds?.has(to) ?? false);
  return { hidden: fromHidden || toHidden, filterDimmed: fromDimmed || toDimmed };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook: reads `diagramSlice.edges` and `diagramSlice.nodes` from the store,
 * then applies dynamic UI state via `buildDiagramEdges`.
 *
 * Memoized via useMemo with all reactive inputs as dependencies.
 */
export function useDiagramEdges(input: UseDiagramEdgesInput): Edge<EdgeData>[] {
  const {
    hoveredCardId,
    selectedCardId,
    activeFlowStep,
    hiddenNodeIds,
    dimmedNodeIds,
    perspectiveHoveredKey,
    tagMap,
    statusMap,
    technologyMap,
  } = input;
  const diagramEdges = useVisceraStore((s) => s.edges);
  const diagramNodes = useVisceraStore((s) => s.nodes);

  return useMemo(
    () =>
      buildDiagramEdges(diagramEdges, diagramNodes, {
        hoveredCardId,
        selectedCardId,
        activeFlowStep,
        hiddenNodeIds,
        dimmedNodeIds,
        perspectiveHoveredKey,
        tagMap,
        statusMap,
        technologyMap,
      }),
    [
      diagramEdges,
      diagramNodes,
      hoveredCardId,
      selectedCardId,
      activeFlowStep,
      hiddenNodeIds,
      dimmedNodeIds,
      perspectiveHoveredKey,
      tagMap,
      statusMap,
      technologyMap,
    ],
  );
}

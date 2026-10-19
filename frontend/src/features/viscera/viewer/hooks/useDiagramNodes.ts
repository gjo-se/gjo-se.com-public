import { getNodesBounds } from '@xyflow/react';
import { useMemo } from 'react';

import { CARD, FILE, GROUP_MIN, GROUP_PADDING } from '../../core/nodeDimensions';
import { overrideKey } from '../../core/nodeOverrides';
import { useVisceraStore } from '../../store/visceraStore';

import type { Adr } from '../../adrs/hooks/useAdrs';
import type { OverridePosition } from '../../core/nodeOverrides';
import type { ChildDiagram } from '../../core/workspaceSchema';
import type { DiagramNode } from '../../store/diagramSlice';
import type { ModuleFilterAction } from '../../store/modulesSlice';
import type { CardNodeData } from '../components/nodes/CardNode';
import type { GroupNodeData } from '../components/nodes/GroupNode';
import type { Node } from '@xyflow/react';

// ── Input Interface ──────────────────────────────────────────────────────────

export interface UseDiagramNodesInput {
  /** IDs of nodes dimmed by filters. */
  dimmedNodeIds?: Set<string>;
  /** IDs of nodes hidden by filters. */
  hiddenNodeIds?: Set<string>;
  /** Computes child diagrams for a given parent ID. */
  diagramsForParent?: (parentId: string) => ChildDiagram[];
  /** Resolves ADR decisions for a node ID. */
  getDecisionsForSystem?: (systemId: string) => Adr[];
  /** Callback for navigating to a child view. */
  onViewKeyChange?: (viewKey: string) => void;
  /** Callback for opening a derived L3/L4 view of a node (parent = node id, level = 'component' | 'module'). */
  onOpenDerivedView?: (parentId: string, level: 'component' | 'module') => void;
  /** Callback for adding an annotation to an object. */
  onAddAnnotation?: (objectId: string, text: string) => void;
  /** Callback for creating a new container. */
  onCreateContainer?: (systemId: string) => void;
  /** Callback for creating a new component. */
  onCreateComponent?: (containerId: string) => void;
  /** Callback for renaming a group (GroupNode context menu, #2278). */
  onRenameGroup?: (id: string, name: string) => void;
  /** Callback for deleting a group (GroupNode context menu, #2278). */
  onDeleteGroup?: (id: string) => void;
  /** Callback for L4 module filter actions (FileNode context menu). */
  onModuleFilter?: (action: ModuleFilterAction, moduleName: string) => void;
  /** L4 module node IDs that are currently collapsed (drives the menu label). */
  collapsedNodeIds?: Set<string>;
  /** Current diagram key — used to build composite nodeOverrides keys (#2229). */
  diagramKey?: string;
  /** Persisted node positions/group bounds from the current diagram YAML `nodes` map (#2229, #2293). */
  diagramPositions?: Record<string, { x: number; y: number; width?: number; height?: number }>;
  /**
   * Layout-Richtung des aktuellen Diagramms (aus ELK-Optionen) – `'lr'` (links/rechts)
   * oder `'down'` (oben/unten). Steuert die Ausrichtung der Edge-Handles an den Cards
   * (source/target), damit Kanten zur Layering-Richtung passen. Nur für CardNode.
   */
  layoutDirection?: 'lr' | 'down';
}

// ── Pure Function ────────────────────────────────────────────────────────────

/**
 * Pure function that transforms `DiagramNode[]` from diagramSlice into ReactFlow Node objects.
 *
 * Handles:
 * - Position override application (from manual drag)
 * - Group node dimension computation (via getNodesBounds from child positions)
 * - Hidden/dimmed state flags
 * - ReactFlow-specific wrapping (width, height, style)
 */
function buildDiagramNodes(
  diagramNodes: DiagramNode[],
  nodeOverrides: Record<string, OverridePosition>,
  input: UseDiagramNodesInput,
): Node<CardNodeData | GroupNodeData>[] {
  const {
    dimmedNodeIds,
    hiddenNodeIds,
    onViewKeyChange,
    onOpenDerivedView,
    onAddAnnotation,
    getDecisionsForSystem,
    diagramsForParent,
    onCreateContainer,
    onCreateComponent,
    onRenameGroup,
    onDeleteGroup,
    onModuleFilter,
    collapsedNodeIds,
    diagramKey,
    diagramPositions,
    layoutDirection,
  } = input;

  if (diagramNodes.length === 0) return [];

  // Resolve a node's on-screen position: override (per-diagram) → persisted diagram YAML → ELK default.
  // Ein persistierter Eintrag zählt nur, wenn er eine numerische x/y-Position trägt —
  // description-only-Overrides (derived L3/L4, #2492) haben kein x/y und dürfen die
  // ELK-Position nicht mit NaN überschreiben.
  const resolvePosition = (nodeId: string, fallback: OverridePosition): OverridePosition => {
    const key = diagramKey ? overrideKey(diagramKey, nodeId) : nodeId;
    const override = nodeOverrides[key];
    if (override && Number.isFinite(override.x) && Number.isFinite(override.y)) return override;
    const persisted = diagramPositions?.[nodeId];
    if (
      persisted &&
      Number.isFinite(persisted.x) &&
      Number.isFinite(persisted.y)
    ) {
      return { x: persisted.x, y: persisted.y };
    }
    return fallback;
  };

  // Separate groups and regular nodes for rendering order
  const groups = diagramNodes.filter((n) => n.type === 'group');
  const regularNodes = diagramNodes.filter((n) => n.type !== 'group');

  // Build a map of child positions for group bounds computation
  const childPositionMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  regularNodes.forEach((node) => {
    const pos = resolvePosition(node.id, node.position);
    const width =
      node.type === 'file'
        ? FILE.width
        : node.type === 'group'
          ? GROUP_MIN.width
          : CARD.width;
    const height =
      node.type === 'file'
        ? FILE.height
        : node.type === 'group'
          ? GROUP_MIN.height
          : CARD.height;
    childPositionMap.set(node.id, { x: pos.x, y: pos.y, width, height });
  });

  const nodes: Node<CardNodeData | GroupNodeData>[] = [];

  // Render group nodes first (behind child nodes)
  groups.forEach((group) => {
    const groupPosApplied = resolvePosition(group.id, group.position);
    const groupX = groupPosApplied.x;
    const groupY = groupPosApplied.y;

    // Compute group dimensions from children positions via getNodesBounds
    const members = (group.data as Record<string, unknown>)?.members as string[] | undefined;
    const groupChildPositions = members
      ? members
          .map((childId) => childPositionMap.get(childId))
          .filter((p): p is NonNullable<typeof p> => p !== undefined)
      : [];

    const groupBounds = getNodesBounds(
      groupChildPositions.map((np) => ({
        id: 'child',
        position: { x: np.x, y: np.y },
        width: np.width,
        height: np.height,
        measured: { width: np.width, height: np.height },
      })) as Node[],
    );

    const derivedWidth =
      groupBounds.width > 0
        ? groupBounds.width + GROUP_PADDING.left + GROUP_PADDING.right
        : GROUP_MIN.width;
    const derivedHeight =
      groupBounds.height > 0
        ? groupBounds.height + GROUP_PADDING.top + GROUP_PADDING.bottom
        : GROUP_MIN.height;

    // Persisted group bounds (diagram nodes map) take precedence (#2293).
    // Member-bounds derivation is only a fallback for groups without an entry.
    const persistedBounds = diagramPositions?.[group.id];
    const persistedWidth = persistedBounds?.width;
    const persistedHeight = persistedBounds?.height;
    const hasPersistedBounds =
      persistedWidth !== undefined &&
      persistedWidth > 0 &&
      persistedHeight !== undefined &&
      persistedHeight > 0;

    // Override bounds (group move/resize in this session) win over persisted
    // YAML bounds — mirrors the position resolution order (#2293).
    const overrideWidth = groupPosApplied.width;
    const overrideHeight = groupPosApplied.height;
    const hasOverrideBounds = overrideWidth !== undefined && overrideHeight !== undefined;

    const groupWidth = hasOverrideBounds
      ? overrideWidth
      : hasPersistedBounds
        ? persistedWidth
        : derivedWidth;
    const groupHeight = hasOverrideBounds
      ? overrideHeight
      : hasPersistedBounds
        ? persistedHeight
        : derivedHeight;

    const isGroupHidden = hiddenNodeIds?.has(group.id) ?? false;
    const isGroupDimmed = !isGroupHidden && (dimmedNodeIds?.has(group.id) ?? false);

    nodes.push({
      id: group.id,
      type: 'group',
      position: { x: groupX, y: groupY },
      data: {
        name: (group.data as Partial<GroupNodeData>).name ?? group.id,
        width: groupWidth,
        height: groupHeight,
        dimmed: isGroupDimmed,
        hidden: isGroupHidden,
        onRenameGroup,
        onDeleteGroup,
      },
      width: groupWidth,
      height: groupHeight,
      hidden: isGroupHidden,
      style: isGroupDimmed
        ? { backgroundColor: 'transparent', border: 'none', opacity: 0.3 }
        : { backgroundColor: 'transparent', border: 'none' },
    });
  });

  // Build set of child IDs for groups (for parentId assignment)
  const groupChildIds = new Set<string>();
  groups.forEach((group) => {
    const members = (group.data as Record<string, unknown>)?.members as string[] | undefined;
    members?.forEach((childId) => groupChildIds.add(childId));
  });

  // Determine which group (if any) a node belongs to
  const childToGroupMap = new Map<string, string>();
  groups.forEach((group) => {
    const members = (group.data as Record<string, unknown>)?.members as string[] | undefined;
    members?.forEach((childId) => {
      if (!childToGroupMap.has(childId)) {
        childToGroupMap.set(childId, group.id);
      }
    });
  });

  // Render regular nodes
  regularNodes.forEach((node) => {
    const isNodeHidden = hiddenNodeIds?.has(node.id) ?? false;
    const isNodeDimmed = !isNodeHidden && (dimmedNodeIds?.has(node.id) ?? false);
    const pos = resolvePosition(node.id, node.position);
    const parentId = childToGroupMap.get(node.id);
    const isGroupChild = groupChildIds.has(node.id);

    // Resolve dynamic data per node — shallow copy to avoid mutating frozen store objects.
    // `DiagramNode.data` is typed as the freestanding `Record<string, unknown>`, but at
    // runtime it carries the CardNode payload — assert the copy back to that shape.
    const nodeData = { ...node.data } as CardNodeData;
    const decisions = getDecisionsForSystem?.(node.id);
    if (decisions) {
      nodeData.decisions = decisions;
    }
    if (diagramsForParent) {
      const childDiagrams = diagramsForParent(node.id);
      if (childDiagrams.length > 0) {
        nodeData.childDiagrams = childDiagrams;
      }
    }

    // Inject callbacks
    if (onViewKeyChange) {
      nodeData.onNavigateToChild = onViewKeyChange;
    }
    if (onOpenDerivedView) {
      nodeData.onOpenDerivedView = onOpenDerivedView;
    }
    if (onAddAnnotation) {
      nodeData.onAddAnnotation = (text: string) => onAddAnnotation(node.id, text);
    }
    if (node.type === 'systemCard' && onCreateContainer) {
      nodeData.onCreateContainer = onCreateContainer;
    }
    if (node.type === 'containerCard' && onCreateComponent) {
      nodeData.onCreateComponent = onCreateComponent;
    }
    // L4: Modul-Interaktion – Callback + Collapse-Status auf file-Nodes injizieren.
    if (node.type === 'file' && onModuleFilter) {
      nodeData.onModuleFilter = (action: ModuleFilterAction, moduleName: string) =>
        onModuleFilter(action, moduleName);
    }
    if (node.type === 'file') {
      nodeData.collapsed = collapsedNodeIds?.has(node.id) ?? false;
    }

    // File nodes use compact FILE dimensions; all others use CARD.
    const nodeWidth = node.type === 'file' ? FILE.width : CARD.width;
    const nodeHeight = node.type === 'file' ? FILE.height : CARD.height;

    nodes.push({
      id: node.id,
      type: node.type,
      position: pos,
      parentId: isGroupChild ? parentId : undefined,
      extent: isGroupChild ? 'parent' : undefined,
      hidden: isNodeHidden,
      style: isNodeDimmed ? { opacity: 0.3 } : undefined,
      data: {
        ...nodeData,
        dimmed: isNodeDimmed,
        hidden: isNodeHidden,
        cardWidth: nodeWidth,
        cardHeight: nodeHeight,
        layoutDirection,
      },
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  return nodes;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook that reads `diagramSlice.nodes` and `diagramSlice.nodeOverrides` from the store,
 * then derives ReactFlow Node objects with UI state applied.
 *
 * Memoized via useMemo with all reactive inputs as dependencies.
 */
export function useDiagramNodes(
  input: UseDiagramNodesInput,
): Node<CardNodeData | GroupNodeData>[] {
  const diagramNodes = useVisceraStore((s) => s.nodes);
  const nodeOverrides = useVisceraStore((s) => s.nodeOverrides);

  return useMemo(
    () => buildDiagramNodes(diagramNodes, nodeOverrides, input),
    [diagramNodes, nodeOverrides, input],
  );
}

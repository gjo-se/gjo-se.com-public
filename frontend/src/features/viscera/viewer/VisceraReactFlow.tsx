import { useNodesState, useReactFlow, useOnSelectionChange } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { resolveActiveDiagram } from '../core/derivedDiagram';
import { getDiagramLevel } from '../core/levelRegistry';
import { GROUP_MIN } from '../core/nodeDimensions';
import { overrideKey } from '../core/nodeOverrides';
import { useChildDiagrams } from '../core/useChildDiagrams';
import { useEntityCache } from '../core/useEntityCache';
import { useWorkspace } from '../core/useWorkspace';
import { useCanvas } from '../hooks/useCanvas';
import { useModules } from '../hooks/useModules';
import { computeLayout } from '../services/elkLayoutService';
import { useVisceraStore } from '../store/visceraStore';

import CanvasContainer from './CanvasContainer';
import { useDiagramEdges } from './hooks/useDiagramEdges';
import { useDiagramNodes } from './hooks/useDiagramNodes';
import { useNormalizedCanvasNodes } from './hooks/useNormalizedCanvasNodes';
import { computeModuleFilteredIds } from './utils/computeModuleFilteredIds';
import { buildDiagramEdgeModels, buildDiagramNodeModels } from './utils/diagramModels';
import {
  buildModuleEdgeModels,
  buildModuleNodeModels,
} from './utils/moduleModels';
import { NODE_TYPES, EDGE_TYPES } from './utils/nodeEdgeTypes';

import type { ViewerDiagramCallbacks } from './utils/viewerProps';
import type { Adr } from '../adrs/hooks/useAdrs';
import type { FlowStep } from '../core/workspaceSchema';
import type { ModuleFilterAction } from '../store/modulesSlice';
import type { ColorMode, Edge, Node, NodeTypes, EdgeTypes } from '@xyflow/react';

export interface VisceraReactFlowProps extends ViewerDiagramCallbacks {
  onObjectClick?: (id: string) => void;
  currentViewKey: string;
  onViewKeyChange: (key: string) => void;
  /** Opens a derived L3/L4 view for a container/component (parent = node id). */
  onOpenDerivedView?: (parentId: string, level: 'component' | 'module') => void;
  getDecisionsForSystem?: (systemId: string) => Adr[];
  onAddAnnotation?: (objectId: string, text: string) => void;
  activeFlowStep?: FlowStep | null;
  hiddenNodeIds?: Set<string>;
  dimmedNodeIds?: Set<string>;
  isFullscreen?: boolean;
  colorMode?: ColorMode;
  layoutResetKey?: number;
  perspectiveHoveredKey?: string;
}

/**
 * React Flow wrapper for Viscera architecture diagrams — orchestrates data hooks
 * (Nodes, Edges, Workspace) and delegates canvas interaction to useCanvas + CanvasContainer.
 */
export default function VisceraReactFlow({
  onObjectClick,
  currentViewKey,
  onViewKeyChange,
  onOpenDerivedView,
  onBeforePersist,
  getDecisionsForSystem,
  onAddAnnotation,
  activeFlowStep,
  hiddenNodeIds,
  dimmedNodeIds,
  isFullscreen = false,
  colorMode = 'system',
  layoutResetKey = 0,
  perspectiveHoveredKey,
  onCreateContainer,
  onCreateComponent,
  onConfirmPlaceholder,
  onCancelPlaceholder,
  activeDiagram = null,
  onAssignExistingNode,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
}: VisceraReactFlowProps) {
  const { workspace } = useWorkspace();
  const reactFlowInstance = useReactFlow();
  const { diagramsForParent } = useChildDiagrams();
  const { tagMap, technologyMap, statusMap } = useEntityCache();
  const moduleData = useModules();
  const loadModules = moduleData.loadModules;

  // Ephemerer derived-Diagramm-State (#2491) — nur für offene derived L3/L4-Views.
  const derivedDiagram = useVisceraStore((s) => s.derivedDiagram);

  // ELK layout + diagramSlice population — recomputes on workspace/viewKey/layoutResetKey.

  // Resolve current diagram's persisted node positions from the API (#2229);
  // falls kein persisted Diagramm existiert, liefert der Resolver das ephemere
  // derived-Diagramm (lazy L3/L4, #2491).
  const currentDiagram = resolveActiveDiagram(workspace, currentViewKey, derivedDiagram);

  // L3/L4-Detektion über den Level-Vertrag (Registry) – steuert den derived Render-Pfad.
  const level = currentDiagram ? getDiagramLevel(currentDiagram.type) : undefined;
  // Nur L4 (module) rendert aus modules[] (derived Projektion, keine nodes/*-Objekte).
  // L3 components sind seit der Objekt-Persistenz `'objects'`-basiert und laufen über
  // denselben Objekt-Render-Pfad wie L1/L2 (buildDiagramNodeModels/buildFlatGraph).
  const isModuleLevel = level?.dataSource === 'modules';

  // ── L4-Modul-Interaktion (Store-Filter) ──────────────────────────────────
  const focusModuleId = useVisceraStore((s) => s.focusModuleId);
  const focusMode = useVisceraStore((s) => s.focusMode);
  const collapsedIds = useVisceraStore((s) => s.collapsedIds);

  // Modul-Filter-Sets nur im L4-Branch berechnen (pure Funktion, kein Store-Import).
  const moduleFilteredIds = useMemo(
    () =>
      isModuleLevel
        ? computeModuleFilteredIds({
            modules: moduleData.modules,
            focusModuleId,
            focusMode,
            collapsedIds,
          })
        : null,
    [isModuleLevel, moduleData.modules, focusModuleId, focusMode, collapsedIds],
  );

  // L4-Filter mit den Page-Level-Filtern (Badge/Perspective) mergen (Union) –
  // der L1–L3-Pfad bleibt dadurch unverändert.
  const effectiveHiddenNodeIds = useMemo(() => {
    const merged = new Set(hiddenNodeIds ?? []);
    moduleFilteredIds?.hiddenNodeIds.forEach((id) => merged.add(id));
    return merged;
  }, [hiddenNodeIds, moduleFilteredIds]);

  const effectiveDimmedNodeIds = useMemo(() => {
    const merged = new Set(dimmedNodeIds ?? []);
    moduleFilteredIds?.dimmedNodeIds.forEach((id) => merged.add(id));
    return merged;
  }, [dimmedNodeIds, moduleFilteredIds]);

  const collapsedNodeIds = useMemo(() => new Set(collapsedIds), [collapsedIds]);

  // Modul-Interaktions-Callback: Node-Komponenten bleiben Store-frei – hier
  // werden die Slice-Actions via getState() verdrahtet.
  const onModuleFilter = useCallback((action: ModuleFilterAction, moduleName: string) => {
    const store = useVisceraStore.getState();
    switch (action) {
      case 'focus':
        store.setModuleFocus(moduleName, 'focus');
        break;
      case 'reaches':
        store.setModuleFocus(moduleName, 'reaches');
        break;
      case 'impact':
        store.setModuleFocus(moduleName, 'impact');
        break;
      case 'toggle-collapse':
        store.toggleModuleCollapse(moduleName);
        break;
      case 'reset':
        store.resetModuleFilters();
        break;
    }
  }, []);

  // L4 (module): Module aus dem Store laden, sobald eine derived Module-View
  // geöffnet wird – gefiltert auf den Component-Key (`currentDiagram.parent`).
  // L1–L3 (objects) laden keine Module, sie rendern aus workspace.objects.
  useEffect(() => {
    if (isModuleLevel && currentDiagram?.parent) {
      void loadModules('backend', currentDiagram.parent);
    }
  }, [isModuleLevel, currentDiagram?.parent, currentViewKey, workspace, loadModules]);

  useEffect(() => {
    // Clear overrides synchronously BEFORE the async layout, so ELK computes
    // default positions without stale drag overrides.
    if (layoutResetKey > 0) {
      useVisceraStore.getState().clearPersistedOverrides();
    }

    // One-shot reset guard (#2523): resetLayout cleared the diagram YAML nodes map.
    // The re-layout must NOT auto-persist ELK positions back into the file, otherwise
    // a "Reset Layout" repopulates the just-emptied file. Consume the flag once.
    const suppressAutoPersist = useVisceraStore.getState().suppressAutoPersist;
    if (suppressAutoPersist) {
      useVisceraStore.getState().setSuppressAutoPersist(false);
    }

    if (!workspace) {
      useVisceraStore.getState().setBasePositions([]);
      useVisceraStore.getState().setNodes([]);
      useVisceraStore.getState().setEdges([]);
      return;
    }

    const diagram = resolveActiveDiagram(workspace, currentViewKey, derivedDiagram);
    const nodesEmpty = !diagram?.nodes || Object.keys(diagram.nodes).length === 0;

    let cancelled = false;

    computeLayout({
      workspace,
      viewKey: currentViewKey,
      overrides: new Map(),
      nodesEmpty,
      modules: isModuleLevel ? moduleData.modules : undefined,
      derivedDiagram,
    }).then((result) => {
      if (cancelled) return;

      useVisceraStore.getState().setBasePositions(result.positions);

      // L4 (module) nutzt die File-Modelle (derived aus modules[]); L1/L2/L3/ER
      // die Objekt-Modelle (L3 components sind `nodes/*.yml`-Objekte).
      const diagramNodes = isModuleLevel
        ? buildModuleNodeModels(workspace, moduleData.modules, result.positions, diagram)
        : buildDiagramNodeModels(
            workspace,
            result.positions,
            currentViewKey,
            diagramsForParent,
            getDecisionsForSystem,
            derivedDiagram,
          );
      const diagramEdges = isModuleLevel
        ? buildModuleEdgeModels(moduleData.modules, result.positions)
        : buildDiagramEdgeModels(
            workspace,
            result.positions,
            currentViewKey,
            derivedDiagram,
          );

      useVisceraStore.getState().setNodes(diagramNodes);
      useVisceraStore.getState().setEdges(diagramEdges);

      // Persist on initial layout (#2232) or group-bounds backfill (#2293).
      // L4 (derived aus modules[]) überspringt den Auto-Persist bewusst
      // (File-Nodes sind keine `nodes/*.yml`-Objekte → kein YAML-Bloat).
      // Zusätzlich: kein Auto-Persist, wenn kein persisted Diagramm aufgelöst
      // wurde (`diagram` undefined) — z. B. nach einem Quellen-Wechsel (code↔golden),
      // wenn die aktive View in der anderen Welt nicht existiert. Sonst würde der
      // Effekt (noch alter workspace + bereits neue source) eine fremde Diagrammdatei
      // der neuen Welt mit ELK-Positionen überschreiben (Race, #2523).
      if (!isModuleLevel && diagram) {
        const persistedNodes = diagram?.nodes ?? {};
        const positionsById = new Map(result.positions.map((np) => [np.id, np]));
        const groupIds = (workspace.groups ?? []).map((group) => group.id);
        const missingBoundsGroups = groupIds.filter((groupId) => {
          // Group without an ELK position cannot be backfilled
          if (!positionsById.has(groupId)) return false;
          const entry = persistedNodes[groupId];
          return entry?.width === undefined || entry?.height === undefined;
        });

        if ((result.wasInitial || missingBoundsGroups.length > 0) && !suppressAutoPersist) {
          const positionMap: Record<
            string,
            { x: number; y: number; width?: number; height?: number }
          > = { ...persistedNodes };

          result.positions.forEach((np) => {
            positionMap[np.id] ??= { x: np.position.x, y: np.position.y };
          });

          // Group bounds from the ELK result; persisted x/y stay untouched. Empty groups
          // fall back to GROUP_MIN — the size useDiagramNodes renders (#2293).
          groupIds.forEach((groupId) => {
            const np = positionsById.get(groupId);
            if (!np) return;
            const width = np.width > 0 ? np.width : GROUP_MIN.width;
            const height = np.height > 0 ? np.height : GROUP_MIN.height;
            positionMap[groupId] = {
              x: positionMap[groupId]?.x ?? np.position.x,
              y: positionMap[groupId]?.y ?? np.position.y,
              width,
              height,
            };
          });

          useVisceraStore.getState().persistLayout(currentViewKey, positionMap);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    workspace,
    currentViewKey,
    derivedDiagram,
    layoutResetKey,
    diagramsForParent,
    getDecisionsForSystem,
    isModuleLevel,
    moduleData.modules,
  ]);

  // ── DnD onBeforePersist: materialisiert das derived-Diagramm VOR persist_layout (#2491).
  // Liest den derived-State frisch via getState(), damit nach der ersten Materialisierung
  // (derivedDiagram geleert) keine erneute Materialisierung in Folge-Calls anstößt.
  const handleBeforePersist = useCallback(
    (key: string) => {
      const derived = useVisceraStore.getState().derivedDiagram;
      if (derived?.key === key) onBeforePersist?.(key);
    },
    [onBeforePersist],
  );

  // Sync React Flow selection to store for keyboard delete shortcut
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const store = useVisceraStore.getState();
      store.setSelectedNodes(
        selectedNodes.map((n) => {
          const ownName = n.data?.name;
          return { id: n.id, name: typeof ownName === 'string' ? ownName : n.id };
        }),
      );
      store.setSelectedEdges(
        selectedEdges.map((e) => ({ id: e.id })),
      );
    },
  });

  const initialNodes = useDiagramNodes({
    dimmedNodeIds: effectiveDimmedNodeIds,
    hiddenNodeIds: effectiveHiddenNodeIds,
    diagramsForParent,
    getDecisionsForSystem,
    onViewKeyChange,
    onOpenDerivedView,
    onAddAnnotation,
    onCreateContainer,
    onCreateComponent,
    onRenameGroup,
    onDeleteGroup,
    onModuleFilter,
    collapsedNodeIds,
    diagramKey: currentViewKey,
    diagramPositions: currentDiagram?.nodes,
    layoutDirection:
      level?.layoutStrategy === 'hierarchicalGroups' ||
      level?.diagramType === 'container' ||
      level?.diagramType === 'component'
        ? 'down'
        : 'lr',
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);

  // Sync ReactFlow node state only on view/workspace/layout-reset/node-count changes —
  // otherwise manually added optimistic nodes would be overwritten on filter toggles.
  const prevViewRef = useRef(currentViewKey);
  const prevWsRef = useRef(workspace);
  const prevLayoutResetRef = useRef(layoutResetKey);
  const prevNodeCountRef = useRef(initialNodes.length);
  // Signature of node identity/shape (id:type:kind) — catches in-place model
  // rebuilds (e.g. optimistic type change container→store) that neither change
  // the node count nor the workspace identity after the async ELK rebuild.
  const prevNodeSignatureRef = useRef('');
  const nodeSignature = initialNodes
    .map((n) => `${n.id}:${n.type}:${(n.data as { kind?: string }).kind ?? ''}`)
    .join('|');

  useEffect(() => {
    const viewChanged = currentViewKey !== prevViewRef.current;
    const wsChanged = workspace !== prevWsRef.current;
    const layoutResetChanged = layoutResetKey !== prevLayoutResetRef.current;
    const nodeCountChanged = initialNodes.length !== prevNodeCountRef.current;
    const signatureChanged = nodeSignature !== prevNodeSignatureRef.current;

    prevViewRef.current = currentViewKey;
    prevWsRef.current = workspace;
    prevLayoutResetRef.current = layoutResetKey;
    prevNodeCountRef.current = initialNodes.length;
    prevNodeSignatureRef.current = nodeSignature;

    if (!nodeCountChanged && !layoutResetChanged && !viewChanged && !wsChanged && !signatureChanged) return;

    // nodeOverrides come from diagramSlice, keyed by `${diagramKey}:${nodeId}` (#2229)
    const overrides = useVisceraStore.getState().nodeOverrides;
    const hasOverrides = Object.keys(overrides).length > 0;

    if (!hasOverrides) {
      setNodes(initialNodes);
      return;
    }

    setNodes(
      initialNodes.map((n) => {
        const o = overrides[overrideKey(currentViewKey, n.id)];
        return o ? { ...n, position: { x: o.x, y: o.y } } : n;
      }),
    );
  }, [initialNodes, setNodes, currentViewKey, workspace, layoutResetKey, nodeSignature]);

  const canvas = useCanvas({ currentViewKey, nodes, reactFlowInstance, onObjectClick });

  const nodeOverrides = useVisceraStore((s) => s.nodeOverrides);

  const nodesForCanvas = useNormalizedCanvasNodes({ nodes, nodeOverrides, currentViewKey });

  const edges = useDiagramEdges({
    hoveredCardId: canvas.hoveredCardId,
    selectedCardId: canvas.selectedCardId,
    activeFlowStep,
    hiddenNodeIds: effectiveHiddenNodeIds,
    dimmedNodeIds: effectiveDimmedNodeIds,
    perspectiveHoveredKey,
    tagMap,
    statusMap,
    technologyMap,
  });

  if (!workspace) return null;

  return (
    <CanvasContainer
      nodes={nodesForCanvas}
      edges={edges as Edge[]}
      nodeTypes={NODE_TYPES as NodeTypes}
      edgeTypes={EDGE_TYPES as EdgeTypes}
      viewport={canvas.viewport}
      onViewportChange={canvas.onViewportChange}
      onNodeClick={canvas.onNodeClick}
      onNodeDoubleClick={canvas.onNodeDoubleClick}
      onNodeMouseEnter={canvas.onNodeMouseEnter}
      onNodeMouseLeave={canvas.onNodeMouseLeave}
      onNodesChange={onNodesChange}
      diagramKey={currentViewKey}
      colorMode={colorMode}
      isFullscreen={isFullscreen}
      onBeforePersist={handleBeforePersist}
      onConfirmPlaceholder={onConfirmPlaceholder}
      onCancelPlaceholder={onCancelPlaceholder}
      activeDiagram={activeDiagram}
      onAssignExistingNode={onAssignExistingNode}
      onCreateGroup={onCreateGroup}
    />
  );
}

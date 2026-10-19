import { Background, Controls, ReactFlow } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import './styles/viscera-canvas.css';

import { useVisceraStore } from '../store/visceraStore';

import VisceraDndContext from './components/dnd/VisceraDndContext';
import AddNodeOverlay from './components/overlay/AddNodeOverlay';
import HelperLines from './components/overlay/HelperLines';
import TypeMenuItems from './components/overlay/TypeMenuItems';
import GroupDetailsPanel from './components/panel/GroupDetailsPanel';
import { useCanvasContextMenu } from './hooks/useCanvasContextMenu';
import { useCanvasEdgeHandlers } from './hooks/useCanvasEdgeHandlers';
import { useGroupDetail } from './hooks/useGroupDetail';
import { GRID } from './utils/applyNodeMove';

import type { ViewerDiagramCallbacks } from './utils/viewerProps';
import type {
  ColorMode,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  OnNodesChange,
} from '@xyflow/react';
import type { ReactNode } from 'react';

// ── Props ───────────────────────────────────────────────────────────────────

export interface CanvasContainerProps extends ViewerDiagramCallbacks {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
  viewport: { x: number; y: number; zoom: number };
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  /** Node double-click — opens the ObjectDetailsPanel (single click only selects). */
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void;
  onNodeMouseEnter: (event: React.MouseEvent, node: Node) => void;
  onNodeMouseLeave: (event: React.MouseEvent, node: Node) => void;
  onNodesChange: OnNodesChange;
  /** Key of the active diagram — required for @dnd-kit move persistence (#2294). */
  diagramKey: string;
  fitView?: boolean;
  colorMode?: ColorMode;
  isFullscreen?: boolean;
  children?: ReactNode;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * ReactFlow Canvas mit Background, Controls und Styling.
 * Container-Layout-Komponente: Event-Handling liegt in
 * useCanvasEdgeHandlers (Edge-Drop, Connect, Reconnect) und
 * useCanvasContextMenu (Pane-Menü, Node-Add, Watcher) (#2370).
 */
export default function CanvasContainer({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  viewport,
  onViewportChange,
  onNodeClick,
  onNodeDoubleClick,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodesChange,
  diagramKey,
  onBeforePersist,
  fitView = false,
  colorMode = 'system',
  isFullscreen = false,
  onConfirmPlaceholder,
  onCancelPlaceholder,
  activeDiagram = null,
  onAssignExistingNode,
  onCreateGroup,
  children,
}: CanvasContainerProps) {
  // ── Group Detail Panel State (#2279) ────────────────────────────────────
  const groupDetail = useGroupDetail();
  const { selectGroup } = groupDetail;

  // ── Event handling (extracted into hooks, #2370) ────────────────────────
  const { onConnectEnd, onConnect, onReconnect } = useCanvasEdgeHandlers({
    onConfirmPlaceholder,
    onCancelPlaceholder,
  });
  const { contextMenuRef, contextMenuPosition, onPaneContextMenu, handleContextMenuAction } =
    useCanvasContextMenu({ onConfirmPlaceholder, onCancelPlaceholder });

  // Fullscreen: NUR `fixed inset-0` (KEIN `relative`) — beides sind `position`-
  // Utilities und konfliktieren; `relative` würde `fixed` im generierten CSS
  // überschreiben und den Container im normalen Flow belassen (#2523).
  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-white dark:bg-gray-950'
    : 'relative';
  const containerStyle: React.CSSProperties = isFullscreen
    ? { width: '100%', height: '100%' }
    : { width: '100%', height: '100%' };

  // ── Node Click Handler (Group Selection, #2279) ────────────────────────
  //
  // Single-Click auf Group = nur Card-Selektion (konsistent zu Cards) —
  // das GroupDetailsPanel öffnet sich per Doppelklick (siehe handleNodeDoubleClick).

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.type === 'group') {
        return;
      }
      onNodeClick(event, node);
    },
    [onNodeClick],
  );

  // Doppelklick öffnet das Details-Panel: ObjectDetailsPanel für Cards,
  // GroupDetailsPanel für Groups (per Doppelklick, konsistent zu Cards).
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.type === 'group') {
        selectGroup(node.id);
        return;
      }
      onNodeDoubleClick(event, node);
    },
    [onNodeDoubleClick, selectGroup],
  );

  // ── Group Resize Handler ────────────────────────────────────────────────
  //
  // Persists the grid-snapped group size (flow units) via the 'move' sync
  // action — the backend writes {x, y, width, height} into the diagram YAML
  // nodes map (same path as group drags, #2293). The position is taken from
  // the RF node so left/top-handle resizes that shift the position are
  // persisted correctly.

  const handleResizeGroup = useCallback(
    (groupId: string, bounds: { x: number; y: number; width: number; height: number }) => {
      // Bounds kommen als absolute Flow-Koordinaten aus den eigenen Resize-
      // Handles (GroupNode) — Position + Größe werden zusammen persistiert.
      const store = useVisceraStore.getState();
      store.moveNode(
        groupId,
        { x: bounds.x, y: bounds.y },
        diagramKey,
        { width: bounds.width, height: bounds.height },
      );
    },
    [diagramKey],
  );

  // Inject the onSelectGroup/onResizeGroup callbacks into group node data so
  // the boundary click can open the panel and resizes can persist without
  // store access inside GroupNode (#2279).
  const nodesWithGroupSelect = useMemo(
    () =>
      nodes.map((n) =>
        n.type === 'group'
          ? {
              ...n,
              data: {
                ...(n.data as Record<string, unknown>),
                onSelectGroup: selectGroup,
                onResizeGroup: handleResizeGroup,
              },
            }
          : n,
      ),
    [nodes, selectGroup, handleResizeGroup],
  );

  return (
    <div className={containerClass} style={containerStyle}>
      <VisceraDndContext diagramKey={diagramKey} onBeforePersist={onBeforePersist}>
        <ReactFlow
          nodes={nodesWithGroupSelect}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodesChange={onNodesChange}
          onViewportChange={onViewportChange}
          onConnectEnd={onConnectEnd}
          onPaneContextMenu={onPaneContextMenu}
          onConnect={onConnect}
          onReconnect={onReconnect}
          fitView={fitView}
          minZoom={0.1}
          maxZoom={4}
          // Doppelklick öffnet das ObjectDetailsPanel — Zoom-Konflikt vermeiden
          zoomOnDoubleClick={false}
          nodesDraggable={false}
          nodesConnectable
          elementsSelectable
          // Connections nicht über die Cards heben (Cards bleiben im
          // Vordergrund, vgl. viscera-canvas.css z-index) (#2523)
          elevateEdgesOnSelect={false}
          colorMode={colorMode}
          defaultViewport={viewport}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={GRID} size={1} color="#e5e7eb" />
          <Controls showInteractive={false} />
          {onConfirmPlaceholder && onCancelPlaceholder && (
            <AddNodeOverlay
              onConfirmPlaceholder={onConfirmPlaceholder}
              onCancelPlaceholder={onCancelPlaceholder}
              diagram={activeDiagram}
              onAssignExistingNode={onAssignExistingNode}
              onCreateGroup={onCreateGroup}
            />
          )}

          {children}
        </ReactFlow>
      </VisceraDndContext>

      {/* Drag-Hilfslinien (Alignment-Guides) über dem Canvas — liest selbst aus
          dem helperLinesStore und re-rendert so NUR das Overlay (#2523). */}
      <HelperLines viewport={viewport} />

      {/* Canvas Context Menu (right-click) — outside ReactFlow with fixed positioning */}
      {contextMenuPosition && (
        <div
          ref={contextMenuRef}
          className="fixed z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            backgroundColor: 'var(--background)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            paddingTop: '0.25rem',
            paddingBottom: '0.25rem',
          }}
        >
          <TypeMenuItems onSelect={handleContextMenuAction} />
        </div>
      )}

      {/* Group Detail Panel (#2279) — rendered only while a group is selected */}
      {groupDetail.groupId !== null && (
        <GroupDetailsPanel
          groupId={groupDetail.groupId}
          group={groupDetail.group}
          members={groupDetail.members}
          onClose={groupDetail.close}
          onRename={groupDetail.renameGroup}
          onDescriptionChange={groupDetail.updateDescription}
          onRemoveMember={groupDetail.removeMember}
        />
      )}
    </div>
  );
}

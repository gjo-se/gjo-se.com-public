import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';

import { useVisceraStore } from '../../store/visceraStore';
import { getChildType } from '../services/objectCommands';
import { buildPlaceholderNode } from '../utils/canvasPlaceholder';

import type { CanvasPlaceholderCallbacks } from '../utils/canvasPlaceholder';
import type { CardKind } from '../utils/cardShape';
import type { Connection, Edge, FinalConnectionState, OnConnectEnd } from '@xyflow/react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseCanvasEdgeHandlersResult {
  /** Edge-Drop: creates an editing placeholder CardNode plus temp edge from the source handle. */
  onConnectEnd: OnConnectEnd;
  /** Handle-to-handle connect: optimistic edge + create_edge sync. */
  onConnect: (connection: Connection) => void;
  /** Reconnect: optimistic delete/add with delete_edge/create_edge sync. */
  onReconnect: (oldEdge: Edge, newConnection: { source: string; target: string }) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Edge event handlers for the ReactFlow canvas (extracted from
 * CanvasContainer, #2370): edge drop (onConnectEnd) creates a placeholder
 * node at the drop position, connect/reconnect update the diagram store
 * optimistically and enqueue edge sync mutations.
 */
export function useCanvasEdgeHandlers({
  onConfirmPlaceholder,
  onCancelPlaceholder,
}: CanvasPlaceholderCallbacks): UseCanvasEdgeHandlersResult {
  const { screenToFlowPosition, getNodes, addNodes, addEdges, setNodes, setEdges } = useReactFlow();

  // ── Edge-Drop Handler ──────────────────────────────────────────────────────

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (!('clientX' in event)) return;

      // Guard: only trigger when dropping on empty canvas (no valid target handle)
      if (connectionState.isValid || !connectionState.fromNode?.id) return;

      const sourceNodeId = connectionState.fromNode.id;

      // Compute drop position in flow coordinates
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // Get source node data to derive child type
      const fromNode = getNodes().find((n) => n.id === sourceNodeId);
      const kind = (fromNode?.data as Record<string, unknown>)?.kind as CardKind | undefined;
      if (!kind) return;

      const childType = getChildType(kind);
      const tempId = crypto.randomUUID();
      const edgeId = crypto.randomUUID();

      // Create editing CardNode at drop position with incoming edge
      addNodes([
        buildPlaceholderNode({
          tempId,
          type: childType,
          position,
          setNodes,
          sourceNodeId,
          remapIdOnConfirm: true,
          onConfirmPlaceholder,
          onCancelPlaceholder,
          onConfirmed: (resultId) => {
            // Update temp edge — use real ID from API response
            setEdges((eds) =>
              eds.map((e) =>
                e.id === edgeId
                  ? { ...e, id: `${sourceNodeId}__${resultId}`, target: resultId, style: undefined, animated: false }
                  : e,
              ),
            );
            useVisceraStore.getState().removeTempEdge(tempId);
          },
          onCancelled: () => {
            setEdges((eds) => eds.filter((e) => e.id !== edgeId));
          },
        }),
      ]);

      // Create temporary dashed edge from source to placeholder
      addEdges([
        {
          id: edgeId,
          source: sourceNodeId,
          target: tempId,
          animated: true,
          style: { strokeDasharray: '5 5' },
        },
      ]);

      // Track in store
      useVisceraStore.getState().addOptimisticNode({ tempId, type: childType, position });
      useVisceraStore.getState().addTempEdge(tempId, { edgeId, sourceId: sourceNodeId, targetId: tempId });
    },
    [screenToFlowPosition, getNodes, addNodes, addEdges, setNodes, setEdges, onConfirmPlaceholder, onCancelPlaceholder],
  );

  // ── Connect Handler (Handle-to-Handle) ───────────────────────────────────

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) return;

      const store = useVisceraStore.getState();
      const edgeId = `${connection.source}__${connection.target}`;

      // Check if edge already exists
      const existing = store.edges.find((e) => e.id === edgeId);
      if (existing) return;

      // Optimistic: add edge to canvas
      store.addEdge({
        id: edgeId,
        source: connection.source,
        target: connection.target,
      });

      // Enqueue API sync
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: edgeId,
        action: 'create_edge',
        payload: {
          from_id: connection.source,
          to_id: connection.target,
        },
        retryCount: 0,
        status: 'pending',
      });
    },
    [],
  );

  // ── Reconnect Handler ───────────────────────────────────────────────────

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: { source: string; target: string }) => {
      const store = useVisceraStore.getState();
      const oldId = oldEdge.id;
      const newId = `${newConnection.source}__${newConnection.target}`;

      // Skip if source and target are the same
      if (newConnection.source === newConnection.target) return;
      // Skip if the edge hasn't actually changed
      if (oldId === newId) return;
      // Skip self-reconnect (same pair)
      if (oldEdge.source === newConnection.source && oldEdge.target === newConnection.target) return;

      // Optimistic: delete old edge, add new edge
      store.deleteEdge(oldId);
      store.addEdge({
        id: newId,
        source: newConnection.source,
        target: newConnection.target,
        data: { ...oldEdge.data },
      });

      // Queue API sync: delete old edge
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: oldId,
        action: 'delete_edge',
        payload: {},
        retryCount: 0,
        status: 'pending',
      });

      // Queue API sync: create new edge
      store.queueSync({
        mutationId: crypto.randomUUID(),
        nodeId: newId,
        action: 'create_edge',
        payload: {
          from_id: newConnection.source,
          to_id: newConnection.target,
          description: (oldEdge.data as Record<string, unknown>)?.description,
          technology: (oldEdge.data as Record<string, unknown>)?.technology,
        },
        retryCount: 0,
        status: 'pending',
      });
    },
    [],
  );

  return { onConnectEnd, onConnect, onReconnect };
}

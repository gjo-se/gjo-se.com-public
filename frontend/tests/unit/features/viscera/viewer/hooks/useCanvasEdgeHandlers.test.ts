/**
 * Tests: useCanvasEdgeHandlers
 *
 * Verifies handle-to-handle connect/reconnect (optimistic canvas state +
 * queued sync) and the edge-drop placeholder creation, including the guards
 * for invalid drops, self-connections and duplicate edges.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { useCanvasEdgeHandlers } from '@src/features/viscera/viewer/hooks/useCanvasEdgeHandlers';

import { resetVisceraStore } from '../../helpers';

import type { Edge, FinalConnectionState, Node } from '@xyflow/react';

const flowMock = vi.hoisted(() => ({
  nodes: [] as Node[],
  addedNodes: [] as Node[],
  addedEdges: [] as Edge[],
  edgeUpdater: (updater: (edges: Edge[]) => Edge[]) => updater([]),
}));

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: (position: { x: number; y: number }) => position,
    getNodes: () => flowMock.nodes,
    addNodes: (nodes: Node[]) => {
      flowMock.addedNodes.push(...nodes);
    },
    addEdges: (edges: Edge[]) => {
      flowMock.addedEdges.push(...edges);
    },
    setNodes: (updater: (nodes: Node[]) => Node[]) => updater([]),
    setEdges: flowMock.edgeUpdater,
  }),
}));

beforeEach(() => {
  resetVisceraStore();
  flowMock.nodes = [];
  flowMock.addedNodes = [];
  flowMock.addedEdges = [];
});

describe('useCanvasEdgeHandlers', () => {
  it('adds an edge optimistically and queues the create edge sync', () => {
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() => result.current.onConnect({ source: 'api', target: 'db', sourceHandle: null, targetHandle: null }));

    expect(useVisceraStore.getState().edges).toEqual([
      { id: 'api__db', source: 'api', target: 'db' },
    ]);
    expect(useVisceraStore.getState().syncQueue[0]).toMatchObject({
      nodeId: 'api__db',
      action: 'create_edge',
      payload: { from_id: 'api', to_id: 'db' },
    });
  });

  it('ignores self-connections and duplicate edges', () => {
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() => result.current.onConnect({ source: 'api', target: 'api', sourceHandle: null, targetHandle: null }));
    act(() => result.current.onConnect({ source: 'api', target: 'db', sourceHandle: null, targetHandle: null }));
    act(() => result.current.onConnect({ source: 'api', target: 'db', sourceHandle: null, targetHandle: null }));

    expect(useVisceraStore.getState().edges).toHaveLength(1);
    expect(useVisceraStore.getState().syncQueue).toHaveLength(1);
  });

  it('reconnects an edge with delete and create syncs', () => {
    useVisceraStore.setState({
      edges: [{ id: 'api__db', source: 'api', target: 'db', data: { description: 'reads', technology: 'postgres' } }],
    });
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() =>
      result.current.onReconnect(
        { id: 'api__db', source: 'api', target: 'db', data: { description: 'reads', technology: 'postgres' } },
        { source: 'api', target: 'cache' },
      ),
    );

    expect(useVisceraStore.getState().edges.map((edge) => edge.id)).toEqual(['api__cache']);
    const actions = useVisceraStore.getState().syncQueue.map((entry) => entry.action);
    expect(actions).toEqual(['delete_edge', 'create_edge']);
    expect(useVisceraStore.getState().syncQueue[1]?.payload).toEqual({
      from_id: 'api',
      to_id: 'cache',
      description: 'reads',
      technology: 'postgres',
    });
  });

  it('ignores a reconnect without an actual endpoint change', () => {
    useVisceraStore.setState({ edges: [{ id: 'api__db', source: 'api', target: 'db' }] });
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() =>
      result.current.onReconnect(
        { id: 'api__db', source: 'api', target: 'db' },
        { source: 'api', target: 'db' },
      ),
    );

    expect(useVisceraStore.getState().syncQueue).toEqual([]);
  });

  it('ignores a touch drop without client coordinates', () => {
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() =>
      result.current.onConnectEnd(
        {} as MouseEvent,
        { isValid: false, fromNode: { id: 'api' } } as unknown as FinalConnectionState,
      ),
    );

    expect(flowMock.addedNodes).toEqual([]);
  });

  it('ignores a drop with a valid target or without a source node', () => {
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() =>
      result.current.onConnectEnd(
        { clientX: 10, clientY: 20 } as MouseEvent,
        { isValid: true, fromNode: { id: 'api' } } as unknown as FinalConnectionState,
      ),
    );
    act(() =>
      result.current.onConnectEnd(
        { clientX: 10, clientY: 20 } as MouseEvent,
        { isValid: false, fromNode: null } as unknown as FinalConnectionState,
      ),
    );

    expect(flowMock.addedNodes).toEqual([]);
  });

  it('creates a placeholder child node and temporary edge on an empty drop', () => {
    flowMock.nodes = [
      { id: 'api', position: { x: 0, y: 0 }, data: { kind: 'system' } } as Node,
    ];
    const { result } = renderHook(() => useCanvasEdgeHandlers({}));

    act(() =>
      result.current.onConnectEnd(
        { clientX: 30, clientY: 40 } as MouseEvent,
        { isValid: false, fromNode: { id: 'api' } } as unknown as FinalConnectionState,
      ),
    );

    expect(flowMock.addedNodes).toHaveLength(1);
    expect(flowMock.addedNodes[0]?.type).toBe('containerCard');
    expect(flowMock.addedEdges[0]).toMatchObject({ source: 'api', animated: true });
    expect(Object.keys(useVisceraStore.getState().tempEdges)).toHaveLength(1);
    expect(Object.keys(useVisceraStore.getState().pendingOptimisticNodes)).toHaveLength(1);
  });
});

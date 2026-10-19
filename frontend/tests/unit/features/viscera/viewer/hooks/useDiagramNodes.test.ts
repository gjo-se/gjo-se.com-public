/**
 * Tests: useDiagramNodes
 *
 * Verifies the ReactFlow projection of diagram nodes: store-driven output,
 * position precedence (override → persisted YAML → layout fallback), group
 * bounds and membership, filter flags, file dimensions, and callback injection.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { CARD, FILE, GROUP_PADDING } from '@src/features/viscera/core/nodeDimensions';
import { useDiagramNodes } from '@src/features/viscera/viewer/hooks/useDiagramNodes';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

import type { DiagramNode } from '@src/features/viscera/store/diagramSlice';

function card(id: string, data: Record<string, unknown> = {}): DiagramNode {
  return {
    id,
    type: 'systemCard',
    position: { x: 0, y: 0 },
    data: { name: id, kind: 'system', cardWidth: CARD.width, cardHeight: CARD.height, ...data },
    isTransient: false,
  } as DiagramNode;
}

beforeEach(() => {
  resetVisceraStore();
});

describe('useDiagramNodes', () => {
  it('returns no nodes when the diagram is empty', () => {
    const { result } = renderHook(() => useDiagramNodes({}));

    expect(result.current).toEqual([]);
  });

  it('projects a card node with card dimensions and layout direction', () => {
    useVisceraStore.setState({ nodes: [card('api', { name: 'API' })] });

    const { result } = renderHook(() => useDiagramNodes({ layoutDirection: 'lr' }));

    expect(result.current[0]).toMatchObject({
      id: 'api',
      type: 'systemCard',
      position: { x: 0, y: 0 },
      width: CARD.width,
      height: CARD.height,
      data: { name: 'API', cardWidth: CARD.width, cardHeight: CARD.height, layoutDirection: 'lr' },
    });
  });

  it('prefers a manual override over persisted and layout positions', () => {
    useVisceraStore.setState({
      nodes: [card('api', {})],
      nodeOverrides: { 'view:api': { x: 50, y: 60 } },
    });

    const { result } = renderHook(() =>
      useDiagramNodes({
        diagramKey: 'view',
        diagramPositions: { api: { x: 10, y: 20 } },
      }),
    );

    expect(result.current[0]?.position).toEqual({ x: 50, y: 60 });
  });

  it('uses persisted positions when no override exists', () => {
    useVisceraStore.setState({ nodes: [card('api', {})] });

    const { result } = renderHook(() =>
      useDiagramNodes({ diagramKey: 'view', diagramPositions: { api: { x: 10, y: 20 } } }),
    );

    expect(result.current[0]?.position).toEqual({ x: 10, y: 20 });
  });

  it('computes group bounds from members and assigns parent ids', () => {
    useVisceraStore.setState({
      nodes: [
        {
          id: 'group-1',
          type: 'group',
          position: { x: 0, y: 0 },
          data: { name: 'Group', width: 0, height: 0, members: ['a', 'b'] },
          isTransient: false,
        } as DiagramNode,
        card('a'),
        card('b'),
      ],
    });
    useVisceraStore.setState((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === 'a'
          ? { ...node, position: { x: 0, y: 0 } }
          : node.id === 'b'
            ? { ...node, position: { x: 200, y: 0 } }
            : node,
      ),
    }));

    const { result } = renderHook(() => useDiagramNodes({}));

    const group = result.current.find((node) => node.id === 'group-1');
    const member = result.current.find((node) => node.id === 'b');

    expect(group?.width).toBe(200 + CARD.width + GROUP_PADDING.left + GROUP_PADDING.right);
    expect(member?.parentId).toBe('group-1');
    expect(member?.extent).toBe('parent');
  });

  it('prefers persisted group bounds over derived member bounds', () => {
    useVisceraStore.setState({
      nodes: [
        {
          id: 'group-1',
          type: 'group',
          position: { x: 0, y: 0 },
          data: { name: 'Group', width: 0, height: 0, members: ['a'] },
          isTransient: false,
        } as DiagramNode,
        card('a'),
      ],
    });

    const { result } = renderHook(() =>
      useDiagramNodes({ diagramPositions: { 'group-1': { x: 0, y: 0, width: 500, height: 400 } } }),
    );

    const group = result.current.find((node) => node.id === 'group-1');
    expect(group).toMatchObject({ width: 500, height: 400 });
  });

  it('marks hidden and dimmed nodes from the filter sets', () => {
    useVisceraStore.setState({ nodes: [card('a'), card('b')] });

    const { result } = renderHook(() =>
      useDiagramNodes({
        hiddenNodeIds: new Set(['a']),
        dimmedNodeIds: new Set(['a', 'b']),
      }),
    );

    expect(result.current.find((node) => node.id === 'a')?.hidden).toBe(true);
    expect(result.current.find((node) => node.id === 'a')?.style).toBeUndefined();
    expect(result.current.find((node) => node.id === 'b')?.hidden).toBe(false);
    expect(result.current.find((node) => node.id === 'b')?.style).toEqual({ opacity: 0.3 });
  });

  it('uses compact file dimensions and injects collapse state', () => {
    useVisceraStore.setState({
      nodes: [
        {
          id: 'mod',
          type: 'file',
          position: { x: 0, y: 0 },
          data: { name: 'mod', kind: 'component', cardWidth: FILE.width, cardHeight: FILE.height },
          isTransient: false,
        } as DiagramNode,
      ],
    });

    const { result } = renderHook(() => useDiagramNodes({ collapsedNodeIds: new Set(['mod']) }));

    expect(result.current[0]).toMatchObject({
      width: FILE.width,
      height: FILE.height,
      data: { collapsed: true, cardWidth: FILE.width, cardHeight: FILE.height },
    });
  });

  it('injects navigation and annotation callbacks per node', () => {
    useVisceraStore.setState({ nodes: [card('api')] });
    const navigated: string[] = [];
    const annotations: Array<{ objectId: string; text: string }> = [];

    const { result } = renderHook(() =>
      useDiagramNodes({
        onViewKeyChange: (key) => navigated.push(key),
        onAddAnnotation: (objectId, text) => annotations.push({ objectId, text }),
      }),
    );
    const data = result.current[0]?.data as Record<string, unknown>;

    (data.onNavigateToChild as (key: string) => void)('child-view');
    (data.onAddAnnotation as (text: string) => void)('note');

    expect(navigated).toEqual(['child-view']);
    expect(annotations).toEqual([{ objectId: 'api', text: 'note' }]);
  });
});

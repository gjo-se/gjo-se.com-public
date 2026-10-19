/**
 * Tests: useDiagramEdges
 *
 * Verifies the edge projection: base mapping, hover/select state, flow-step
 * highlighting, hidden/dimmed filtering, and perspective color resolution for
 * tag, technology and status hovers.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useDiagramEdges } from '@src/features/viscera/viewer/hooks/useDiagramEdges';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../../helpers';

import type { EntityData } from '@src/features/viscera/core/useEntityCache';
import type { DiagramEdge, DiagramNode } from '@src/features/viscera/store/diagramSlice';

function edge(id: string, patch: Partial<DiagramEdge> = {}): DiagramEdge {
  return { id, source: 'api', target: 'db', data: {}, ...patch };
}

function entityMap(slug: string, colorToken: string): Map<string, EntityData> {
  return new Map([[slug, { slug, name: slug, colorToken }]]);
}

const emptyMaps = {
  hoveredCardId: null,
  selectedCardId: null,
  tagMap: new Map<string, EntityData>(),
  statusMap: new Map<string, EntityData>(),
  technologyMap: new Map<string, EntityData>(),
};

beforeEach(() => {
  resetVisceraStore();
});

describe('useDiagramEdges', () => {
  it('returns no edges for an empty diagram', () => {
    const { result } = renderHook(() => useDiagramEdges(emptyMaps));

    expect(result.current).toEqual([]);
  });

  it('maps diagram edges to ReactFlow edges with their metadata', () => {
    useVisceraStore.setState({
      edges: [
        edge('api__db', {
          data: { label: 'reads', description: 'reads rows', technology: 'postgres', crowFoot: true },
        }),
      ],
    });

    const { result } = renderHook(() => useDiagramEdges(emptyMaps));

    expect(result.current[0]).toMatchObject({
      id: 'api__db',
      source: 'api',
      target: 'db',
      type: 'edge',
      reconnectable: true,
      hidden: false,
      data: {
        label: 'reads',
        description: 'reads rows',
        technology: 'postgres',
        crowFoot: true,
        previewed: false,
        pulsing: false,
        highlighted: false,
      },
    });
  });

  it('previews and pulses edges touching the hovered or selected card', () => {
    useVisceraStore.setState({ edges: [edge('api__db')] });

    const { result } = renderHook(() =>
      useDiagramEdges({ ...emptyMaps, hoveredCardId: 'api', selectedCardId: 'db' }),
    );

    expect(result.current[0]?.data?.previewed).toBe(true);
    expect(result.current[0]?.data?.pulsing).toBe(true);
    expect(result.current[0]?.zIndex).toBe(10);
  });

  it('matches projected original endpoints for hover state', () => {
    useVisceraStore.setState({
      edges: [edge('projected', { data: { originalFrom: 'legacy', originalTo: 'db' } })],
    });

    const { result } = renderHook(() => useDiagramEdges({ ...emptyMaps, hoveredCardId: 'legacy' }));

    expect(result.current[0]?.data?.previewed).toBe(true);
  });

  it('highlights the edge of the active flow step', () => {
    useVisceraStore.setState({ edges: [edge('api__db')] });

    const { result } = renderHook(() =>
      useDiagramEdges({ ...emptyMaps, activeFlowStep: { id: 's1', type: 'message', from: 'api', to: 'db' } }),
    );

    expect(result.current[0]?.data?.highlighted).toBe(true);
  });

  it('hides edges with a hidden endpoint and dims edges with a dimmed endpoint', () => {
    useVisceraStore.setState({
      edges: [edge('api__db'), edge('db__cache', { source: 'db', target: 'cache' })],
    });

    const { result } = renderHook(() =>
      useDiagramEdges({
        ...emptyMaps,
        hiddenNodeIds: new Set(['api']),
        dimmedNodeIds: new Set(['cache']),
      }),
    );

    expect(result.current[0]?.hidden).toBe(true);
    expect(result.current[1]?.hidden).toBe(false);
    expect(result.current[1]?.data?.filterDimmed).toBe(true);
    expect(result.current[1]?.data?.dimmed).toBe(true);
  });

  it('resolves the tag color for a hovered tag edge', () => {
    useVisceraStore.setState({ edges: [edge('api__db', { data: { tags: ['kafka'] } })] });

    const { result } = renderHook(() =>
      useDiagramEdges({ ...emptyMaps, perspectiveHoveredKey: 'tag:kafka', tagMap: entityMap('kafka', 'violet') }),
    );

    expect(result.current[0]?.data?.activeTagColor).toBe('violet');
  });

  it('resolves the technology color for a hovered technology edge', () => {
    useVisceraStore.setState({ edges: [edge('api__db', { data: { technology: 'postgres' } })] });

    const { result } = renderHook(() =>
      useDiagramEdges({
        ...emptyMaps,
        perspectiveHoveredKey: 'technology:postgres',
        technologyMap: entityMap('postgres', 'blue'),
      }),
    );

    expect(result.current[0]?.data?.activeTagColor).toBe('blue');
  });

  it('resolves the status color from the node status of an endpoint', () => {
    useVisceraStore.setState({
      edges: [edge('api__db')],
      nodes: [
        {
          id: 'api',
          type: 'systemCard',
          position: { x: 0, y: 0 },
          data: { name: 'api', kind: 'system', cardWidth: 200, cardHeight: 100, status: 'viscera-pending' },
          isTransient: false,
        } as DiagramNode,
      ],
    });

    const { result } = renderHook(() =>
      useDiagramEdges({
        ...emptyMaps,
        perspectiveHoveredKey: 'status:viscera-pending',
        statusMap: entityMap('viscera-pending', 'amber'),
      }),
    );

    expect(result.current[0]?.data?.activeTagColor).toBe('amber');
  });

  it('ignores a malformed perspective hover key', () => {
    useVisceraStore.setState({ edges: [edge('api__db')] });

    const { result } = renderHook(() =>
      useDiagramEdges({ ...emptyMaps, perspectiveHoveredKey: 'no-colon' }),
    );

    expect(result.current[0]?.data?.activeTagColor).toBeUndefined();
  });
});

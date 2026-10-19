/**
 * Tests: useModelViewer
 *
 * Verifies data normalization (stores render as containers, unknown types are
 * dropped), edge annotation with diagram keys, and the selection/hover/expand/
 * navigation handlers.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import useModelViewer from '@src/features/viscera/explorer/hooks/useModelViewer';
import { routeConfig } from '@src/router.config';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
} from '../../helpers';

const navigation = vi.hoisted(() => ({ target: null as string | null }));

vi.mock('react-router', () => ({
  useNavigate: () => (target: string) => {
    navigation.target = target;
  },
}));

const wrapper = makeWorkspaceWrapper(
  makeWorkspace({
    objects: [
      makeObject({ id: 'backend', name: 'Backend', type: 'system' }),
      makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend' }),
      makeObject({ id: 'cache', name: 'Cache', type: 'store', parent: 'backend' }),
      makeObject({ id: 'handler', name: 'Handler', type: 'component', parent: 'api' }),
      makeObject({ id: 'broken', name: 'Broken', type: 'service' as never }),
    ],
    people: [makeObject({ id: 'greg', name: 'Greg', type: 'person' })],
    edges: [{ from: 'api', to: 'cache', description: 'reads' }],
    diagrams: [
      makeDiagram({ key: 'backend-container', nodes: { api: { x: 0, y: 0 }, cache: { x: 0, y: 0 } } }),
      makeDiagram({ key: 'other', nodes: { backend: { x: 0, y: 0 } } }),
    ],
  }),
);

beforeEach(() => {
  navigation.target = null;
});

describe('useModelViewer', () => {
  it('normalizes objects and drops unknown types', () => {
    const { result } = renderHook(() => useModelViewer(), { wrapper });

    expect(result.current.objects.map((o) => o.id)).toEqual([
      'backend',
      'api',
      'cache',
      'handler',
    ]);
    expect(result.current.objects.find((o) => o.id === 'cache')?.type).toBe('container');
    expect(result.current.objects.find((o) => o.id === 'api')?.hasChildren).toBe(true);
    expect(result.current.objects.find((o) => o.id === 'handler')?.hasChildren).toBe(false);
  });

  it('annotates edges with the diagrams containing both endpoints', () => {
    const { result } = renderHook(() => useModelViewer(), { wrapper });

    expect(result.current.edges).toHaveLength(1);
    expect(result.current.edges[0]).toMatchObject({
      from: 'api',
      to: 'cache',
      description: 'reads',
      diagrams: ['backend-container'],
    });
    expect(result.current.objects.find((o) => o.id === 'api')?.edgesCount).toBe(1);
  });

  it('toggles the selected object on repeated clicks', () => {
    const { result } = renderHook(() => useModelViewer(), { wrapper });

    act(() => result.current.onObjectClick('api'));
    expect(result.current.selectedObjectId).toBe('api');

    act(() => result.current.onObjectClick('api'));
    expect(result.current.selectedObjectId).toBeNull();
  });

  it('tracks hover and toggles expanded ids', () => {
    const { result } = renderHook(() => useModelViewer(), { wrapper });

    act(() => result.current.onObjectHover('api'));
    expect(result.current.hoveredObjectId).toBe('api');
    act(() => result.current.onObjectHover(null));
    expect(result.current.hoveredObjectId).toBeNull();

    act(() => result.current.onToggleExpand('api'));
    expect(result.current.expandedIds.has('api')).toBe(true);
    act(() => result.current.onToggleExpand('api'));
    expect(result.current.expandedIds.has('api')).toBe(false);
  });

  it('navigates to the first diagram of a clicked edge', () => {
    const { result } = renderHook(() => useModelViewer(), { wrapper });

    act(() => result.current.onEdgeClick('api', 'cache'));

    expect(navigation.target).toBe(`${routeConfig.adminVisceraViews.path}?view=backend-container`);
  });

  it('falls back to the views route for an edge without a diagram', () => {
    const { result } = renderHook(() => useModelViewer(), { wrapper });

    act(() => result.current.onEdgeClick('api', 'backend'));

    expect(navigation.target).toBe(routeConfig.adminVisceraViews.path);
  });
});

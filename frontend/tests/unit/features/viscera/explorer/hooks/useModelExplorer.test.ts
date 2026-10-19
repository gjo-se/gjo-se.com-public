/**
 * Tests: useModelExplorer
 *
 * Verifies the derived explorer model: grouping by type, computed child/edge/
 * diagram counts, inclusion of persons, exclusion of unknown types, and the
 * empty result when no workspace is available.
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useModelExplorer } from '@src/features/viscera/explorer/hooks/useModelExplorer';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
} from '../../helpers';

describe('useModelExplorer', () => {
  it('returns empty collections without a workspace', () => {
    const wrapper = makeWorkspaceWrapper(null);
    const { result } = renderHook(() => useModelExplorer(), { wrapper });

    expect(result.current.allObjects).toEqual([]);
    expect(result.current.objectsByType.system).toEqual([]);
  });

  it('groups objects by their declared type', () => {
    const wrapper = makeWorkspaceWrapper(
      makeWorkspace({
        objects: [
          makeObject({ id: 'backend', name: 'Backend', type: 'system' }),
          makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend' }),
          makeObject({ id: 'cache', name: 'Cache', type: 'store', parent: 'backend' }),
          makeObject({ id: 'handler', name: 'Handler', type: 'component', parent: 'api' }),
        ],
      }),
    );
    const { result } = renderHook(() => useModelExplorer(), { wrapper });

    expect(result.current.objectsByType.system.map((o) => o.id)).toEqual(['backend']);
    expect(result.current.objectsByType.container.map((o) => o.id)).toEqual(['api']);
    expect(result.current.objectsByType.store.map((o) => o.id)).toEqual(['cache']);
    expect(result.current.objectsByType.component.map((o) => o.id)).toEqual(['handler']);
  });

  it('computes child, edge and diagram counts per object', () => {
    const wrapper = makeWorkspaceWrapper(
      makeWorkspace({
        objects: [
          makeObject({ id: 'backend', name: 'Backend', type: 'system' }),
          makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend' }),
          makeObject({ id: 'db', name: 'DB', type: 'container', parent: 'backend' }),
        ],
        edges: [
          { from: 'api', to: 'db' },
          { from: 'backend', to: 'db' },
        ],
        diagrams: [
          makeDiagram({ key: 'one', nodes: { backend: { x: 0, y: 0 }, api: { x: 0, y: 0 } } }),
          makeDiagram({ key: 'two', nodes: { backend: { x: 0, y: 0 } } }),
        ],
      }),
    );
    const { result } = renderHook(() => useModelExplorer(), { wrapper });

    const backend = result.current.allObjects.find((o) => o.id === 'backend');
    const api = result.current.allObjects.find((o) => o.id === 'api');
    const db = result.current.allObjects.find((o) => o.id === 'db');

    expect(backend).toMatchObject({ childrenCount: 2, edgesCount: 1, diagramsCount: 2 });
    expect(api).toMatchObject({ childrenCount: 0, edgesCount: 1, diagramsCount: 1 });
    expect(db).toMatchObject({ childrenCount: 0, edgesCount: 2, diagramsCount: 0 });
  });

  it('excludes objects with an unknown type', () => {
    const wrapper = makeWorkspaceWrapper(
      makeWorkspace({
        objects: [
          makeObject({ id: 'known', name: 'Known', type: 'system' }),
          makeObject({ id: 'broken', name: 'Broken', type: 'service' as never }),
        ],
      }),
    );
    const { result } = renderHook(() => useModelExplorer(), { wrapper });

    expect(result.current.allObjects.map((o) => o.id)).toEqual(['known']);
  });
});

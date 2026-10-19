/**
 * Tests: useObjectDetail
 *
 * Verifies the object detail derivation per entity kind: systems, containers,
 * components, persons, unknown types, typeless stores and derived L4 nodes.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useObjectDetail } from '@src/features/viscera/viewer/hooks/useObjectDetail';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import {
  makeDiagram,
  makeObject,
  makeWorkspace,
  makeWorkspaceWrapper,
  resetVisceraStore,
} from '../../helpers';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

function fieldValue(detail: ReturnType<typeof useObjectDetail>, field: string): unknown {
  return detail?.fields.find((entry) => entry.field === field)?.value;
}

const workspace: Workspace = makeWorkspace({
  objects: [
    makeObject({ id: 'backend', name: 'Backend', type: 'system', description: 'Backend system' }),
    makeObject({ id: 'api', name: 'API', type: 'container', parent: 'backend', description: 'HTTP API' }),
    makeObject({ id: 'handler', name: 'Handler', type: 'component', parent: 'api' }),
    makeObject({ id: 'cache', name: 'Cache', type: 'store' }),
  ],
  people: [makeObject({ id: 'greg', name: 'Greg', type: 'person', description: 'Developer' })],
  diagrams: [makeDiagram({ key: 'backend-container', nodes: { api: { x: 0, y: 0 } } })],
  flows: [
    {
      id: 'request',
      title: 'Request',
      steps: [{ id: 's1', type: 'message', from: 'api', to: 'backend' }],
      tags: [],
      flowParentIds: [],
    },
  ],
});

beforeEach(() => {
  resetVisceraStore();
});

function renderDetail(workspaceValue: Workspace | null, objectId: string | null) {
  const wrapper = makeWorkspaceWrapper(workspaceValue);
  return renderHook(() => useObjectDetail(objectId), { wrapper });
}

describe('useObjectDetail', () => {
  it('returns null without object id or workspace', () => {
    expect(renderDetail(workspace, null).result.current).toBeNull();
    expect(renderDetail(null, 'backend').result.current).toBeNull();
  });

  it('derives a system detail with children, diagrams and flows', () => {
    const { result } = renderDetail(workspace, 'backend');
    const detail = result.current;

    expect(detail).toMatchObject({
      objectId: 'backend',
      name: 'Backend',
      type: 'system',
      typeLabel: 'System',
      description: 'Backend system',
      childrenCount: 1,
      parentId: null,
      status: null,
    });
    expect(detail?.diagrams.map((diagram) => diagram.key)).toEqual([]);
    expect(detail?.flows.map((flow) => flow.id)).toEqual(['request']);
    expect(fieldValue(detail, 'external')).toBe(false);
  });

  it('derives a container detail with parent and scope names', () => {
    const { result } = renderDetail(workspace, 'api');
    const detail = result.current;

    expect(detail).toMatchObject({
      type: 'container',
      typeLabel: 'Container',
      parentId: 'backend',
      parentName: 'Backend',
      scope: 'Backend',
      childrenCount: 1,
    });
    expect(detail?.diagrams.map((diagram) => diagram.key)).toEqual(['backend-container']);
    expect(fieldValue(detail, 'parent')).toBe('Backend');
  });

  it('derives a component detail with container and system scope', () => {
    const { result } = renderDetail(workspace, 'handler');
    const detail = result.current;

    expect(detail).toMatchObject({
      type: 'component',
      typeLabel: 'Component',
      parentId: 'api',
      parentName: 'API',
      scope: 'Backend',
    });
    expect(fieldValue(detail, 'scope')).toBe('Backend');
  });

  it('derives a person detail without parent or scope', () => {
    const { result } = renderDetail(workspace, 'greg');

    expect(result.current).toMatchObject({
      type: 'person',
      typeLabel: 'Person',
      parentId: null,
      parentName: null,
      scope: null,
      childrenCount: 0,
    });
  });

  it('keeps a typeless store as system detail with the store type label', () => {
    const { result } = renderDetail(workspace, 'cache');

    expect(result.current).toMatchObject({ type: 'store', typeLabel: 'Store' });
  });

  it('labels unknown object types as unknown', () => {
    const { result } = renderDetail(
      makeWorkspace({ objects: [makeObject({ id: 'x', name: 'X', type: 'service' as never })] }),
      'x',
    );

    expect(result.current).toMatchObject({ type: undefined, typeLabel: 'Unknown' });
  });

  it('returns null for an id that is neither object nor person', () => {
    const { result } = renderDetail(workspace, 'does-not-exist');

    expect(result.current).toBeNull();
  });

  it('derives a module detail for a rendered node in a module diagram', () => {
    const moduleWorkspace = makeWorkspace({
      diagrams: [
        makeDiagram({
          key: 'backend-modules',
          type: 'module',
          status: 'viscera-pending',
          nodes: { 'app.core': { x: 0, y: 0, description: 'Core module' } },
        }),
      ],
    });
    useVisceraStore.setState({
      viewKey: 'backend-modules',
      nodes: [
        {
          id: 'app.core',
          type: 'file',
          position: { x: 0, y: 0 },
          data: { name: 'App Core', kind: 'component', cardWidth: 140, cardHeight: 36 },
          isTransient: false,
        },
      ],
    });

    const { result } = renderDetail(moduleWorkspace, 'app.core');

    expect(result.current).toMatchObject({
      isDerived: true,
      name: 'App Core',
      type: undefined,
      typeLabel: 'Module',
      description: 'Core module',
      status: 'viscera-pending',
    });
  });
});

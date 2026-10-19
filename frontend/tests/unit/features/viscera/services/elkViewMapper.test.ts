/**
 * Tests: elkViewMapper
 *
 * Behaviour of the generic node selector across all diagram levels (L1–L4):
 * module membership from `modules[]`, parent/base scoping, supporting-node
 * inclusion via edges, people contract and external-container resolution.
 */

import { describe, expect, it } from 'vitest';

import {
  collectAllNodeIds,
  isExternalContainer,
  selectDiagramNodeIds,
} from '@src/features/viscera/services/elkViewMapper';

import { makeDiagram, makeObject, makeWorkspace } from '../helpers';

import type { ElkLikeNode } from '../testTypes';

describe('collectAllNodeIds', () => {
  it('collects top-level and recursively nested ids', () => {
    const children = [
      { id: 'a' },
      { id: 'group', children: [{ id: 'b' }, { id: 'nested', children: [{ id: 'c' }] }] },
    ] as unknown as ElkLikeNode[];

    expect([...collectAllNodeIds(children)].sort()).toEqual(['a', 'b', 'c', 'group', 'nested']);
  });

  it('returns an empty set for no children', () => {
    expect(collectAllNodeIds([]).size).toBe(0);
  });
});

describe('isExternalContainer', () => {
  const workspace = makeWorkspace({
    objects: [
      makeObject({ id: 'ext', type: 'system', external: true }),
      makeObject({ id: 'own', type: 'system', external: false }),
      makeObject({ id: 'child-of-ext', type: 'container', parent: 'ext' }),
      makeObject({ id: 'child-of-own', type: 'container', parent: 'own' }),
      makeObject({ id: 'orphan', type: 'container' }),
    ],
  });

  it('returns false for an unknown container', () => {
    expect(isExternalContainer(workspace, 'missing')).toBe(false);
  });

  it('inherits the external flag from the parent object', () => {
    expect(isExternalContainer(workspace, 'child-of-ext')).toBe(true);
    expect(isExternalContainer(workspace, 'child-of-own')).toBe(false);
  });

  it('falls back to the object flag when it has no parent', () => {
    expect(isExternalContainer(workspace, 'ext')).toBe(true);
    expect(isExternalContainer(workspace, 'own')).toBe(false);
    expect(isExternalContainer(workspace, 'orphan')).toBe(false);
  });
});

describe('selectDiagramNodeIds – flat container level', () => {
  const workspace = makeWorkspace({
    objects: [
      makeObject({ id: 'sys', type: 'system' }),
      makeObject({ id: 'c-in', type: 'container', parent: 'sys' }),
      makeObject({ id: 'c-other', type: 'container', parent: 'other' }),
      makeObject({ id: 'store-in', type: 'store', parent: 'sys' }),
      makeObject({ id: 'comp-in', type: 'component', parent: 'sys' }),
    ],
    people: [
      makeObject({ id: 'p-connected', type: 'person' }),
      makeObject({ id: 'p-unconnected', type: 'person' }),
    ],
    edges: [
      { from: 'c-in', to: 'sys' },
      { from: 'c-in', to: 'comp-in' },
      { from: 'c-in', to: 'p-connected' },
    ],
  });
  const diagram = makeDiagram({ key: 'app', type: 'container', parent: 'sys' });

  it('selects parent-scoped containers/stores, connected supporting nodes and connected people', () => {
    const ids = selectDiagramNodeIds(diagram, workspace);

    expect(new Set(ids)).toEqual(new Set(['c-in', 'store-in', 'sys', 'p-connected']));
  });

  it('never pulls a non-scoped primary element in via an edge', () => {
    const ids = selectDiagramNodeIds(diagram, workspace);

    expect(ids).not.toContain('comp-in');
    expect(ids).not.toContain('c-other');
    expect(ids).not.toContain('p-unconnected');
  });
});

describe('selectDiagramNodeIds – system context level', () => {
  const workspace = makeWorkspace({
    objects: [
      makeObject({ id: 'sys-a', type: 'system' }),
      makeObject({ id: 'sys-b', type: 'system' }),
      makeObject({ id: 'container-a', type: 'container', parent: 'sys-a' }),
    ],
    people: [
      makeObject({ id: 'p1', type: 'person' }),
      makeObject({ id: 'p2', type: 'person' }),
    ],
    edges: [{ from: 'container-a', to: 'p1' }],
  });

  it('selects all systems and all people, never containers', () => {
    const ids = selectDiagramNodeIds(makeDiagram({ type: 'systemContext' }), workspace);

    expect(new Set(ids)).toEqual(new Set(['sys-a', 'sys-b', 'p1', 'p2']));
  });
});

describe('selectDiagramNodeIds – data model level', () => {
  const workspace = makeWorkspace({
    objects: [
      makeObject({ id: 'core.users', type: 'table', parent: 'core' }),
      makeObject({ id: 'gjo.projects', type: 'table', parent: 'gjo' }),
      makeObject({ id: 'core-service', type: 'system' }),
    ],
    edges: [{ from: 'core.users', to: 'core-service' }],
  });
  const diagram = makeDiagram({ key: 'er-core', type: 'dataModel', parent: null, base: 'core' });

  it('scopes tables by diagram.base instead of diagram.parent', () => {
    const ids = selectDiagramNodeIds(diagram, workspace);

    expect(ids).toContain('core.users');
    expect(ids).not.toContain('gjo.projects');
  });
});

describe('selectDiagramNodeIds – module level', () => {
  const workspace = makeWorkspace();
  const modules = [
    { name: 'app.api', path: 'app/api.py', imports: ['app.db'], top_level: 'app' },
    { name: 'app.db', path: 'app/db.py', imports: [], top_level: 'app' },
    { name: 'app.api', path: 'app/api.py', imports: [], top_level: 'app' },
    { name: 'lib.other', path: 'lib/other.py', imports: [], top_level: 'lib' },
  ];

  it('derives membership from modules[] filtered by diagram.parent, deduplicated', () => {
    const ids = selectDiagramNodeIds(makeDiagram({ type: 'module', parent: 'app' }), workspace, modules);

    expect(ids).toEqual(['app.api', 'app.db']);
  });

  it('returns no modules when the diagram has no parent', () => {
    const ids = selectDiagramNodeIds(
      makeDiagram({ type: 'module', parent: null }),
      workspace,
      modules,
    );

    expect(ids).toEqual([]);
  });
});

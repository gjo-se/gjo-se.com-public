/**
 * Tests: diagramModels
 *
 * Verifies both model builders against the level registry: edge resolution
 * (direct vs systemLevel, system ids with dots, dedupe, visibility, crow-foot),
 * and node projection (card kinds, table branch, people, groups, child diagrams).
 */

import { describe, expect, it } from 'vitest';

import {
  buildDiagramEdgeModels,
  buildDiagramNodeModels,
} from '@src/features/viscera/viewer/utils/diagramModels';

import { makeDiagram, makeObject, makeWorkspace } from '../../helpers';

import type { Adr } from '@src/features/viscera/adrs/hooks/useAdrs';
import type { NodePosition } from '@src/features/viscera/services/elkLayoutService';

function pos(id: string, x = 0, y = 0): NodePosition {
  return { id, position: { x, y }, width: 200, height: 100 };
}

const ADR: Adr = {
  id: 1,
  title: 'Use Postgres',
  status: 'accepted',
  date: '2026-01-01',
  systems: ['backend'],
  diagrams: [],
  tags: [],
  idString: '0001',
  content: '',
  filePath: '/architecture/adr/0001-use-postgres.md',
};

describe('buildDiagramEdgeModels – direct resolution', () => {
  const workspace = makeWorkspace({
    objects: [
      makeObject({ id: 'backend', type: 'system' }),
      makeObject({ id: 'api', type: 'container', parent: 'backend' }),
      makeObject({ id: 'db', type: 'container', parent: 'backend' }),
    ],
    edges: [
      { from: 'api', to: 'db', description: 'reads', technology: 'sql', tags: ['data'] },
      { from: 'api', to: 'api' },
      { from: 'api', to: 'ghost' },
      { from: 'db', to: 'api', description: 'references' },
    ],
  });

  it('liefert ohne Workspace-Edges eine leere Liste', () => {
    const edges = buildDiagramEdgeModels(makeWorkspace(), [pos('api')], 'app');

    expect(edges).toEqual([]);
  });

  it('behält nur sichtbare, nicht-selbstreferenzielle Kanten', () => {
    const edges = buildDiagramEdgeModels(workspace, [pos('api'), pos('db')], 'app');

    expect(edges.map((edge) => edge.id)).toEqual(['api__db', 'db__api']);
  });

  it('übernimmt Metadaten und Original-Endpunkte in die Edge-Daten', () => {
    const edges = buildDiagramEdgeModels(workspace, [pos('api'), pos('db')], 'app');

    expect(edges[0]).toEqual({
      id: 'api__db',
      source: 'api',
      target: 'db',
      data: {
        label: 'reads',
        technology: 'sql',
        tags: ['data'],
        originalFrom: 'api',
        originalTo: 'db',
        crowFoot: false,
      },
    });
  });

  it('markiert references-Kanten als Crow-Foot', () => {
    const edges = buildDiagramEdgeModels(workspace, [pos('api'), pos('db')], 'app');

    expect(edges[1].data?.crowFoot).toBe(true);
  });

  it('dedupliziert mehrfach auf dieselbe Kante abgebildete Edges', () => {
    const duplicated = makeWorkspace({
      objects: [makeObject({ id: 'api', type: 'container' }), makeObject({ id: 'db', type: 'store' })],
      edges: [
        { from: 'api', to: 'db', description: 'first' },
        { from: 'api', to: 'db', description: 'second' },
      ],
    });

    const edges = buildDiagramEdgeModels(duplicated, [pos('api'), pos('db')], 'app');

    expect(edges).toHaveLength(1);
    expect(edges[0].data?.label).toBe('first');
  });

  it('zählt Gruppen-IDs als sichtbare Endpunkte', () => {
    const withGroup = makeWorkspace({
      objects: [makeObject({ id: 'api', type: 'container' })],
      groups: [{ id: 'g1', name: 'Group', description: '', members: [] }],
      edges: [{ from: 'api', to: 'g1' }],
    });

    const edges = buildDiagramEdgeModels(withGroup, [pos('api')], 'app');

    expect(edges.map((edge) => edge.id)).toEqual(['api__g1']);
  });
});

describe('buildDiagramEdgeModels – systemLevel resolution', () => {
  const workspace = makeWorkspace({
    objects: [
      makeObject({ id: 'backend', type: 'system' }),
      makeObject({ id: 'gjo-se.com', type: 'system' }),
      makeObject({ id: 'backend.api', type: 'container', parent: 'backend' }),
    ],
    edges: [
      { from: 'backend.api', to: 'gjo-se.com', description: 'calls' },
      { from: 'backend', to: 'backend.api', description: 'internal' },
    ],
  });
  const contextDiagram = makeDiagram({ key: 'ctx', name: 'Context', type: 'systemContext', parent: null });

  it('reduziert Punkt-Pfade auf die System-Ebene', () => {
    const edges = buildDiagramEdgeModels(
      workspace,
      [pos('backend'), pos('gjo-se.com')],
      'ctx',
      contextDiagram,
    );

    expect(edges.map((edge) => edge.id)).toEqual(['backend__gjo-se.com']);
    expect(edges[0].data?.originalFrom).toBe('backend.api');
  });

  it('reduziert echte System-IDs mit Punkt im Namen nicht', () => {
    const edges = buildDiagramEdgeModels(
      workspace,
      [pos('backend'), pos('gjo-se.com')],
      'ctx',
      contextDiagram,
    );

    expect(edges[0].source).toBe('backend');
    expect(edges[0].target).toBe('gjo-se.com');
  });
});

describe('buildDiagramNodeModels', () => {
  it('liefert ohne auflösbares Diagramm eine leere Liste', () => {
    const nodes = buildDiagramNodeModels(makeWorkspace(), [pos('api')], 'ghost', () => []);

    expect(nodes).toEqual([]);
  });

  it('projiziert gescopte Container und Stores als Cards', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'backend', type: 'system' }),
        makeObject({
          id: 'api',
          name: 'API',
          type: 'container',
          parent: 'backend',
          technologies: ['python', 'fastapi'],
          tags: ['backend'],
          status: 'viscera-approved',
          external: true,
          d2: 'service',
        }),
        makeObject({ id: 'cache', name: 'Cache', type: 'store', parent: 'backend' }),
        makeObject({ id: 'handler', type: 'component', parent: 'api' }),
      ],
      diagrams: [makeDiagram({ key: 'app', type: 'container', parent: 'backend' })],
    });

    const nodes = buildDiagramNodeModels(
      workspace,
      [pos('backend'), pos('api', 10, 20), pos('cache'), pos('handler')],
      'app',
      () => [],
    );

    expect(nodes.map((node) => node.id)).toEqual(['api', 'cache']);
    expect(nodes[0]).toMatchObject({
      type: 'containerCard',
      position: { x: 10, y: 20 },
      isTransient: false,
      data: {
        name: 'API',
        kind: 'container',
        technology: 'python',
        technologies: ['python', 'fastapi'],
        tags: ['backend'],
        status: 'viscera-approved',
        external: true,
        d2: 'service',
      },
    });
    expect(nodes[1].data.kind).toBe('store');
  });

  it('hängt Child-Diagramme nur bei Treffern an', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'api', type: 'container', parent: 'backend' })],
      diagrams: [makeDiagram({ key: 'app', type: 'container', parent: 'backend' })],
    });
    const child = {
      key: 'api-components',
      name: 'API Components',
      parentId: 'api',
      level: 'component' as const,
      isDefault: true,
    };

    const nodes = buildDiagramNodeModels(workspace, [pos('api')], 'app', () => [child]);

    expect(nodes[0].data.childDiagrams).toEqual([child]);
  });

  it('projiziert Personen als personCard mit Entscheidungen', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'api', type: 'container', parent: 'backend' })],
      people: [makeObject({ id: 'greg', name: 'Greg', type: 'person' })],
      edges: [{ from: 'api', to: 'greg' }],
      diagrams: [makeDiagram({ key: 'app', type: 'container', parent: 'backend' })],
    });

    const nodes = buildDiagramNodeModels(
      workspace,
      [pos('api'), pos('greg')],
      'app',
      () => [],
      () => [ADR],
    );

    const person = nodes.find((node) => node.id === 'greg');
    expect(person?.type).toBe('personCard');
    expect(person?.data).toMatchObject({ name: 'Greg', kind: 'person', decisions: [ADR] });
  });

  it('projiziert Tabellen schlank als sqlTableCard', () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({
          id: 'users',
          name: 'users',
          type: 'table',
          parent: 'core',
          status: 'viscera-approved',
          columns: [{ name: 'id', type: 'uuid', pk: true }],
        }),
        makeObject({ id: 'other', name: 'other', type: 'table', parent: 'gjo_se_com' }),
      ],
      diagrams: [makeDiagram({ key: 'er', type: 'dataModel', parent: null, base: 'core' })],
    });

    const nodes = buildDiagramNodeModels(workspace, [pos('users'), pos('other')], 'er', () => []);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: 'users',
      type: 'sqlTableCard',
      data: {
        name: 'users',
        columns: [{ name: 'id', type: 'uuid', pk: true }],
        status: 'viscera-approved',
      },
    });
    expect(nodes[0].data.kind).toBeUndefined();
  });

  it('rendert Gruppen zuerst, wenn das Level sie gruppiert', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'backend', type: 'system' })],
      groups: [{ id: 'g1', name: 'Core', description: '', members: ['backend'] }],
      diagrams: [makeDiagram({ key: 'ctx', type: 'systemContext', parent: null })],
    });

    const nodes = buildDiagramNodeModels(workspace, [pos('backend', 5, 5)], 'ctx', () => []);

    expect(nodes.map((node) => node.id)).toEqual(['g1', 'backend']);
    expect(nodes[0]).toMatchObject({
      type: 'group',
      position: { x: 0, y: 0 },
      data: { name: 'Core', members: ['backend'] },
    });
  });

  it('überspringt Positionen ohne passendes Objekt oder Person', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'api', type: 'container', parent: 'backend' })],
      diagrams: [makeDiagram({ key: 'app', type: 'container', parent: 'backend' })],
    });

    const nodes = buildDiagramNodeModels(workspace, [pos('ghost'), pos('api')], 'app', () => []);

    expect(nodes.map((node) => node.id)).toEqual(['api']);
  });
});

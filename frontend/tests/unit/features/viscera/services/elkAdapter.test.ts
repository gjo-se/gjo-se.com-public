/**
 * Tests: elkAdapter
 *
 * Behaviour: ELK output is projected into snapped React Flow positions
 * (including nested group children and missing dimensions), the flat-graph
 * builder honours its strategy guard and picks table dimensions, and the
 * system-context builder only lays out systems/people/groups.
 */

import { describe, expect, it } from 'vitest';

import { buildFlatGraph, buildSystemContextGraph, extractElkPositions } from '@src/features/viscera/services/elkAdapter';
import { getDiagramLevel } from '@src/features/viscera/core/levelRegistry';
import { CARD, TABLE, tableNodeHeight } from '@src/features/viscera/core/nodeDimensions';

import { makeDiagram, makeObject, makeWorkspace } from '../helpers';

import type { ElkNode } from 'elkjs';

describe('extractElkPositions', () => {
  it('returns an empty map without children', () => {
    expect(extractElkPositions({ id: 'root' } as ElkNode).size).toBe(0);
  });

  it('snaps positions to the grid and keeps width/height', () => {
    const graph = {
      id: 'root',
      children: [{ id: 'a', x: 13, y: 29, width: 200, height: 100 }],
    } as ElkNode;

    expect(extractElkPositions(graph).get('a')).toEqual({
      x: 20,
      y: 20,
      width: 200,
      height: 100,
    });
  });

  it('defaults missing coordinates/dimensions to zero', () => {
    const graph = { id: 'root', children: [{ id: 'a' }] } as ElkNode;

    expect(extractElkPositions(graph).get('a')).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('recurses into nested group children', () => {
    const graph = {
      id: 'root',
      children: [
        {
          id: 'group',
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          children: [{ id: 'member', x: 21, y: 41, width: 200, height: 100 }],
        },
      ],
    } as ElkNode;

    const positions = extractElkPositions(graph);

    expect(positions.get('group')?.width).toBe(400);
    expect(positions.get('member')).toEqual({ x: 20, y: 40, width: 200, height: 100 });
  });
});

describe('buildFlatGraph', () => {
  it('returns an empty map when the level is not flat', async () => {
    const positions = await buildFlatGraph(
      makeWorkspace(),
      makeDiagram({ type: 'systemContext' }),
      getDiagramLevel('systemContext'),
    );

    expect(positions.size).toBe(0);
  });

  it('lays out exactly the ids persisted in the diagram nodes map', async () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'api', type: 'container', parent: 'sys' }),
        makeObject({ id: 'db', type: 'container', parent: 'sys' }),
        makeObject({ id: 'not-in-diagram', type: 'container', parent: 'sys' }),
      ],
      edges: [{ from: 'api', to: 'db' }],
    });
    const diagram = makeDiagram({
      type: 'container',
      parent: 'sys',
      nodes: { api: { x: 0, y: 0 }, db: { x: 0, y: 0 } },
    });

    const positions = await buildFlatGraph(workspace, diagram, getDiagramLevel('container'));

    expect(new Set(positions.keys())).toEqual(new Set(['api', 'db']));
    positions.forEach((pos) => {
      expect(pos.x % 20).toBe(0);
      expect(pos.y % 20).toBe(0);
      expect(pos.width).toBe(CARD.width);
      expect(pos.height).toBe(CARD.height);
    });
  });

  it('uses table card dimensions for ER tables', async () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({
          id: 'core.users',
          type: 'table',
          parent: 'core',
          columns: [{ name: 'id' }, { name: 'email' }],
        }),
      ],
    });
    const diagram = makeDiagram({
      type: 'dataModel',
      base: 'core',
      nodes: { 'core.users': { x: 0, y: 0 } },
    });

    const positions = await buildFlatGraph(workspace, diagram, getDiagramLevel('dataModel'));

    expect(positions.get('core.users')).toMatchObject({
      width: TABLE.width,
      height: tableNodeHeight(2),
    });
  });
});

describe('buildSystemContextGraph', () => {
  it('lays out systems, people and grouped members but never containers', async () => {
    const workspace = makeWorkspace({
      objects: [
        makeObject({ id: 'sys-free', type: 'system' }),
        makeObject({ id: 'sys-grouped', type: 'system' }),
        makeObject({ id: 'container', type: 'container', parent: 'sys-free' }),
      ],
      people: [makeObject({ id: 'person', type: 'person' })],
      groups: [{ id: 'grp', name: 'Group', description: '', members: ['sys-grouped'] }],
    });

    const positions = await buildSystemContextGraph(workspace);

    expect(new Set(positions.keys())).toEqual(
      new Set(['sys-free', 'sys-grouped', 'person', 'grp']),
    );
    expect(positions.get('sys-free')?.width).toBe(CARD.width);
  });
});

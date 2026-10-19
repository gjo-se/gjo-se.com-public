/**
 * Tests: moduleModels
 *
 * Verifies the L4 module projection: straight import edges (self/dedupe/
 * visibility) and the module/group node builders including fileName derivation
 * and persisted description overrides.
 */

import { describe, expect, it } from 'vitest';

import { buildModuleEdgeModels, buildModuleNodeModels } from '@src/features/viscera/viewer/utils/moduleModels';

import { makeDiagram, makeWorkspace } from '../../helpers';

import type { ImportModule } from '@src/features/viscera/core/modulesSchema';
import type { NodePosition } from '@src/features/viscera/services/elkLayoutService';

function makeModule(name: string, imports: string[] = [], path = `app/${name}.py`): ImportModule {
  return { name, path, imports, top_level: 'app' };
}

function pos(id: string, x = 0, y = 0): NodePosition {
  return { id, position: { x, y }, width: 140, height: 36 };
}

describe('buildModuleEdgeModels', () => {
  const modules = [
    makeModule('a', ['b', 'b', 'a']),
    makeModule('b', ['c']),
  ];

  it('liefert ohne Module keine Kanten', () => {
    expect(buildModuleEdgeModels([], [pos('a')])).toEqual([]);
  });

  it('überspringt Self-Imports und unsichtbare Endpunkte', () => {
    const edges = buildModuleEdgeModels(modules, [pos('a'), pos('b')]);

    expect(edges.map((edge) => edge.id)).toEqual(['a__b']);
  });

  it('dedupliziert doppelte Import-Einträge', () => {
    const edges = buildModuleEdgeModels(modules, [pos('a'), pos('b')]);

    expect(edges).toHaveLength(1);
  });

  it('baut gerade Kanten ohne Zusatzdaten', () => {
    const edges = buildModuleEdgeModels(modules, [pos('a'), pos('b')]);

    expect(edges[0]).toEqual({
      id: 'a__b',
      source: 'a',
      target: 'b',
      type: 'straight',
      data: {},
    });
  });
});

describe('buildModuleNodeModels', () => {
  const modules = [makeModule('app.core.llm', ['app.core']), makeModule('app.core')];

  it('projiziert sichtbare Module als file-Nodes mit Dateinamen', () => {
    const workspace = makeWorkspace();

    const nodes = buildModuleNodeModels(workspace, modules, [pos('app.core', 10, 20)], makeDiagram());

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: 'app.core',
      type: 'file',
      position: { x: 10, y: 20 },
      data: { name: 'app.core', fileName: 'core', path: 'app/app.core.py' },
    });
  });

  it('übernimmt die persistierte Beschreibung aus dem Diagramm', () => {
    const diagram = makeDiagram({ nodes: { 'app.core': { x: 0, y: 0, description: 'Core package' } } });

    const nodes = buildModuleNodeModels(makeWorkspace(), modules, [pos('app.core')], diagram);

    expect(nodes[0].data.description).toBe('Core package');
  });

  it('lässt die Beschreibung ohne Diagramm undefined', () => {
    const nodes = buildModuleNodeModels(makeWorkspace(), modules, [pos('app.core')], undefined);

    expect(nodes[0].data.description).toBeUndefined();
  });

  it('rendert nur Gruppen mit Modul-Mitgliedern', () => {
    const workspace = makeWorkspace({
      groups: [
        { id: 'g1', name: 'Core', description: '', members: ['app.core', 'ghost'] },
        { id: 'g2', name: 'Other', description: '', members: ['ghost'] },
      ],
    });

    const nodes = buildModuleNodeModels(workspace, modules, [pos('app.core'), pos('g1', 1, 2)], makeDiagram());

    expect(nodes.map((node) => node.id)).toEqual(['g1', 'app.core']);
    expect(nodes[0]).toMatchObject({
      type: 'group',
      position: { x: 1, y: 2 },
      data: { name: 'Core', members: ['app.core', 'ghost'] },
    });
  });

  it('nutzt für Gruppen ohne Position den Ursprung', () => {
    const workspace = makeWorkspace({
      groups: [{ id: 'g1', name: 'Core', description: '', members: ['app.core'] }],
    });

    const nodes = buildModuleNodeModels(workspace, modules, [pos('app.core')], makeDiagram());

    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it('überspringt Positionen ohne zugehöriges Modul', () => {
    const nodes = buildModuleNodeModels(makeWorkspace(), modules, [pos('ghost')], makeDiagram());

    expect(nodes).toEqual([]);
  });
});

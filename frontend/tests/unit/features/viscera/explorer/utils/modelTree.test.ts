/**
 * Tests: modelTree
 *
 * Verifies the flattened tree projection used by the model explorer: root
 * detection, type-then-name ordering, depth tracking, expansion/collapse, and
 * the drop of objects whose parent is not part of the input.
 */

import { describe, expect, it } from 'vitest';

import { buildVisibleTree } from '@src/features/viscera/explorer/utils/modelTree';

import type {
  ModelObject,
  ModelObjectType,
} from '@src/features/viscera/explorer/hooks/useModelExplorer';

function makeModelObject(id: string, type: ModelObjectType, parentId?: string, name = id): ModelObject {
  return {
    id,
    name,
    type,
    parentId,
    childrenCount: 0,
    edgesCount: 0,
    diagramsCount: 0,
  };
}

describe('buildVisibleTree', () => {
  it('liefert ohne Objekte eine leere Liste', () => {
    expect(buildVisibleTree([], new Set())).toEqual([]);
  });

  it('listet Wurzeln mit Tiefe null', () => {
    const tree = buildVisibleTree([makeModelObject('backend', 'system')], new Set());

    expect(tree).toHaveLength(1);
    expect(tree[0].object.id).toBe('backend');
    expect(tree[0].depth).toBe(0);
  });

  it('sortiert nach Typ-Reihenfolge vor Name', () => {
    const objects = [
      makeModelObject('zulu', 'system', undefined, 'Zulu'),
      makeModelObject('alpha', 'container', undefined, 'Alpha'),
      makeModelObject('mike', 'system', undefined, 'Mike'),
    ];

    const tree = buildVisibleTree(objects, new Set());

    expect(tree.map((node) => node.object.id)).toEqual(['mike', 'zulu', 'alpha']);
  });

  it('markiert Eltern als hasChildren und Blätter nicht', () => {
    const objects = [
      makeModelObject('backend', 'system'),
      makeModelObject('api', 'container', 'backend'),
    ];

    const tree = buildVisibleTree(objects, new Set(['backend']));

    expect(tree.map((node) => [node.object.id, node.hasChildren])).toEqual([
      ['backend', true],
      ['api', false],
    ]);
  });

  it('blendet Kinder eines nicht expandierten Elternknotens aus', () => {
    const objects = [
      makeModelObject('backend', 'system'),
      makeModelObject('api', 'container', 'backend'),
    ];

    const tree = buildVisibleTree(objects, new Set());

    expect(tree.map((node) => node.object.id)).toEqual(['backend']);
  });

  it('zeigt Kinder eines expandierten Elternknotens eine Ebene tiefer', () => {
    const objects = [
      makeModelObject('backend', 'system'),
      makeModelObject('api', 'container', 'backend'),
    ];

    const tree = buildVisibleTree(objects, new Set(['backend']));

    expect(tree.map((node) => [node.object.id, node.depth])).toEqual([
      ['backend', 0],
      ['api', 1],
    ]);
  });

  it('löst verschachtelte Expansion bis Tiefe zwei auf', () => {
    const objects = [
      makeModelObject('backend', 'system'),
      makeModelObject('api', 'container', 'backend'),
      makeModelObject('handler', 'component', 'api'),
    ];

    const tree = buildVisibleTree(objects, new Set(['backend', 'api']));

    expect(tree.map((node) => [node.object.id, node.depth])).toEqual([
      ['backend', 0],
      ['api', 1],
      ['handler', 2],
    ]);
  });

  it('verwirft Objekte mit unbekanntem Elternknoten', () => {
    const objects = [makeModelObject('api', 'container', 'ghost')];

    expect(buildVisibleTree(objects, new Set(['ghost']))).toEqual([]);
  });
});

/**
 * Tests: computeModuleFilteredIds
 *
 * Verifies the L4 module interaction filter: focus, transitive reaches,
 * transitive impact, collapse (hide) semantics, cycle safety and the
 * hidden-over-dimmed precedence.
 */

import { describe, expect, it } from 'vitest';

import { computeModuleFilteredIds } from '@src/features/viscera/viewer/utils/computeModuleFilteredIds';

import type { ImportModule } from '@src/features/viscera/core/modulesSchema';

function makeModule(name: string, imports: string[] = []): ImportModule {
  return { name, path: `app/${name}.py`, imports, top_level: 'app' };
}

function sorted(ids: Set<string>): string[] {
  return [...ids].sort();
}

const MODULES = [
  makeModule('a', ['b']),
  makeModule('b', ['c']),
  makeModule('c'),
  makeModule('d'),
];

describe('computeModuleFilteredIds', () => {
  it('liefert ohne Interaktion leere Mengen', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: null,
      focusMode: null,
      collapsedIds: [],
    });

    expect(result.dimmedNodeIds.size).toBe(0);
    expect(result.hiddenNodeIds.size).toBe(0);
  });

  it('zeigt im Focus-Modus nur das fokussierte Modul', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: 'a',
      focusMode: 'focus',
      collapsedIds: [],
    });

    expect(sorted(result.dimmedNodeIds)).toEqual(['b', 'c', 'd']);
  });

  it('zeigt im Reaches-Modus den transitiven Import-Graph', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: 'a',
      focusMode: 'reaches',
      collapsedIds: [],
    });

    expect(sorted(result.dimmedNodeIds)).toEqual(['d']);
  });

  it('zeigt im Impact-Modus den transitiven Importeur-Graph', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: 'c',
      focusMode: 'impact',
      collapsedIds: [],
    });

    expect(sorted(result.dimmedNodeIds)).toEqual(['d']);
  });

  it('terminiert bei zyklischen Importen', () => {
    const cyclic = [makeModule('a', ['b']), makeModule('b', ['a'])];

    const result = computeModuleFilteredIds({
      modules: cyclic,
      focusModuleId: 'a',
      focusMode: 'reaches',
      collapsedIds: [],
    });

    expect(result.dimmedNodeIds.size).toBe(0);
  });

  it('versteckt beim Collapse das Modul und seine transitiven Importe', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: null,
      focusMode: null,
      collapsedIds: ['a'],
    });

    expect(sorted(result.hiddenNodeIds)).toEqual(['a', 'b', 'c']);
    expect(sorted(result.dimmedNodeIds)).toEqual([]);
  });

  it('entfernt versteckte Module aus der Dimmen-Menge', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: 'a',
      focusMode: 'reaches',
      collapsedIds: ['c'],
    });

    expect(sorted(result.hiddenNodeIds)).toEqual(['c']);
    expect(sorted(result.dimmedNodeIds)).toEqual(['d']);
  });

  it('ignoriert unbekannte Collapse-IDs', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: null,
      focusMode: null,
      collapsedIds: ['ghost'],
    });

    expect(result.hiddenNodeIds.size).toBe(0);
    expect(result.dimmedNodeIds.size).toBe(0);
  });

  it('dimmt alle Module, wenn das fokussierte Modul nicht existiert', () => {
    const result = computeModuleFilteredIds({
      modules: MODULES,
      focusModuleId: 'ghost',
      focusMode: 'focus',
      collapsedIds: [],
    });

    expect(sorted(result.dimmedNodeIds)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.hiddenNodeIds.size).toBe(0);
  });
});

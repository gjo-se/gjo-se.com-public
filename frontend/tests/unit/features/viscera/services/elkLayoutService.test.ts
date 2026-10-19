/**
 * Tests: elkLayoutService
 *
 * Behaviour of the public layout entry: dispatch by registry level/strategy,
 * empty result for unknown diagram keys, override application, and echoing
 * `nodesEmpty` as `wasInitial`.
 */

import { describe, expect, it } from 'vitest';

import { computeLayout } from '@src/features/viscera/services/elkLayoutService';

import { makeDiagram, makeObject, makeWorkspace } from '../helpers';

describe('computeLayout', () => {
  it('returns no positions when no diagram matches the view key', async () => {
    const result = await computeLayout({
      workspace: makeWorkspace(),
      viewKey: 'unknown',
      overrides: new Map(),
      nodesEmpty: true,
    });

    expect(result.positions).toEqual([]);
    expect(result.wasInitial).toBe(true);
    expect(typeof result.durationMs).toBe('number');
  });

  it('lays out the system context via the hierarchical-groups strategy', async () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'sys', type: 'system' })],
      people: [makeObject({ id: 'person', type: 'person' })],
      diagrams: [makeDiagram({ key: 'SystemContext', type: 'systemContext' })],
    });

    const result = await computeLayout({
      workspace,
      viewKey: 'SystemContext',
      overrides: new Map(),
      nodesEmpty: false,
    });

    expect(new Set(result.positions.map((pos) => pos.id))).toEqual(new Set(['sys', 'person']));
    expect(result.wasInitial).toBe(false);
  });

  it('applies manual overrides to the computed positions', async () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'sys', type: 'system' })],
      diagrams: [makeDiagram({ key: 'SystemContext', type: 'systemContext' })],
    });

    const result = await computeLayout({
      workspace,
      viewKey: 'SystemContext',
      overrides: new Map([['sys', { x: 123, y: 456 }]]),
      nodesEmpty: false,
    });

    expect(result.positions.find((pos) => pos.id === 'sys')?.position).toEqual({
      x: 123,
      y: 456,
    });
  });

  it('dispatches module diagrams to the module graph', async () => {
    const workspace = makeWorkspace({
      diagrams: [makeDiagram({ key: 'app-modules', type: 'module', parent: 'app' })],
    });

    const result = await computeLayout({
      workspace,
      viewKey: 'app-modules',
      overrides: new Map(),
      nodesEmpty: false,
      modules: [
        { name: 'app.api', path: 'app/api.py', imports: [], top_level: 'app' },
        { name: 'lib.other', path: 'lib/other.py', imports: [], top_level: 'lib' },
      ],
    });

    expect(result.positions.map((pos) => pos.id)).toEqual(['app.api']);
  });

  it('uses an ephemeral derived diagram when no persisted diagram matches', async () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'comp', type: 'component', parent: 'sys' })],
    });
    const derived = makeDiagram({
      key: 'sys-components',
      type: 'component',
      parent: 'sys',
      nodes: { comp: { x: 0, y: 0 } },
    });

    const result = await computeLayout({
      workspace,
      viewKey: 'sys-components',
      overrides: new Map(),
      nodesEmpty: false,
      derivedDiagram: derived,
    });

    expect(result.positions.map((pos) => pos.id)).toEqual(['comp']);
  });
});

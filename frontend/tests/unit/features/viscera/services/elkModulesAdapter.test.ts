/**
 * Tests: elkModulesAdapter
 *
 * Behaviour: the L4 module projection contains one node per module of the
 * diagram's parent (membership from `modules[]`, never from the sparse nodes
 * map), ignores modules of other top-level systems and handles empty input.
 */

import { describe, expect, it } from 'vitest';

import { buildModuleGraph } from '@src/features/viscera/services/elkModulesAdapter';
import { FILE } from '@src/features/viscera/core/nodeDimensions';

import { makeDiagram, makeObject, makeWorkspace } from '../helpers';

import type { ImportModule } from '@src/features/viscera/core/modulesSchema';

function module(name: string, topLevel: string, imports: string[] = []): ImportModule {
  return { name, path: `${name.replaceAll('.', '/')}.py`, imports, top_level: topLevel };
}

describe('buildModuleGraph', () => {
  it('lays out only modules belonging to the diagram parent', async () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'ignored-object', type: 'container', parent: 'app' })],
    });
    const diagram = makeDiagram({ type: 'module', parent: 'app', nodes: {} });
    const modules = [
      module('app.api', 'app', ['app.db']),
      module('app.db', 'app'),
      module('lib.other', 'lib'),
    ];

    const positions = await buildModuleGraph(workspace, diagram, modules);

    expect(new Set(positions.keys())).toEqual(new Set(['app.api', 'app.db']));
    positions.forEach((pos) => {
      expect(pos.width).toBe(FILE.width);
      expect(pos.height).toBe(FILE.height);
    });
  });

  it('ignores imports pointing outside the visible module set (no phantom nodes)', async () => {
    const workspace = makeWorkspace();
    const diagram = makeDiagram({ type: 'module', parent: 'app' });
    const modules = [module('app.api', 'app', ['external.lib', 'app.api'])];

    const positions = await buildModuleGraph(workspace, diagram, modules);

    expect([...positions.keys()]).toEqual(['app.api']);
  });

  it('deduplicates repeated module entries', async () => {
    const workspace = makeWorkspace();
    const diagram = makeDiagram({ type: 'module', parent: 'app' });
    const modules = [module('app.api', 'app'), module('app.api', 'app')];

    const positions = await buildModuleGraph(workspace, diagram, modules);

    expect([...positions.keys()]).toEqual(['app.api']);
  });

  it('returns an empty layout when there are no modules', async () => {
    const diagram = makeDiagram({ type: 'module', parent: 'app' });

    await expect(buildModuleGraph(makeWorkspace(), diagram, [])).resolves.toEqual(new Map());
  });
});

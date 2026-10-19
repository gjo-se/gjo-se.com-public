/**
 * Tests: yamlFileList
 *
 * Verifies the dynamic editor file catalog: the root workspace file is always
 * present, every architecture node contributes a `nodes/{id}.yml` entry, and
 * the node order follows the input order.
 */

import { describe, expect, it } from 'vitest';

import { buildFileList } from '@src/features/viscera/editor/utils/yamlFileList';

import { makeObject } from '../../helpers';

const ROOT_ENTRY = { label: 'workspace.yml', path: '/architecture/workspace.yml' };

describe('buildFileList', () => {
  it('liefert ohne Nodes nur die Root-Datei', () => {
    expect(buildFileList([])).toEqual([ROOT_ENTRY]);
  });

  it('ergänzt je Node eine Datei mit id-basiertem Pfad', () => {
    const files = buildFileList([makeObject({ id: 'backend' }), makeObject({ id: 'api' })]);

    expect(files).toEqual([
      ROOT_ENTRY,
      { label: 'backend.yml', path: '/architecture/nodes/backend.yml' },
      { label: 'api.yml', path: '/architecture/nodes/api.yml' },
    ]);
  });

  it('behält die Reihenfolge der übergebenen Nodes bei', () => {
    const files = buildFileList([
      makeObject({ id: 'zulu' }),
      makeObject({ id: 'alpha' }),
      makeObject({ id: 'mike' }),
    ]);

    expect(files.slice(1).map((file) => file.label)).toEqual(['zulu.yml', 'alpha.yml', 'mike.yml']);
  });

  it('mutiert die übergebene Node-Liste nicht', () => {
    const nodes = [makeObject({ id: 'backend' })];

    buildFileList(nodes);

    expect(nodes).toHaveLength(1);
  });
});

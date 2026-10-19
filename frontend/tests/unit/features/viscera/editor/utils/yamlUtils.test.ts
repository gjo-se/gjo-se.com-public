/**
 * Tests: yamlUtils
 *
 * Verifies the YAML/Zod error formatting helpers, the YAMLException type guard
 * and the file→workspace merge semantics for node files and the root file.
 */

import { describe, expect, it } from 'vitest';

import {
  formatYamlError,
  formatZodError,
  isYAMLError,
  mergeFileIntoWorkspace,
} from '@src/features/viscera/editor/utils/yamlUtils';

import { makeObject, makeWorkspace } from '../../helpers';

import type { ArchitectureObject } from '@src/features/viscera/core/workspaceSchema';

describe('isYAMLError', () => {
  it('erkennt strukturierte YAMLException-Objekte', () => {
    const error = { name: 'YAMLException', reason: 'bad', mark: { line: 0, column: 0 } };

    expect(isYAMLError(error)).toBe(true);
  });

  it('lehnt echte Error-Objekte ab', () => {
    expect(isYAMLError(new Error('boom'))).toBe(false);
  });

  it('lehnt null und primitive Werte ab', () => {
    expect(isYAMLError(null)).toBe(false);
    expect(isYAMLError('YAMLException')).toBe(false);
  });

  it('lehnt Objekte mit falschem Namen ab, auch wenn die Felder passen', () => {
    const error = { name: 'TypeError', reason: 'bad', mark: { line: 0, column: 0 } };

    expect(isYAMLError(error)).toBe(false);
  });

  it('lehnt YAMLException ohne mark-Feld ab', () => {
    expect(isYAMLError({ name: 'YAMLException', reason: 'bad' })).toBe(false);
  });
});

describe('formatYamlError', () => {
  it('meldet Zeile und Spalte eins-basiert', () => {
    const error = { name: 'YAMLException', reason: 'unexpected end', mark: { line: 4, column: 2 } };

    expect(formatYamlError(error)).toBe('YAML Parse Error: Line 5, Col 3: unexpected end');
  });

  it('meldet die erste Zeile für mark 0/0', () => {
    const error = { name: 'YAMLException', reason: 'bad indent', mark: { line: 0, column: 0 } };

    expect(formatYamlError(error)).toBe('YAML Parse Error: Line 1, Col 1: bad indent');
  });

  it('nutzt die message eines echten Error-Objekts', () => {
    expect(formatYamlError(new Error('kaputt'))).toBe('YAML Parse Error: kaputt');
  });

  it('stringifiziert primitive Fehlerwerte', () => {
    expect(formatYamlError(42)).toBe('YAML Parse Error: 42');
  });
});

describe('formatZodError', () => {
  it('meldet Validation Error ohne Issues', () => {
    expect(formatZodError([])).toBe('Validation Error');
  });

  it('nutzt das erste Issue mit Pfad', () => {
    expect(formatZodError([{ message: 'Required', path: ['name'] }])).toBe(
      'Validation Error: Required (name)',
    );
  });

  it('nutzt root als Pfad-Fallback', () => {
    expect(formatZodError([{ message: 'Invalid', path: [] }])).toBe('Validation Error: Invalid (root)');
  });
});

describe('mergeFileIntoWorkspace', () => {
  const base = makeWorkspace({
    id: 'ws-test',
    name: 'Old',
    objects: [makeObject({ id: 'api', name: 'API' }), makeObject({ id: 'db', name: 'DB' })],
  });

  it('ersetzt einen Node per id und behält die übrigen Nodes', () => {
    const merged = mergeFileIntoWorkspace(base, '/architecture/nodes/api.yml', {
      id: 'api',
      name: 'API v2',
    });
    const objects = merged.objects as ArchitectureObject[];

    expect(objects.map((object) => object.id)).toEqual(['db', 'api']);
    expect(objects[1]).toEqual({ id: 'api', name: 'API v2' });
  });

  it('hängt einen unbekannten Node an, ohne bestehende zu verlieren', () => {
    const merged = mergeFileIntoWorkspace(base, '/architecture/nodes/new.yml', {
      id: 'new',
      name: 'New',
    });
    const objects = merged.objects as ArchitectureObject[];

    expect(objects.map((object) => object.id)).toEqual(['api', 'db', 'new']);
  });

  it('mutiert das Basis-Workspace nicht', () => {
    mergeFileIntoWorkspace(base, '/architecture/nodes/api.yml', { id: 'api', name: 'API v2' });

    expect(base.objects.map((object) => object.id)).toEqual(['api', 'db']);
  });

  it('übernimmt Root-Felder und behält die API-geladenen Objekte', () => {
    const merged = mergeFileIntoWorkspace(base, '/architecture/workspace.yml', {
      name: 'New',
      description: 'Desc',
      objects: [],
    });

    expect(merged.name).toBe('New');
    expect(merged.description).toBe('Desc');
    expect((merged.objects as ArchitectureObject[]).map((object) => object.id)).toEqual(['api', 'db']);
  });

  it('behält bei null als Root-Inhalt die Basis-Felder', () => {
    const merged = mergeFileIntoWorkspace(base, '/architecture/workspace.yml', null);

    expect(merged.name).toBe('Old');
  });

  it('ignoriert Dateien außerhalb der Node-/Root-Konventionen', () => {
    const merged = mergeFileIntoWorkspace(base, '/architecture/nodes/api.yaml', { id: 'api' });

    expect(merged).toEqual(base);
  });
});

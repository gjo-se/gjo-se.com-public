/**
 * Tests: yamlDiagnostics
 *
 * Verifies the Zod-issue → CodeMirror-diagnostic mapping: message formatting,
 * root fallback, key-line resolution, indexed list-item resolution and the
 * deterministic fallback (line 1) when no path segment can be located.
 */

import { describe, expect, it } from 'vitest';

import { issuesToDiagnostics } from '@src/features/viscera/editor/utils/yamlDiagnostics';

import type { ZodIssue } from 'zod/v4';

function makeIssue(path: PropertyKey[], message: string): ZodIssue {
  return { code: 'custom', path, message } as ZodIssue;
}

describe('issuesToDiagnostics', () => {
  it('formatiert Meldung und Pfad als Zod-Diagnostic', () => {
    const yaml = ['id: ws-test', 'name: Test'].join('\n');

    const diagnostics = issuesToDiagnostics(yaml, [makeIssue(['name'], 'Required')]);

    expect(diagnostics).toEqual([
      {
        from: 0,
        to: 'name: Test'.length,
        severity: 'error',
        message: 'Zod: Required (name)',
      },
    ]);
  });

  it('nutzt root als Pfad-Fallback bei leerem Pfad', () => {
    const diagnostics = issuesToDiagnostics('id: ws-test', [makeIssue([], 'Invalid')]);

    expect(diagnostics[0].message).toBe('Zod: Invalid (root)');
    expect(diagnostics[0].to).toBe('id: ws-test'.length);
  });

  it('verknüpft verschachtelte Pfade mit Punkt-Notation', () => {
    const diagnostics = issuesToDiagnostics('name: Test', [
      makeIssue(['objects', 'api', 'name'], 'Too short'),
    ]);

    expect(diagnostics[0].message).toBe('Zod: Too short (objects.api.name)');
  });

  it('findet den n-ten Listen-Eintrag eines Block-Schlüssels', () => {
    const yaml = ['objects:', '    - id: a', '    - id: b'].join('\n');

    const diagnostics = issuesToDiagnostics(yaml, [makeIssue(['objects', 1], 'Invalid entry')]);

    expect(diagnostics[0].to).toBe('    - id: b'.length);
  });

  it('fällt bei zu flacher Listen-Einrückung auf die erste Zeile zurück', () => {
    const yaml = ['objects:', '  - id: a', '  - id: b'].join('\n');

    const diagnostics = issuesToDiagnostics(yaml, [makeIssue(['objects', 1], 'Invalid entry')]);

    expect(diagnostics[0].to).toBe('objects:'.length);
  });

  it('fällt auf die erste Zeile zurück, wenn der Schlüssel fehlt', () => {
    const yaml = ['id: ws-test', 'name: Test'].join('\n');

    const diagnostics = issuesToDiagnostics(yaml, [makeIssue(['missing'], 'Required')]);

    expect(diagnostics[0].to).toBe('id: ws-test'.length);
  });

  it('fällt bei leerem Dokument auf Ziel-Länge null zurück', () => {
    const diagnostics = issuesToDiagnostics('', [makeIssue(['id'], 'Required')]);

    expect(diagnostics[0].to).toBe(0);
    expect(diagnostics[0].from).toBe(0);
  });

  it('erzeugt je Issue genau eine Diagnostic in Eingabe-Reihenfolge', () => {
    const diagnostics = issuesToDiagnostics('id: x', [
      makeIssue(['id'], 'First'),
      makeIssue(['name'], 'Second'),
    ]);

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      'Zod: First (id)',
      'Zod: Second (name)',
    ]);
  });
});

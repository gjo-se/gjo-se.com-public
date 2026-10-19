/**
 * yamlDiagnostics – mappt Zod-Validierungs-Issues auf CodeMirror-Diagnostics.
 *
 * Eigene Einheit getrennt vom Linter-Hook (`useYamlValidation`): die
 * Pfad-zu-Zeile-Auflösung und die Diagnostic-Erzeugung sind reine Funktionen.
 */

import { type Diagnostic } from '@codemirror/lint';

import type { ZodIssue } from 'zod/v4';

/**
 * Findet Zeilennummern für Zod-Error-Pfade durch Durchsuchen
 * der YAML-Zeilen nach passenden Schlüsseln.
 */
function findLineForZodPath(
  yamlText: string,
  path: PropertyKey[],
): number {
  const lines = yamlText.split('\n');
  const target = path[path.length - 1];

  if (typeof target === 'number') {
    let index = 0;
    let inTargetBlock = false;

    const blockKey = path
      .slice(0, -1)
      .reverse()
      .find((p) => typeof p === 'string');

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      const indent = lines[i].length - trimmed.length;

      if (blockKey && trimmed.startsWith(`${blockKey}:`)) {
        inTargetBlock = true;
        index = 0;
        continue;
      }

      if (inTargetBlock && trimmed.startsWith('- ') && index === target) {
        return i + 1;
      }

      if (inTargetBlock && trimmed.startsWith('- ')) {
        index += 1;
      }

      if (inTargetBlock && trimmed && indent <= (blockKey ? 2 : 0)) {
        inTargetBlock = false;
      }
    }
    return 1;
  }

  if (typeof target === 'symbol') {
    return 1;
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith(`${target}:`)) {
      return i + 1;
    }
  }

  return 1;
}

/**
 * Maps Zod issues onto CodeMirror diagnostics using the resolved line numbers.
 *
 * @param yamlText - The raw YAML source.
 * @param issues - Zod issues from a failed schema parse.
 * @returns The CodeMirror diagnostics for the editor.
 */
export function issuesToDiagnostics(
  yamlText: string,
  issues: ZodIssue[],
): Diagnostic[] {
  return issues.map((issue: ZodIssue) => {
    const line = findLineForZodPath(yamlText, issue.path);
    return {
      from: 0,
      to: yamlText.split('\n')[line - 1]?.length ?? 0,
      severity: 'error' as const,
      message: `Zod: ${issue.message} (${issue.path.join('.') || 'root'})`,
    };
  });
}

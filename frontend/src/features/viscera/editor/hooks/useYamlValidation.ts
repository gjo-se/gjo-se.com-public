import { type Diagnostic, linter } from '@codemirror/lint';
import * as yaml from 'js-yaml';
import { useCallback, useMemo } from 'react';

import { objectSchema, workspaceSchema } from '../../core/workspaceSchema';
import { issuesToDiagnostics } from '../utils/yamlDiagnostics';
import { isYAMLError } from '../utils/yamlUtils';

import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { ZodType } from 'zod/v4';


const DEBOUNCE_MS = 500;

const NODE_FILE_RE = /\/nodes\/([^/]+)\.yml$/;

interface UseYamlValidationResult {
  lintExtension: Extension;
}

/**
 * Wählt das passende Zod-Schema basierend auf dem Dateipfad.
 *
 * - `/architecture/nodes/*.yml` → `objectSchema` (einzelnes Objekt)
 * - Alle anderen Pfade (inkl. `undefined`) → `workspaceSchema`
 */
function selectSchema(filePath?: string): ZodType {
  return filePath?.match(NODE_FILE_RE)
    ? objectSchema
    : workspaceSchema;
}

/**
 * Hook that creates a CodeMirror `linter` extension with Zod validation.
 *
 * The linter:
 * 1. Tries to parse the YAML content with js-yaml
 * 2. If YAML parse fails, shows the parse error at the reported line
 * 3. If YAML parses, validates against a file-aware Zod schema:
 *    - `/architecture/nodes/*.yml` → `objectSchema`
 *    - All other paths → `workspaceSchema`
 * 4. Maps Zod error paths to YAML line numbers
 * 5. Debounced at 500ms for performance (via linter config.delay)
 *
 * @param filePath - Optional path of the YAML file being edited.
 *   Used to select the correct Zod sub-schema for validation.
 */
export function useYamlValidation(filePath?: string): UseYamlValidationResult {
  const lintSource = useCallback(
    (view: EditorView): Diagnostic[] => {
      const text = view.state.doc.toString();

      if (text.trim() === '') return [];

      // Step 1: YAML Parse
      let parsed: unknown;
      try {
        parsed = yaml.load(text);
      } catch (err) {
        if (isYAMLError(err)) {
          const line = err.mark.line + 1; // js-yaml lines are 0-based
          const lines = text.split('\n');
          const lineText = lines[line - 1] ?? '';
          return [
            {
              from: 0,
              to: lineText.length,
              severity: 'error' as const,
              message: `YAML Parse: ${err.reason}`,
            },
          ];
        }
        const message = err instanceof Error ? err.message : String(err);
        return [
          {
            from: 0,
            to: 0,
            severity: 'error' as const,
            message: `YAML Parse: ${message}`,
          },
        ];
      }

      // Step 2: Zod Schema Validation (file-aware)
      if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
        return [];
      }

      const schema = selectSchema(filePath);
      const result = schema.safeParse(parsed);
      if (!result.success) {
        return issuesToDiagnostics(text, result.error.issues);
      }

      return [];
    },
    [filePath],
  );

  const lintExtension = useMemo(
    () => linter(lintSource, { delay: DEBOUNCE_MS }),
    [lintSource],
  );

  return { lintExtension };
}

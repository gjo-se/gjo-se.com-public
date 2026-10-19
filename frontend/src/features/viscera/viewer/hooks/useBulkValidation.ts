import { z } from 'zod';

import { useWorkspace } from '../../core/useWorkspace';
import { workspaceSchema } from '../../core/workspaceSchema';

import type { Diagram, Workspace } from '../../core/workspaceSchema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BulkValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  /** The field name that failed validation (e.g. "name", "from", "id"). */
  field: string;
  /** The object ID this error pertains to, if identifiable. */
  objectId: string | null;
  /** Human-readable error message. */
  message: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deep-clones a workspace and applies a single field edit.
 * Used for optimistic validation before the API call.
 */
export function applyFieldEdit(
  workspace: Workspace,
  objectId: string,
  field: string,
  value: unknown,
): Workspace {
  const cloned: Workspace = JSON.parse(JSON.stringify(workspace)) as Workspace;

  // Try objects (flat lookup — Finding 1/2)
  if (cloned.objects) {
    const objIdx = cloned.objects.findIndex((o) => o.id === objectId);
    if (objIdx >= 0) {
      (cloned.objects[objIdx] as Record<string, unknown>)[field] = value;
      return cloned;
    }
  }

  // Try people
  if (cloned.people) {
    const personIdx = cloned.people.findIndex((p) => p.id === objectId);
    if (personIdx >= 0) {
      (cloned.people[personIdx] as Record<string, unknown>)[field] = value;
      return cloned;
    }
  }

  return cloned;
}

/**
 * Maps Zod issue paths to structured ValidationError objects.
 *
 * Path examples:
 *   ``["objects", 0, "id"]`` → object at index 0, field "id"
 *   ``["edges", 2, "from"]`` → edge at index 2, field "from"
 */
function extractZodErrors(
  zodError: z.ZodError,
  workspace: Workspace,
): ValidationError[] {
  const diagrams = (workspace.diagrams ?? []) as Diagram[];

  return zodError.issues.map((issue) => {
    const path = issue.path;
    let field = 'unknown';
    let objectId: string | null = null;

    // Last path segment is the field name
    if (path.length >= 1) {
      field = String(path[path.length - 1]);
    }

    // Resolve objectId from the structured path
    if (path.length >= 2) {
      const root = path[0];
      const index = path[1] as number;

      if (root === 'objects' && workspace.objects?.[index]) {
        objectId = workspace.objects[index].id;
      } else if (root === 'people' && workspace.people?.[index]) {
        objectId = workspace.people[index].id;
      } else if (
        root === 'edges' &&
        workspace.edges?.[index]
      ) {
        const edge = workspace.edges[index];
        if (field === 'from') {
          objectId = edge.from;
        } else if (field === 'to') {
          objectId = edge.to;
        }
      } else if (root === 'diagrams' && diagrams[index]) {
        objectId = diagrams[index].key;
      } else if (root === 'flows' && workspace.flows?.[index]) {
        objectId = workspace.flows[index].id;
      }
    }

    return { field, objectId, message: issue.message };
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for full-workspace Zod validation.
 *
 * Provides a ``validate()`` function that runs ``workspaceSchema.safeParse()``
 * against the entire workspace. Used by ``useYamlWrite`` to block saves
 * when schema violations are detected (duplicate IDs, broken edges,
 * missing required fields).
 *
 * @example
 * ```ts
 * const { validate } = useBulkValidation();
 * const result = validate(candidateWorkspace);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function useBulkValidation() {
  const { workspace } = useWorkspace();

  /**
   * Validates a workspace against the full workspaceSchema.
   *
   * @param ws - Optional workspace to validate. Defaults to current workspace from context.
   * @returns Validation result with detailed errors for UI display.
   */
  function validate(ws?: Workspace): BulkValidationResult {
    const target = ws ?? workspace;
    if (!target) {
      return { valid: true, errors: [] };
    }
    const result = workspaceSchema.safeParse(target);
    if (result.success) return { valid: true, errors: [] };
    const errors = extractZodErrors(result.error, target);
    return { valid: false, errors };
  }

  return { validate };
}

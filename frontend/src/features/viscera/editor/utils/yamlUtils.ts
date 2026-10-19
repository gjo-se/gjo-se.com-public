import type { Workspace } from '../../core/workspaceSchema';

/**
 * YAML error type representing a js-yaml YAMLException.
 */
export interface YAMLError {
  name: string;
  reason: string;
  mark: { line: number; column: number };
}

/**
 *
 */
export function formatYamlError(err: unknown): string {
  if (isYAMLError(err)) {
    return `YAML Parse Error: Line ${err.mark.line + 1}, Col ${err.mark.column + 1}: ${err.reason}`;
  }
  return `YAML Parse Error: ${err instanceof Error ? err.message : String(err)}`;
}

/**
 *
 */
export function formatZodError(issues: { message: string; path: PropertyKey[] }[]): string {
  const first = issues[0];
  if (!first) return 'Validation Error';
  const path = first.path.join('.') || 'root';
  return `Validation Error: ${first.message} (${path})`;
}

/**
 * Type guard that narrows `unknown` to a structured YAMLError.
 */
export function isYAMLError(err: unknown): err is YAMLError {
  return (
    typeof err === 'object'
    && err !== null
    && 'name' in err
    && 'reason' in err
    && 'mark' in err
    && (err as Record<string, unknown>).name === 'YAMLException'
  );
}

/**
 * Merge a single edited YAML file into the base workspace.
 *
 * - `/architecture/nodes/{id}.yml` → replaces the matching node by id
 * - `/architecture/workspace.yml`  → replaces root fields (keeps nodes)
 */
export function mergeFileIntoWorkspace(
  base: Workspace,
  filePath: string,
  parsed: unknown,
): Record<string, unknown> {
  const nodeMatch = filePath.match(/\/nodes\/([^/]+)\.yml$/);
  if (nodeMatch) {
    const nodeId = nodeMatch[1];
    const editedNode = parsed as Record<string, unknown>;
    const otherNodes = base.objects.filter((s) => s.id !== nodeId);
    return { ...base, objects: [...otherNodes, editedNode] };
  }

  if (filePath.endsWith('/workspace.yml')) {
    const rootFields = (parsed ?? {}) as Record<string, unknown>;
    // The root file only manages root fields (id, name, description, styles).
    // API-loaded collections (objects, edges, diagrams, groups, flows)
    // live in separate files and must survive the merge — otherwise the live
    // preview would wipe edges and persisted layout from the workspace.
    return { ...base, ...rootFields, objects: base.objects };
  }

  return base;
}

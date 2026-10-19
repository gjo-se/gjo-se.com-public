import * as yaml from 'js-yaml';


import { workspaceSchema } from '../core/workspaceSchema';

import type { Diagram, DiagramSource, Group, Workspace } from '../core/workspaceSchema';
import type { ZodError } from 'zod';

export interface WorkspaceLoadResult {
  workspace: Workspace | null;
  error: string | null;
}

// ── YAML Fetch ─────────────────────────────────────────────────────────────

/**
 * Fetches diagrams from the API.
 *
 * Diagrams are the single diagram source of the workspace
 * (loaded from individual files under architecture/diagrams/).
 */
async function fetchDiagrams(source: DiagramSource = 'code'): Promise<Diagram[]> {
  try {
    const query = withSourceQuery(source);
    const response = await fetch(`/api/v1/admin/viscera/diagrams${query}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (/api/v1/admin/viscera/diagrams)`);
    }
    const diagrams = await response.json() as Diagram[];
    // Normalize: old diagrams without the `source` field default to 'code',
    // keeping the typed Diagram contract consistent for the whole workspace.
    return diagrams.map((diagram) => ({ ...diagram, source: diagram.source ?? 'code' }));
  } catch {
    return [];
  }
}

/**
 * Fetches edges from the API.
 *
 * Loads all edges from ``GET /api/v1/admin/viscera/edges``
 * (file-per-edge pattern, introduced in #2171).
 */
async function fetchEdges(source: DiagramSource = 'code'): Promise<unknown[]> {
  try {
    const query = withSourceQuery(source);
    const response = await fetch(`/api/v1/admin/viscera/edges${query}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (/api/v1/admin/viscera/edges)`);
    }
    return await response.json() as unknown[];
  } catch {
    return [];
  }
}

/**
 * Fetches groups from the API.
 *
 * Loads all groups from ``GET /api/v1/admin/viscera/groups``
 * (file-per-group pattern, introduced in #2273).
 */
async function fetchGroups(source: DiagramSource = 'code'): Promise<Group[]> {
  try {
    const query = withSourceQuery(source);
    const response = await fetch(`/api/v1/admin/viscera/groups${query}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (/api/v1/admin/viscera/groups)`);
    }
    return await response.json() as Group[];
  } catch {
    return [];
  }
}

/**
 * Fetches a YAML file from the given path and parses it.
 * Used by loadWorkspace() – not intended for direct consumption from components.
 */
async function fetchYaml(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} (${path})`);
  }
  const text = await response.text();
  try {
    return yaml.load(text);
  } catch (parseError) {
    throw new Error(
      `YAML-Parse-Fehler in ${path}: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
  }
}

// ── Workspace Loader ───────────────────────────────────────────────────────

/** Converts a Zod validation error into a human-readable, single-line message. */
function formatZodError(err: ZodError): string {
  const issues = err.issues.slice(0, 5); // cap at 5 to avoid message bloat
  const parts = issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  if (err.issues.length > 5) {
    parts.push(`… und ${err.issues.length - 5} weitere Fehler`);
  }
  return parts.join('; ');
}

/**
 * Loads the workspace by fetching architecture nodes from the API
 * and merging with workspace.yml (edges, styles).
 * People are derived from nodes by filtering ``type: person``.
 *
 * @param source Which diagram source to load (`'code'` default – no source query, identical to current behaviour).
 */
export async function loadWorkspace(source: DiagramSource = 'code'): Promise<WorkspaceLoadResult> {
  try {
    const query = withSourceQuery(source);
    const [objectsResponse, rawWorkspace, diagramData, edgesData, groupsData] = await Promise.all([
      fetch(`/api/v1/admin/viscera/nodes${query}`),
      fetchYaml(`/architecture/workspace.yml${query}`),
      fetchDiagrams(source),
      fetchEdges(source),
      fetchGroups(source),
    ]);

    if (!objectsResponse.ok) {
      throw new Error(
        `HTTP ${objectsResponse.status}: ${objectsResponse.statusText} (/api/v1/admin/viscera/nodes)`,
      );
    }

    const objectsData = await objectsResponse.json() as { objects?: unknown[] };
    const allNodes = objectsData.objects ?? [];
    const people = allNodes.filter(
      (n: unknown) => typeof n === 'object' && n !== null && (n as Record<string, unknown>).type === 'person',
    );

    const merged = {
      ...(rawWorkspace as Record<string, unknown>),
      people,
      objects: allNodes,
      diagrams: diagramData,
      groups: groupsData,
      edges: edgesData,
    };

    const result = workspaceSchema.safeParse(merged);
    if (!result.success) {
      throw new Error(
        `Validierungs-Fehler: ${formatZodError(result.error)}`,
      );
    }
    return { workspace: result.data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { workspace: null, error: msg };
  }
}

/**
 * Pure helper: builds the source query-string fragment for a diagram source.
 * `code` → `''` (no query param, backwards compatible with current behaviour);
 * any other source → `?source=golden`.
 */
function withSourceQuery(source: DiagramSource): string {
  return source === 'code' ? '' : `?source=${source}`;
}

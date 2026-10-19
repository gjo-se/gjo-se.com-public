/**
 * yamlFileList – Datei-Liste für die Editor-Toolbar.
 *
 * Getrennt von den YAML-Fehler-/Merge-Helfern (`yamlUtils`): reine
 * Datei-Katalog-Logik.
 */

import type { ArchitectureObject } from '../../core/workspaceSchema';

const ROOT_FILES: { label: string; path: string }[] = [
  { label: 'workspace.yml', path: '/architecture/workspace.yml' },
];

/**
 * Builds the file list for the editor toolbar dynamically from the API-loaded nodes.
 *
 * The root workspace file (workspace.yml) is always present.
 * Each architecture node contributes a `nodes/{id}.yml` entry.
 */
export function buildFileList(nodes: ArchitectureObject[]): { label: string; path: string }[] {
  const nodeFiles = nodes.map((obj) => ({
    label: `${obj.id}.yml`,
    path: `/architecture/nodes/${obj.id}.yml`,
  }));
  return [...ROOT_FILES, ...nodeFiles];
}

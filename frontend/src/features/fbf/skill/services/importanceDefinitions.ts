/**
 * importance-definitions – Admin CRUD endpoints for FBF importance definitions.
 */

import api from '@src/lib/api/axios';

export interface ImportanceDefinition {
  importance: number
  label: string
  description: string
}

/** Fetches all importance definitions ordered by importance. */
export function fetchImportanceDefinitions() {
  return api.get<ImportanceDefinition[]>('/admin/fbf/importance-definition').then(r => r.data);
}

/** Partially updates an importance definition's label and/or description. */
export function updateImportanceDefinition(importance: number, data: { label?: string; description?: string }) {
  return api.patch<ImportanceDefinition>(`/admin/fbf/importance-definition/${importance}`, data).then(r => r.data);
}

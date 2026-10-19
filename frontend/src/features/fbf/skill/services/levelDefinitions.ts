/**
 * level-definitions – Admin CRUD endpoints for FBF level definitions.
 */

import api from '@src/lib/api/axios';

export interface LevelDefinition {
  level: number
  label: string
  description: string
}

/** Fetches all level definitions ordered by level. */
export function fetchLevelDefinitions() {
  return api.get<LevelDefinition[]>('/admin/fbf/level-definition').then(r => r.data);
}

/** Partially updates a level definition's label and/or description. */
export function updateLevelDefinition(level: number, data: { label?: string; description?: string }) {
  return api.patch<LevelDefinition>(`/admin/fbf/level-definition/${level}`, data).then(r => r.data);
}

import api from '@src/lib/api/axios';
import type { components } from '@src/lib/types.generated';

export type ProjectSkillPublicOut = components['schemas']['ProjectSkillPublicOut'];

/**
 * Fetches the public skills of a project (proof match section).
 * 404 (axios) wenn die Projekt-ID unbekannt ist – wird im Hook als isNotFound geflaggt.
 */
export function fetchProjectSkills(projectId: number) {
  return api.get<ProjectSkillPublicOut[]>(`/public/fbf/projects/${projectId}/skills`).then(r => r.data);
}

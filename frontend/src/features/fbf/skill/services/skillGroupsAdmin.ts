/**
 * skill-groups-admin – Admin CRUD endpoints for curated FBF skill groups.
 *
 * A7: `GET /admin/fbf/skill-group`, `PUT /admin/fbf/skill-group/{id}`
 * and `POST /admin/fbf/skill-group/reorder`.
 */

import api from '@src/lib/api/axios';
import type { components } from '@src/lib/types.generated';

export type SkillGroupAdminOut = components['schemas']['SkillGroupAdminOut'];

export interface SkillGroupAdminUpdate {
  sort?: number
  priority?: SkillGroupPriority
  labels?: Record<string, string>
}

export interface SkillGroupCreatePayload {
  labels: Record<string, string>
  priority?: SkillGroupPriority
}

type SkillGroupPriority = 'high' | 'medium' | 'base';

/** Creates a new skill group appended at the end of the order (Admin). */
export function createSkillGroup(data: SkillGroupCreatePayload) {
  return api.post<SkillGroupAdminOut>('/admin/fbf/skill-group', data).then(r => r.data);
}

/** Deletes a skill group (Admin). Fails 409 when skills are still assigned. */
export function deleteSkillGroup(groupId: number) {
  return api.delete(`/admin/fbf/skill-group/${groupId}`);
}

/** Fetches all skill groups with full DE/EN labels, ordered by sort ASC (Admin). */
export function fetchAdminSkillGroups() {
  return api.get<SkillGroupAdminOut[]>('/admin/fbf/skill-group').then(r => r.data);
}

/** Batch-reorders skill groups from the given ordered ids (Admin). Returns the updated count. */
export function reorderSkillGroups(orderedIds: number[]) {
  return api.post<number>('/admin/fbf/skill-group/reorder', { ordered_ids: orderedIds }).then(r => r.data);
}

/** Partially updates a skill group's sort, priority and/or labels (Admin). */
export function updateSkillGroup(groupId: number, data: SkillGroupAdminUpdate) {
  return api.put<SkillGroupAdminOut>(`/admin/fbf/skill-group/${groupId}`, data).then(r => r.data);
}

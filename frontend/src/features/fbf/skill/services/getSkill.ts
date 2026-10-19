/**
 * get-skill – Fetch a single skill by ID (admin, incl. internal level).
 */

import api from '@src/lib/api/axios';
import type { components } from '@src/lib/types.generated';

export type SkillAdminOut = components['schemas']['SkillAdminOut'];

/** Fetches a single skill by its numeric ID from the admin detail endpoint. */
export async function fetchSkillById(id: number): Promise<SkillAdminOut | undefined> {
  return api.get<SkillAdminOut>(`/admin/fbf/skill/${id}`).then(r => r.data);
}

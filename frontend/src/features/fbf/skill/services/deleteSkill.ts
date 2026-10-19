/**
 * delete-skill – Delete mutation.
 */

import api from '@src/lib/api/axios';

/** Deletes a skill by ID. Plain function for reuse outside React. */
export function deleteSkillById(skillId: number) {
  return api.delete(`/admin/fbf/skill/${skillId}`);
}

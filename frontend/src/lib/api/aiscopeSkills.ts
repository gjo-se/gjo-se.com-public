/**
 * FBF skill endpoints (similar-master suggestions, skill updates).
 */
import { api } from '@src/lib/api/axios';

/** A master skill suggested by vector similarity (group-refined). */
export interface SimilarMasterItem {
  id: number
  name: string
  similarity: number
  best_member_name: string | null
  best_member_similarity: number | null
}

/** Request body for updating a skill via PUT /admin/fbf/skill/{id}. */
export interface SkillUpdatePayload {
  status?: string
  importance?: number
  level?: number
  level_public?: number
  name?: string
}

/** Fetches masters ranked by vector similarity to a reference skill.
 *  Uses group-refined scoring: for masters with slaves, similarity is the
 *  max cosine across the master and all its slaves. */
export async function fetchSimilarMasters(skillId: number): Promise<SimilarMasterItem[]> {
  const res = await api.post<{ items: SimilarMasterItem[] }>('/admin/fbf/dedup/similar-masters', {
    skill_ids: [skillId],
    status: 'confirmed',
  });
  return res.data.items;
}

/** Updates an FBF skill via PUT /admin/fbf/skill/{id}. */
export async function updateSkill(skillId: number, payload: SkillUpdatePayload): Promise<void> {
  await api.put(`/admin/fbf/skill/${skillId}`, payload);
}

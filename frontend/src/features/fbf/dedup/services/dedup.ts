/**
 * dedup – Admin endpoints for the FBF skill dedup board.
 */

import api from '@src/lib/api/axios';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ActionResult {
  updated: number
}

export type BoardColumn = 'masters' | 'slaves' | 'pinned';

export interface BoardItem {
  id: number
  name: string
  description: string | null
  status: string
  canonical_id: number | null
  master_name: string | null
  alias_count: number
  importance: number | null
  level: number | null
  level_public: number | null
}

export interface BoardPage {
  items: BoardItem[]
  total: number
  page: number
  size: number
  checked_masters: number
  total_masters: number
}

export interface BoardParams {
  column: BoardColumn
  page?: number
  size?: number
  q?: string
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  master_id?: number
  has_slaves?: boolean
}

export type BulkAction = 'assign' | 'activate' | 'deprecated' | 'unassign' | 'pending' | 'active' | 'rejected';

/** Board item enriched with cosine similarity to the selection centroid.
 *  Group-refined masters additionally report their best single member. */
export interface SimilarMasterItem extends BoardItem {
  similarity: number
  best_member_name: string | null
  best_member_similarity: number | null
}

export interface SimilarSkillOut {
  id: number
  name: string
  status: string
  similarity: number
}

// ── Functions ──────────────────────────────────────────────────────────────

/** Activate a master and its verified slaves (set status=active). */
export function activateMaster(masterId: number, slaveIds: number[]) {
  return api.post<ActionResult>('/admin/fbf/dedup/activate', {
    master_id: masterId,
    slave_ids: slaveIds,
  }).then(r => r.data);
}

/** Set one or more skills to deprecated (reversible). */
export function archiveSkills(skillIds: number[]) {
  return api.post<ActionResult>('/admin/fbf/dedup/archive', {
    skill_ids: skillIds,
  }).then(r => r.data);
}

/** Assign a slave to a master (set canonical_id). */
export function assignSlave(skillId: number, masterId: number) {
  return api.post<ActionResult>('/admin/fbf/dedup/assign', {
    skill_id: skillId,
    master_id: masterId,
  }).then(r => r.data);
}

/** Bulk mutation: apply one action to a list of skill IDs. */
export function bulkAction(action: BulkAction, skillIds: number[], masterId?: number) {
  return api.post<ActionResult>('/admin/fbf/dedup/bulk', {
    action,
    skill_ids: skillIds,
    ...(masterId !== undefined && { master_id: masterId }),
  }).then(r => r.data);
}

/** Dissolve a master group: unassign all slaves and set everyone to pending. */
export function dissolveGroup(masterId: number) {
  return api.post<ActionResult>('/admin/fbf/dedup/dissolve', {
    master_id: masterId,
  }).then(r => r.data);
}

/** Fetches a paginated board page for masters or slaves. */
export function fetchBoard(params: BoardParams) {
  return api.get<BoardPage>('/admin/fbf/dedup/board', { params }).then(r => r.data);
}

/** Rank masters by similarity to the selection (filters stay additive).
 *  has_slaves: undefined = mixed list (column 2), false = solo neighbors (column 1). */
export function fetchSimilarMasters(
  skillIds: number[],
  q?: string,
  status?: string,
  hasSlaves?: boolean,
) {
  return api.post<{ items: SimilarMasterItem[] }>('/admin/fbf/dedup/similar-masters', {
    skill_ids: skillIds,
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(hasSlaves !== undefined ? { has_slaves: hasSlaves } : {}),
  }).then(r => r.data.items);
}

/** Fetch top-20 master suggestions by vector similarity to a slave. */
export function fetchSuggestions(slaveId: number) {
  return api.get<SimilarSkillOut[]>('/admin/fbf/dedup/suggestions', {
    params: { slave_id: slaveId },
  }).then(r => r.data);
}

/** Remove master assignment (set canonical_id=NULL). */
export function unassignSkills(skillIds: number[]) {
  return api.post<ActionResult>('/admin/fbf/dedup/unassign', {
    skill_ids: skillIds,
  }).then(r => r.data);
}

/** Renames a skill inline, preserving all other fields (incl. canonical_id). */
export function updateSkillName(item: BoardItem, name: string) {
  return api
    .put<BoardItem>(`/admin/fbf/skill/${item.id}`, {
      name,
      importance: item.importance ?? null,
      level: item.level ?? null,
      level_public: item.level_public ?? null,
      status: item.status,
      canonical_id: item.canonical_id,
    })
    .then(r => r.data);
}

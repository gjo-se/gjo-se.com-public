/**
 * curation – Admin curation endpoints for FBF skills.
 *
 * List (with status filter), batch-confirm, reassign project links, reject.
 */

import api from '@src/lib/api/axios';
import type { components } from '@src/lib/types.generated';

export type SkillAdminOut = components['schemas']['SkillAdminOut'] & {
  canonical_id?: number | null
  master_name?: string | null
  /** Average project_skill.importance across all projects (0–5, one decimal). Read-only. */
  avg_project_importance?: number | null
  /** Percentage of total projects referencing this skill (0–100, one decimal). Read-only. */
  project_percentage?: number | null
  /** Core status name resolved via core_statusable (e.g. "pending", "active"). */
  status?: string | null
  /** Core status color_token (e.g. "amber", "green"). */
  status_color_token?: string | null
};

/** Server-side filter params shared by the skill list and count endpoints. */
interface SkillFilterParams {
  q?: string
  status?: string
  tag?: string
  master_filter?: string
  min_importance?: string
  min_level?: string
  min_level_public?: string
  min_avg_project_importance?: string
  group_id?: string
}

/** A single editable score field of a skill. */
export type SkillScoreField = 'importance' | 'level' | 'level_public';

/** The full writable skill field set sent on every PUT (preserve-all-others). */
interface SkillWriteBody {
  name: string
  description: string | null
  importance: number | null
  level: number | null
  level_public: number | null
  status?: string | null
  canonical_id: number | null
  group_id: number | null
}

/** Builds the full PUT body from a skill, applying field overrides last. */
function buildWriteBody(
  skill: SkillAdminOut,
  overrides: Partial<SkillWriteBody>,
): SkillWriteBody {
  return {
    name: skill.name,
    description: skill.description ?? null,
    importance: skill.importance ?? null,
    level: skill.level ?? null,
    level_public: skill.level_public ?? null,
    status: skill.status,
    canonical_id: skill.canonical_id ?? null,
    group_id: skill.group_id ?? null,
    ...overrides,
  };
}

/** Batch-confirms the given pending skills. Returns the count transitioned. */
export function confirmSkills(ids: number[]) {
  return api.post<number>('/admin/fbf/skill/confirm', { ids }).then(r => r.data);
}

/** Creates a new skill (plain function, no navigation). */
export function createSkill(data: { name: string }) {
  return api
    .post<SkillAdminOut>('/admin/fbf/skill', {
      name: data.name,
      description: null,
      importance: null,
      level: null,
      level_public: null,
    })
    .then(r => r.data);
}

/** Fetches a paginated admin skill list (server-side search, filter, sort). */
export function fetchAdminSkills(params: SkillFilterParams & {
  offset?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}) {
  return api.get<SkillAdminOut[]>('/admin/fbf/skill', {
    params: {
      ...toFilterQuery(params),
      offset: params.offset ?? 0,
      limit: params.limit ?? 20,
      sort_by: params.sort_by || undefined,
      sort_order: params.sort_order || undefined,
    },
  }).then(r => r.data);
}

/**
 *
 */
export function fetchAdminSkillsCount(params: SkillFilterParams = {}) {
  return api.get<number>('/admin/fbf/skill/count', {
    params: toFilterQuery(params),
  }).then(r => r.data);
}

/** PUTs the full skill body (preserve-all-others). */
function putSkill(id: number, body: SkillWriteBody) {
  return api.put<SkillAdminOut>(`/admin/fbf/skill/${id}`, body).then(r => r.data);
}

/** Reorders the master skills assigned to a group. Returns the updated count. */
export function reorderSkills(groupId: number, orderedIds: number[]) {
  return api
    .post<number>('/admin/fbf/skill/reorder', { group_id: groupId, ordered_ids: orderedIds })
    .then(r => r.data);
}

/** Maps the shared filter params to the query string (empty values dropped). */
function toFilterQuery(params: SkillFilterParams): Record<string, string | undefined> {
  return {
    q: params.q || undefined,
    status: params.status || undefined,
    tag: params.tag || undefined,
    master_filter: params.master_filter || undefined,
    min_importance: params.min_importance || undefined,
    min_level: params.min_level || undefined,
    min_level_public: params.min_level_public || undefined,
    min_avg_project_importance: params.min_avg_project_importance || undefined,
    group_id: params.group_id || undefined,
  };
}

/** Updates just the description of a skill. */
export function updateSkillDescription(skill: SkillAdminOut, description: string | null) {
  return putSkill(skill.id, buildWriteBody(skill, { description }));
}

/** Persists the skill group, preserving all other fields. */
export function updateSkillGroup(skill: SkillAdminOut, groupId: number | null) {
  return putSkill(skill.id, buildWriteBody(skill, { group_id: groupId }));
}

/** Renames a skill, preserving all other fields (incl. canonical_id). */
export function updateSkillName(skill: SkillAdminOut, name: string) {
  return putSkill(skill.id, buildWriteBody(skill, { name }));
}

/** Persists a single score field of a skill, preserving all other fields. */
export function updateSkillScore(skill: SkillAdminOut, field: SkillScoreField, value: number | null) {
  return putSkill(skill.id, buildWriteBody(skill, { [field]: value }));
}

import api from '@src/lib/api/axios';
import type { components } from '@src/lib/types.generated';

interface PublicSkillListParams {
  group?: string
  limit?: number
  /**
   * Nur Skills mit Gruppe. Die Public-Seiten rendern ausschließlich gruppierte
   * Skills – die ungruppierten Katalog-Skills (`site:public` taggt alles) wären
   * sonst ~89 % reine Payload ohne jede Darstellung.
   */
  grouped_only?: boolean
}

export type SkillGroupOut = components['schemas']['SkillGroupOut'];
interface SkillListParams {
  q?: string
  offset?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export type SkillOut = components['schemas']['SkillOut'];

export type SkillPublicOut = components['schemas']['app__fbf__schemas__skill_schemas__SkillPublicOut'];

/** Returns the total count of admin-managed skills matching an optional search query and status. */
export function fetchAdminSkillCount(params: { q?: string; status?: string } = {}) {
  return api.get<number>('/admin/fbf/skill/count', { params }).then(r => r.data);
}

/** Fetches a paginated, filterable list of skills for the admin panel. */
export function fetchAdminSkillList(params: SkillListParams = {}) {
  return api.get<SkillOut[]>('/admin/fbf/skill', { params }).then(r => r.data);
}

/** Fetches the curated skill groups (id, sort, priority, localized label) for the given locale. */
export function fetchSkillGroups(locale: string) {
  return api.get<SkillGroupOut[]>('/public/fbf/skill-group', { params: { locale } }).then(r => r.data);
}

/** Fetches the public skills (tag site:public), sorted by importance DESC. */
export function fetchSkillList(params: PublicSkillListParams = {}) {
  return api.get<SkillPublicOut[]>('/public/fbf/skill', { params }).then(r => r.data);
}

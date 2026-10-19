/**
 * get-skills – Paginated skill list fetch function.
 */

import type { PaginatedParams } from '@src/lib/api/types';

import { fetchAdminSkillCount, fetchAdminSkillList } from './skills';

interface SkillListParams {
  q?: string
  offset?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/** Fetches paginated skills with total count, compatible with createListQuery. */
export async function fetchSkills(params?: PaginatedParams) {
  const queryParams: SkillListParams = {
    q: params?.q || undefined,
    offset: params?.offset,
    limit: params?.limit,
    sort_by: params?.sort_by || undefined,
    sort_order: params?.sort_order || undefined,
  };
  const [items, total] = await Promise.all([
    fetchAdminSkillList(queryParams),
    fetchAdminSkillCount({ q: params?.q || undefined }),
  ]);
  return { items, total };
}

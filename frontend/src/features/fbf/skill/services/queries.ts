/**
 * skill-queries – Query-Definitionen für die Skill-Entity.
 *
 * Assembliert fetch-Funktionen zu queryOptions-Objekten (TkDodo Pattern).
 */

import { queryOptions } from '@tanstack/react-query';

import { createListQuery } from '@src/lib/api/queries';
import type { PaginatedParams } from '@src/lib/api/types';


import { fetchSkillById } from './getSkill';
import { fetchSkills } from './getSkills';
import { fetchSkillGroups } from './skills';

import type { SkillAdminOut } from './getSkill';
import type { SkillOut } from './skills';

export const skillQueries = {
  list: createListQuery<SkillOut, PaginatedParams | undefined>('skills', fetchSkills),
  groups: (locale: string) =>
    queryOptions({
      queryKey: ['skill-groups', locale],
      queryFn: () => fetchSkillGroups(locale),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: ['skills', id],
      queryFn: (): Promise<SkillAdminOut | undefined> => fetchSkillById(id),
    }),
};

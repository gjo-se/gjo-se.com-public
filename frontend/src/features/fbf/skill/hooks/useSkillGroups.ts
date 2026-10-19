import { useQuery } from '@tanstack/react-query';

import { useLanguage } from '@src/contexts/LanguageContext';

import { skillQueries } from '../services/queries';

import type { SkillGroupOut } from '../services/skills';

/** Fetches the curated skill groups (metadata incl. localized label) for the active locale. */
interface UseSkillGroupsResult {
  groups: SkillGroupOut[]
  loading: boolean
  error: boolean
  refetch: () => Promise<unknown>
}

/** Hook zum Laden der Skill-Gruppen-Metadaten via TanStack Query (lokalisiert per `useLanguage`). */
export function useSkillGroups(): UseSkillGroupsResult {
  const { lang } = useLanguage();
  const { data, isLoading, isError, refetch } = useQuery(skillQueries.groups(lang));

  return {
    groups: data ?? [],
    loading: isLoading,
    error: isError,
    refetch,
  };
}

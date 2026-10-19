import { useQuery } from '@tanstack/react-query';

import { fetchSkillList, type SkillPublicOut } from '../services/skills';

/** Fetches the public list of skills via TanStack Query and exposes raw data without grouping. */
interface UseSkillListResult {
  items: SkillPublicOut[]
  loading: boolean
  error: boolean
  refetch: () => Promise<unknown>
}

/**
 * Hook zum Laden der Skills via TanStack Query – Rohdaten, keine Gruppierung.
 *
 * `grouped_only` ist gesetzt: die Public-Seiten (Skills-Grid, Home-Teaser)
 * zeigen ausschließlich gruppierte Skills. Ohne den Filter kämen ~1038 statt
 * ~109 Items (~400 KB statt ~43 KB) – bei 0 % Darstellungs-Unterschied.
 */
export function useSkillList(): UseSkillListResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['skills', 'grouped'],
    queryFn: () => fetchSkillList({ grouped_only: true }),
  });

  return {
    items: data ?? [],
    loading: isLoading,
    error: isError,
    refetch,
  };
}

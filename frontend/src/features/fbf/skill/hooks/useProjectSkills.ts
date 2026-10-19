import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { fetchProjectSkills } from '../services/proof';

import type { ProjectSkillPublicOut } from '../services/proof';

interface UseProjectSkillsResult {
  skills: ProjectSkillPublicOut[]
  loading: boolean
  error: boolean
  /** true bei axios-Status 404 – die Page rendert dann NotFoundPage. */
  isNotFound: boolean
  refetch: () => Promise<unknown>
}

/** Lädt die Skills einer Ausschreibung (Proof-Endpoint #2604) via TanStack Query. */
export function useProjectSkills(projectId: number): UseProjectSkillsResult {
  const query = useQuery({
    queryKey: ['project-skills', projectId],
    queryFn: () => fetchProjectSkills(projectId),
    enabled: Number.isInteger(projectId) && projectId > 0,
    retry: false, // 404/4xx nicht mehrfach erneut versuchen
  });

  const isNotFound =
    axios.isAxiosError(query.error) && query.error.response?.status === 404;

  return {
    skills: query.data ?? [],
    loading: query.isLoading,
    error: query.isError,
    isNotFound,
    refetch: query.refetch,
  };
}
